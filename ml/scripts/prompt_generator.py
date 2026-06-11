"""Generate natural-language training prompts from workflow structure."""

from __future__ import annotations

from typing import Any

CHANNEL_EN = {
    "email": "email",
    "sms": "SMS",
    "rcs": "RCS",
    "voice": "voice call",
    "voice_sms": "voice SMS",
}

CHANNEL_VI = {
    "email": "email",
    "sms": "SMS",
    "rcs": "RCS",
    "voice": "gọi thoại",
    "voice_sms": "voice SMS",
}

UNIT_EN = {"minute": "minute", "hour": "hour", "day": "day"}
UNIT_EN_PL = {"minute": "minutes", "hour": "hours", "day": "days"}
UNIT_VI = {"minute": "phút", "hour": "giờ", "day": "ngày"}

CATEGORY_EN = {
    "onboarding": "onboarding",
    "abandoned_basket": "abandoned cart",
    "reactivation": "win-back",
    "loyalty": "loyalty",
    "retention": "retention",
    "nurturing": "lead nurture",
    "activation": "activation",
    "qualification": "lead qualification",
}

CATEGORY_VI = {
    "onboarding": "chào mừng",
    "abandoned_basket": "giỏ hàng bỏ quên",
    "reactivation": "kích hoạt lại",
    "loyalty": "khách hàng thân thiết",
    "retention": "giữ chân",
    "nurturing": "nuôi dưỡng lead",
    "activation": "kích hoạt",
    "qualification": "đánh giá lead",
}


def _timing_en(step: dict[str, Any], index: int) -> str:
    ch = CHANNEL_EN.get(step["channel"], step["channel"])
    v, u = step["delay_value"], step["delay_unit"]
    if v == 0 and u == "minute":
        return f"{ch} immediately" if index == 0 else f"{ch} right away"
    unit = UNIT_EN_PL[u] if v != 1 else UNIT_EN[u]
    return f"{ch} after {v} {unit}"


def _timing_vi(step: dict[str, Any], index: int) -> str:
    ch = CHANNEL_VI.get(step["channel"], step["channel"])
    v, u = step["delay_value"], step["delay_unit"]
    if v == 0 and u == "minute":
        return f"{ch} ngay" if index == 0 else f"{ch} lập tức"
    return f"{ch} sau {v} {UNIT_VI[u]}"


def describe_steps_en(steps: list[dict[str, Any]]) -> str:
    return ", ".join(_timing_en(s, i) for i, s in enumerate(steps))


def describe_steps_vi(steps: list[dict[str, Any]]) -> str:
    return ", ".join(_timing_vi(s, i) for i, s in enumerate(steps))


def prompts_from_workflow(workflow: dict[str, Any]) -> list[str]:
    """Auto-generate EN/VI prompts that mirror workflow step timing."""
    steps = workflow["steps"]
    n = len(steps)
    cat = workflow.get("category", "onboarding")
    cat_en = CATEGORY_EN.get(cat, cat.replace("_", " "))
    cat_vi = CATEGORY_VI.get(cat, cat.replace("_", " "))
    en_desc = describe_steps_en(steps)
    vi_desc = describe_steps_vi(steps)
    name = workflow.get("name", "workflow")

    return [
        f"Create a {n}-step {cat_en} workflow: {en_desc}",
        f"Tạo workflow {cat_vi} {n} bước: {vi_desc}",
        f"Design a {cat_en} journey for {name.lower()}: {en_desc}",
        f"Thiết kế hành trình {cat_vi} — {name}: {vi_desc}",
        f"Build {n} timed campaign steps ({cat_en}): {en_desc}",
        f"Xây dựng chiến dịch {cat_vi} {n} bước: {vi_desc}",
    ]


def prompt_for_delay_variant(workflow: dict[str, Any], locale: str) -> str:
    steps = workflow["steps"]
    cat = workflow.get("category", "onboarding")
    if locale == "vi":
        cat_label = CATEGORY_VI.get(cat, cat)
        return f"Workflow {cat_label} {len(steps)} bước: {describe_steps_vi(steps)}"
    cat_label = CATEGORY_EN.get(cat, cat)
    return f"{cat_label.title()} workflow ({len(steps)} steps): {describe_steps_en(steps)}"
