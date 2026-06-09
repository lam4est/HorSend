"""Load fine-tuned LoRA adapters for inference (optional — falls back to rule-based)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_ADAPTER = ROOT / "adapters" / "workflow-lora"
TEMPLATE_ADAPTER = ROOT / "adapters" / "template-lora"

WORKFLOW_ADAPTER_NAME = "workflow"
TEMPLATE_ADAPTER_NAME = "template"

_model = None
_tokenizer = None
_workflow_adapter_loaded = False
_template_adapter_loaded = False

PLACEHOLDER_BODIES = {
    "automated email content.",
    "<p>automated email content.</p>",
    "your message here.",
    "automated message.",
    "<p>automated message.</p>",
    "nội dung email tự động.",
    "<p>nội dung email tự động.</p>",
    "tin nhắn sms.",
}


def adapters_available() -> bool:
    return WORKFLOW_ADAPTER.exists() and any(WORKFLOW_ADAPTER.iterdir())


def template_adapter_available() -> bool:
    return TEMPLATE_ADAPTER.exists() and any(TEMPLATE_ADAPTER.iterdir())


def load_model() -> bool:
    """Load base model + workflow LoRA (+ template LoRA when present)."""
    global _model, _tokenizer, _workflow_adapter_loaded, _template_adapter_loaded
    if _workflow_adapter_loaded:
        return True
    if not adapters_available():
        return False
    try:
        import torch
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        import yaml

        cfg_path = ROOT / "training" / "config.yaml"
        cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
        model_name = cfg["base_model"]

        bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4")
        _tokenizer = AutoTokenizer.from_pretrained(str(WORKFLOW_ADAPTER))
        base = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb,
            device_map="auto",
            torch_dtype=torch.bfloat16,
        )
        _model = PeftModel.from_pretrained(
            base,
            str(WORKFLOW_ADAPTER),
            adapter_name=WORKFLOW_ADAPTER_NAME,
        )
        if template_adapter_available():
            try:
                _model.load_adapter(str(TEMPLATE_ADAPTER), adapter_name=TEMPLATE_ADAPTER_NAME)
                _template_adapter_loaded = True
            except Exception as exc:
                print(f"[model_loader] Could not load template adapter: {exc}")
        _model.set_adapter(WORKFLOW_ADAPTER_NAME)
        _model.eval()
        _workflow_adapter_loaded = True
        return True
    except Exception as exc:
        print(f"[model_loader] Could not load adapters: {exc}")
        return False


def _extract_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


def _generate_json(
    adapter_name: str,
    messages: list[dict[str, str]],
    max_new_tokens: int,
    temperature: float,
) -> dict[str, Any] | None:
    if not load_model():
        return None
    assert _model is not None and _tokenizer is not None

    import torch

    _model.set_adapter(adapter_name)
    text = _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = _tokenizer(text, return_tensors="pt").to(_model.device)
    with torch.no_grad():
        out = _model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=temperature > 0,
            temperature=temperature if temperature > 0 else None,
            top_p=0.9,
            pad_token_id=_tokenizer.eos_token_id,
        )
    decoded = _tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
    return _extract_json(decoded)


def generate_with_model(prompt: str, context: dict, locale: str = "en") -> dict[str, Any] | None:
    channels = ",".join(context.get("channels", []))
    categories = ",".join(context.get("categories", []))
    user_content = f"Channels: {channels}\nCategories: {categories}\n\nPrompt: {prompt}"
    messages = [
        {
            "role": "system",
            "content": (
                "You output only valid JSON for a multi-step marketing workflow. "
                "Include 2-4 timed steps across channels (email, SMS, etc.) with delays. "
                "No markdown, no explanation."
            ),
        },
        {"role": "user", "content": user_content},
    ]
    return _generate_json(WORKFLOW_ADAPTER_NAME, messages, max_new_tokens=1536, temperature=0.35)


def generate_template_with_model(
    intent: str,
    channel: str,
    workflow_name: str = "",
    step_index: int = 0,
    locale: str = "en",
) -> dict[str, Any] | None:
    if not _template_adapter_loaded and not load_model():
        return None
    if not _template_adapter_loaded:
        return None

    user_payload = json.dumps(
        {
            "intent": intent,
            "channel": channel,
            "workflow_name": workflow_name,
            "step_index": step_index,
            "locale": locale,
        },
        ensure_ascii=False,
    )
    messages = [
        {
            "role": "system",
            "content": "You output only valid JSON for email or SMS template content. No markdown wrapper.",
        },
        {"role": "user", "content": f"[TEMPLATE]\n{user_payload}"},
    ]
    return _generate_json(TEMPLATE_ADAPTER_NAME, messages, max_new_tokens=512, temperature=0.55)


def rule_based_workflow(prompt: str, locale: str = "en") -> dict[str, Any]:
    """Mirror backend mockGenerator logic for CPU-only / pre-train inference."""
    p = prompt.lower()
    category = "onboarding"
    if any(k in p for k in ("cart", "basket", "giỏ")):
        category = "abandoned_basket"
    elif any(k in p for k in ("reactivat", "win back", "inactive", "quay lại")):
        category = "reactivation"

    channels: list[str] = []
    if "email" in p or "mail" in p or "thư" in p:
        channels.append("email")
    if "sms" in p or "tin nhắn" in p:
        channels.append("sms")
    if not channels:
        channels = ["email", "sms"] if category == "onboarding" else ["email"]

    vi = locale == "vi"
    names = {
        "onboarding": "Hành trình chào mừng" if vi else "Welcome Journey",
        "abandoned_basket": "Nhắc giỏ hàng" if vi else "Abandoned Cart Recovery",
        "reactivation": "Kích hoạt lại" if vi else "Win-back Campaign",
    }

    steps = []
    for i, ch in enumerate(channels):
        delay = {"delay_value": 0 if i == 0 else i, "delay_unit": "day" if i > 0 else "minute"}
        if ch == "email":
            tpl = {
                "name": f"Email step {i + 1}",
                "subject": "Chào mừng!" if vi else "Welcome!",
                "body": "<p>Cảm ơn bạn.</p>" if vi else "<p>Thank you for joining.</p>",
            }
        else:
            tpl = {
                "name": f"SMS step {i + 1}",
                "subject": "",
                "body": "Chào mừng!" if vi else "Welcome!",
            }
        steps.append({"channel": ch, **delay, "template": tpl})

    return {
        "name": names.get(category, "AI Workflow"),
        "category": category,
        "description": "Rule-based workflow (train adapters to replace this).",
        "contact_list_id": None,
        "steps": steps,
    }


def rule_based_template(
    intent: str,
    channel: str,
    workflow_name: str = "",
    step_index: int = 0,
    locale: str = "en",
) -> dict[str, Any]:
    vi = locale == "vi"
    ch = channel.lower()
    if ch == "email":
        subjects = {
            "welcome": "Chào mừng!" if vi else "Welcome!",
            "cart reminder": "Hoàn tất đơn hàng" if vi else "Complete your order",
            "win back": "Chúng tôi nhớ bạn" if vi else "We miss you",
            "loyalty": "Ưu đãi VIP" if vi else "VIP reward inside",
        }
        subject = subjects.get(intent, "Hello" if not vi else "Xin chào")
        body = (
            "<p>Nội dung email tự động.</p>"
            if vi
            else "<p>Automated email content.</p>"
        )
    else:
        subject = ""
        body = "Tin nhắn SMS." if vi else "SMS message content."
        if len(body) > 160:
            body = body[:157] + "..."

    return {
        "name": f"{intent} {ch}",
        "subject": subject,
        "body": body,
    }


def _intent_from_workflow(workflow: dict[str, Any]) -> str:
    mapping = {
        "onboarding": "welcome",
        "abandoned_basket": "cart reminder",
        "reactivation": "win back",
        "loyalty": "loyalty",
        "retention": "win back",
        "nurturing": "welcome",
        "activation": "welcome",
        "qualification": "welcome",
    }
    return mapping.get(workflow.get("category", ""), "welcome")


def _needs_template_enrichment(tpl: dict[str, Any]) -> bool:
    body = (tpl.get("body") or "").strip().lower()
    if not body:
        return True
    return body in PLACEHOLDER_BODIES or body.startswith("your ") and len(body) < 40


def enrich_templates(workflow: dict[str, Any], locale: str = "en") -> dict[str, Any]:
    """Fill missing or placeholder template copy via template LoRA or heuristics."""
    intent = _intent_from_workflow(workflow)
    workflow_name = workflow.get("name", "")

    for i, step in enumerate(workflow.get("steps", [])):
        tpl = step.get("template") or {}
        ch = step.get("channel", "email")

        if _needs_template_enrichment(tpl):
            generated = generate_template_with_model(
                intent=intent,
                channel=ch,
                workflow_name=workflow_name,
                step_index=i,
                locale=locale,
            )
            if generated and generated.get("body"):
                tpl = {
                    "name": generated.get("name") or tpl.get("name") or f"{ch.upper()} step {i + 1}",
                    "subject": generated.get("subject", tpl.get("subject", "")),
                    "body": generated.get("body", ""),
                }
            elif not tpl.get("body"):
                tpl = rule_based_template(intent, ch, workflow_name, i, locale)

        if ch == "email" and not tpl.get("subject"):
            fallback = rule_based_template(intent, ch, workflow_name, i, locale)
            tpl["subject"] = fallback.get("subject", "")

        step["template"] = tpl
        if ch == "email" and not step.get("email_subject"):
            step["email_subject"] = tpl.get("subject", "")

    return workflow
