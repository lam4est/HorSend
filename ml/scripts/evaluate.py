#!/usr/bin/env python3
"""Evaluate JSON validity of workflow-structure validation set."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAL = ROOT / "dataset" / "workflow-structure.val.jsonl"
VALID_CHANNELS = {"email", "sms", "rcs", "voice", "voice_sms"}
VALID_UNITS = {"minute", "hour", "day"}


def validate_workflow(obj: dict) -> list[str]:
    errors: list[str] = []
    if "name" not in obj or not obj["name"]:
        errors.append("missing name")
    if obj.get("category") is None:
        errors.append("missing category")
    steps = obj.get("steps")
    if not isinstance(steps, list) or not steps:
        errors.append("steps empty")
        return errors
    for i, step in enumerate(steps):
        if step.get("channel") not in VALID_CHANNELS:
            errors.append(f"step {i} bad channel")
        if step.get("delay_unit") not in VALID_UNITS:
            errors.append(f"step {i} bad delay_unit")
        tpl = step.get("template")
        if not isinstance(tpl, dict) or not tpl.get("name"):
            errors.append(f"step {i} bad template")
    return errors


def main() -> None:
    if not VAL.exists():
        print(f"Missing {VAL}. Run build_dataset.py first.")
        return

    total = 0
    parse_ok = 0
    valid_ok = 0
    for line in VAL.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        total += 1
        row = json.loads(line)
        assistant = row["messages"][1]["content"]
        try:
            wf = json.loads(assistant)
            parse_ok += 1
        except json.JSONDecodeError:
            continue
        if not validate_workflow(wf):
            valid_ok += 1

    print(f"Total: {total}")
    print(f"JSON parse OK: {parse_ok}/{total} ({100*parse_ok/max(total,1):.1f}%)")
    print(f"Schema valid: {valid_ok}/{total} ({100*valid_ok/max(total,1):.1f}%)")


if __name__ == "__main__":
    main()
