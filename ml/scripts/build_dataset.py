#!/usr/bin/env python3
"""Build workflow-structure and template-content JSONL datasets from curated + catalog sources."""

from __future__ import annotations

import json
import random
import sys
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from dataset_utils import prompt_key, to_jsonl_line, workflow_user_message
from prompt_generator import prompt_for_delay_variant, prompts_from_workflow
from workflow_catalog import generate_catalog_items, jitter_workflow

ROOT = SCRIPT_DIR.parent
DATASET = ROOT / "dataset"
CURATED_PATH = DATASET / "curated_workflows.json"
FEEDBACK_PATH = DATASET / "feedback_export.jsonl"
SEED_PATH = ROOT.parent / "backend" / "data" / "seed.json"

VALID_CHANNELS = {"email", "sms", "rcs", "voice", "voice_sms"}
VALID_UNITS = {"minute", "hour", "day"}
MIN_STEPS = 2

# Expansion knobs
CATALOG_VARIANTS_PER_ARCHETYPE = 3
JITTER_PROBABILITY = 0.4


def load_feedback_lines() -> list[str]:
    if not FEEDBACK_PATH.exists():
        return []
    return [line.strip() for line in FEEDBACK_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_curated() -> tuple[list[dict], list[dict]]:
    if not CURATED_PATH.exists():
        raise SystemExit(f"Missing curated dataset: {CURATED_PATH}")
    data = json.loads(CURATED_PATH.read_text(encoding="utf-8"))
    return data.get("train", []), data.get("val", [])


def validate_workflow(wf: dict) -> list[str]:
    errors: list[str] = []
    steps = wf.get("steps")
    if not isinstance(steps, list) or len(steps) < MIN_STEPS:
        errors.append(f"need >= {MIN_STEPS} steps, got {len(steps) if isinstance(steps, list) else 0}")
        return errors
    for i, step in enumerate(steps):
        if step.get("channel") not in VALID_CHANNELS:
            errors.append(f"step {i} invalid channel")
        if step.get("delay_unit") not in VALID_UNITS:
            errors.append(f"step {i} invalid delay_unit")
        tpl = step.get("template") or {}
        if not tpl.get("name") or not tpl.get("body"):
            errors.append(f"step {i} missing template content")
    return errors


def collect_prompts(item: dict, wf: dict, include_auto: bool = True) -> list[str]:
    """Merge hand-written and auto-generated prompts for one workflow."""
    prompts: list[str] = list(item.get("prompts", []))
    if include_auto:
        prompts.extend(prompts_from_workflow(wf))
    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for p in prompts:
        key = p.strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


def workflow_to_lines(
    item: dict,
    rng: random.Random,
    include_auto_prompts: bool = True,
    allow_jitter: bool = True,
) -> list[str]:
    wf = item["workflow"]
    errors = validate_workflow(wf)
    if errors:
        name = wf.get("name", "?")
        raise SystemExit(f"Invalid workflow '{name}': {', '.join(errors)}")

    lines: list[str] = []
    for prompt in collect_prompts(item, wf, include_auto=include_auto_prompts):
        lines.append(to_jsonl_line(workflow_user_message(prompt), wf))

        if allow_jitter and rng.random() < JITTER_PROBABILITY:
            variant_wf = jitter_workflow(wf, rng)
            en_prompt = prompt_for_delay_variant(variant_wf, "en")
            vi_prompt = prompt_for_delay_variant(variant_wf, "vi")
            for vp in (en_prompt, vi_prompt):
                lines.append(to_jsonl_line(workflow_user_message(vp), variant_wf))

    return lines


def merge_deduped_lines(primary: list[str], secondary: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []
    for line in primary + secondary:
        row = json.loads(line)
        key = prompt_key(row["messages"][0]["content"])
        if key in seen:
            continue
        seen.add(key)
        merged.append(line)
    return merged


def templates_from_workflows(workflow_lines: list[str]) -> list[str]:
    lines: list[str] = []
    intent_map = {
        "onboarding": "welcome",
        "abandoned_basket": "cart reminder",
        "reactivation": "win back",
        "loyalty": "loyalty",
        "retention": "retention",
        "nurturing": "welcome",
        "activation": "welcome",
        "qualification": "welcome",
    }
    seen_tpl: set[str] = set()

    for line in workflow_lines:
        row = json.loads(line)
        prompt_text = row["messages"][0]["content"].split("Prompt: ", 1)[-1]
        locale = "vi" if any(ord(c) > 127 for c in prompt_text) else "en"
        wf = json.loads(row["messages"][1]["content"])
        intent = intent_map.get(wf.get("category", ""), "welcome")

        for i, step in enumerate(wf.get("steps", [])):
            tpl = step.get("template") or {}
            if not tpl.get("body"):
                continue

            for loc in {locale, "en", "vi"}:
                user = json.dumps(
                    {
                        "intent": intent,
                        "channel": step.get("channel", "email"),
                        "workflow_name": wf.get("name", ""),
                        "step_index": i,
                        "locale": loc,
                    },
                    ensure_ascii=False,
                )
                assistant = json.dumps(
                    {
                        "name": tpl.get("name", f"Step {i + 1}"),
                        "subject": tpl.get("subject", ""),
                        "body": tpl.get("body", ""),
                    },
                    ensure_ascii=False,
                )
                dedupe = user + assistant
                if dedupe in seen_tpl:
                    continue
                seen_tpl.add(dedupe)
                lines.append(
                    json.dumps(
                        {
                            "messages": [
                                {"role": "user", "content": f"[TEMPLATE]\n{user}"},
                                {"role": "assistant", "content": assistant},
                            ]
                        },
                        ensure_ascii=False,
                    )
                )
    return lines


def print_quality_report(label: str, lines: list[str]) -> None:
    step_counts: Counter[int] = Counter()
    categories: Counter[str] = Counter()
    channels: Counter[str] = Counter()

    for line in lines:
        wf = json.loads(json.loads(line)["messages"][1]["content"])
        step_counts[len(wf.get("steps", []))] += 1
        categories[wf.get("category", "?")] += 1
        for step in wf.get("steps", []):
            channels[step.get("channel", "?")] += 1

    avg_steps = sum(k * v for k, v in step_counts.items()) / max(len(lines), 1)
    print(f"\n{label} quality report ({len(lines)} samples):")
    print(f"  avg steps: {avg_steps:.2f}")
    print(f"  step distribution: {dict(sorted(step_counts.items()))}")
    print(f"  categories: {dict(sorted(categories.items()))}")
    print(f"  channels: {dict(sorted(channels.items()))}")


def build_workflow_dataset(rng: random.Random) -> tuple[list[str], list[str]]:
    curated_train, curated_val = load_curated()
    catalog_items = generate_catalog_items(variants_per_archetype=CATALOG_VARIANTS_PER_ARCHETYPE)

    train_lines: list[str] = []

    for item in curated_train:
        train_lines.extend(
            workflow_to_lines(item, rng, include_auto_prompts=True, allow_jitter=True)
        )

    catalog_count_before = len(train_lines)
    for item in catalog_items:
        train_lines.extend(
            workflow_to_lines(item, rng, include_auto_prompts=True, allow_jitter=True)
        )
    print(
        f"Catalog expansion: {len(catalog_items)} workflows → "
        f"{len(train_lines) - catalog_count_before} samples"
    )

    val_lines: list[str] = []
    for item in curated_val:
        val_lines.extend(
            workflow_to_lines(item, rng, include_auto_prompts=True, allow_jitter=False)
        )

    feedback = load_feedback_lines()
    if feedback:
        before = len(train_lines)
        train_lines = merge_deduped_lines(feedback, train_lines)
        print(f"Merged {len(feedback)} feedback samples ({len(train_lines) - before} net new)")
    else:
        train_lines = merge_deduped_lines([], train_lines)

    val_lines = merge_deduped_lines([], val_lines)

    DATASET.mkdir(parents=True, exist_ok=True)
    (DATASET / "workflow-structure.train.jsonl").write_text(
        "\n".join(train_lines) + ("\n" if train_lines else ""),
        encoding="utf-8",
    )
    (DATASET / "workflow-structure.val.jsonl").write_text(
        "\n".join(val_lines) + ("\n" if val_lines else ""),
        encoding="utf-8",
    )

    print(f"workflow-structure: {len(train_lines)} train, {len(val_lines)} val")
    print_quality_report("train", train_lines)
    print_quality_report("val", val_lines)
    return train_lines, val_lines


def build_template_dataset(train_lines: list[str], val_lines: list[str]) -> None:
    lines = templates_from_workflows(train_lines + val_lines)
    print(f"template-content from workflows: {len(lines)} samples")

    random.shuffle(lines)
    val_ratio = 0.15
    split = max(1, int(len(lines) * (1 - val_ratio)))
    train, val = lines[:split], lines[split:]

    (DATASET / "template-content.train.jsonl").write_text(
        "\n".join(train) + ("\n" if train else ""),
        encoding="utf-8",
    )
    (DATASET / "template-content.val.jsonl").write_text(
        "\n".join(val) + ("\n" if val else ""),
        encoding="utf-8",
    )
    print(f"template-content: {len(train)} train, {len(val)} val")


def main() -> None:
    rng = random.Random(42)
    if SEED_PATH.exists():
        print(f"Seed file found: {SEED_PATH}")
    if FEEDBACK_PATH.exists():
        print(f"Feedback file: {FEEDBACK_PATH}")

    train_lines, val_lines = build_workflow_dataset(rng)
    build_template_dataset(train_lines, val_lines)
    print("Done.")


if __name__ == "__main__":
    main()
