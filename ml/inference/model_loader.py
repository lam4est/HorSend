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

_model = None
_tokenizer = None
_workflow_adapter_loaded = False


def adapters_available() -> bool:
    return WORKFLOW_ADAPTER.exists() and any(WORKFLOW_ADAPTER.iterdir())


def load_model() -> bool:
    """Load base model + workflow LoRA. Returns True if loaded."""
    global _model, _tokenizer, _workflow_adapter_loaded
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
        _model = PeftModel.from_pretrained(base, str(WORKFLOW_ADAPTER))
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


def generate_with_model(prompt: str, context: dict, locale: str = "en") -> dict[str, Any] | None:
    if not load_model():
        return None
    assert _model is not None and _tokenizer is not None

    import torch

    channels = ",".join(context.get("channels", []))
    categories = ",".join(context.get("categories", []))
    user_content = f"Channels: {channels}\nCategories: {categories}\n\nPrompt: {prompt}"
    messages = [
        {
            "role": "system",
            "content": "You output only valid JSON for a marketing workflow. No markdown, no explanation.",
        },
        {"role": "user", "content": user_content},
    ]
    text = _tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    inputs = _tokenizer(text, return_tensors="pt").to(_model.device)
    with torch.no_grad():
        out = _model.generate(
            **inputs,
            max_new_tokens=1024,
            do_sample=True,
            temperature=0.7,
            pad_token_id=_tokenizer.eos_token_id,
        )
    decoded = _tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
    return _extract_json(decoded)


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


def enrich_templates(workflow: dict[str, Any], locale: str = "en") -> dict[str, Any]:
    """Ensure each step has template content (model or heuristic)."""
    for i, step in enumerate(workflow.get("steps", [])):
        tpl = step.get("template") or {}
        ch = step.get("channel", "email")
        if not tpl.get("body"):
            if ch == "email":
                tpl = {
                    "name": tpl.get("name") or f"Email {i + 1}",
                    "subject": tpl.get("subject") or ("Xin chào" if locale == "vi" else "Hello"),
                    "body": "<p>Automated email content.</p>",
                }
            else:
                tpl = {
                    "name": tpl.get("name") or f"SMS {i + 1}",
                    "subject": "",
                    "body": "Your message here.",
                }
            step["template"] = tpl
        if ch == "email" and not step.get("email_subject"):
            step["email_subject"] = tpl.get("subject", "")
    return workflow
