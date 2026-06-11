"""Expand workflow steps when model output is shorter than the prompt implies."""

from __future__ import annotations

import re
from typing import Any

UNIT_MAP = {
    "hour": "hour",
    "hours": "hour",
    "giờ": "hour",
    "day": "day",
    "days": "day",
    "ngày": "day",
    "minute": "minute",
    "minutes": "minute",
    "phút": "minute",
}

CATEGORY_DEFAULTS: dict[str, list[dict[str, Any]]] = {
    "onboarding": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "sms", "delay_value": 1, "delay_unit": "day"},
    ],
    "abandoned_basket": [
        {"channel": "email", "delay_value": 1, "delay_unit": "hour"},
        {"channel": "sms", "delay_value": 1, "delay_unit": "day"},
    ],
    "reactivation": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "sms", "delay_value": 7, "delay_unit": "day"},
    ],
    "loyalty": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "email", "delay_value": 3, "delay_unit": "day"},
    ],
    "retention": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "sms", "delay_value": 2, "delay_unit": "day"},
    ],
    "nurturing": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "email", "delay_value": 2, "delay_unit": "day"},
    ],
    "activation": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "sms", "delay_value": 1, "delay_unit": "day"},
    ],
    "qualification": [
        {"channel": "email", "delay_value": 0, "delay_unit": "minute"},
        {"channel": "email", "delay_value": 1, "delay_unit": "day"},
    ],
}

JOURNEY_KEYWORDS = re.compile(
    r"journey|campaign|workflow|series|reminder|recovery|win.?back|hành trình|chuỗi|chiến dịch",
    re.I,
)


def _normalize_unit(raw: str) -> str:
    return UNIT_MAP.get(raw.lower(), "day")


def _detect_channel(text: str) -> str | None:
    t = text.lower()
    if re.search(r"\b(email|mail|thư)\b", t):
        return "email"
    if re.search(r"\b(sms|text message|tin nhắn)\b", t):
        return "sms"
    if re.search(r"\brcs\b", t):
        return "rcs"
    if re.search(r"\b(voice|call|gọi)\b", t):
        return "voice"
    return None


def parse_step_count(prompt: str) -> int | None:
    p = prompt.lower()
    m = re.search(r"(\d+)[\s-]*(?:step|steps|bước)", p)
    if m:
        return max(2, min(8, int(m.group(1))))
    return None


def parse_explicit_steps(prompt: str) -> list[dict[str, Any]]:
    """Parse comma/then-separated channel + delay clauses from the prompt."""
    parts = re.split(r"[,;]|\bthen\b|sau đó|tiếp theo|rồi", prompt, flags=re.I)
    steps: list[dict[str, Any]] = []

    for part in parts:
        channel = _detect_channel(part)
        if not channel:
            continue

        delay_value, delay_unit = 0, "minute"
        if re.search(r"immediately|right away|ngay|lập tức", part, re.I):
            delay_value, delay_unit = 0, "minute"
        else:
            m = re.search(
                r"(?:after|sau)\s+(\d+)\s*(hour|hours|day|days|minute|minutes|giờ|ngày|phút)",
                part,
                re.I,
            )
            if m:
                delay_value = int(m.group(1))
                delay_unit = _normalize_unit(m.group(2))
            else:
                m2 = re.search(
                    r"(\d+)\s*(hour|hours|day|days|minute|minutes|giờ|ngày|phút)",
                    part,
                    re.I,
                )
                if m2:
                    delay_value = int(m2.group(1))
                    delay_unit = _normalize_unit(m2.group(2))

        steps.append({"channel": channel, "delay_value": delay_value, "delay_unit": delay_unit})

    return steps


def build_target_steps(prompt: str, category: str) -> list[dict[str, Any]] | None:
    explicit = parse_explicit_steps(prompt)
    if len(explicit) >= 2:
        return explicit

    requested = parse_step_count(prompt)
    if requested:
        channels: list[str] = []
        for part in re.split(r"[,;]|\band\b|và", prompt, flags=re.I):
            ch = _detect_channel(part)
            if ch and ch not in channels:
                channels.append(ch)
        if not channels:
            channels = ["email", "sms"]

        steps: list[dict[str, Any]] = []
        for i in range(requested):
            steps.append(
                {
                    "channel": channels[i % len(channels)],
                    "delay_value": 0 if i == 0 else i,
                    "delay_unit": "minute" if i == 0 else "day",
                }
            )
        return steps

    if JOURNEY_KEYWORDS.search(prompt):
        defaults = CATEGORY_DEFAULTS.get(category)
        if defaults:
            return [dict(s) for s in defaults]

    defaults = CATEGORY_DEFAULTS.get(category)
    if defaults and len(explicit) == 1:
        # Prompt mentions one channel but implies a journey — add category default follow-up
        first = explicit[0]
        follow = defaults[1] if len(defaults) > 1 else {"channel": "sms", "delay_value": 1, "delay_unit": "day"}
        if first["channel"] == follow["channel"]:
            follow = {"channel": "sms" if first["channel"] == "email" else "email", "delay_value": 1, "delay_unit": "day"}
        return [first, follow]

    return None


def _make_template(
    channel: str,
    category: str,
    step_index: int,
    locale: str,
    existing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if existing and existing.get("body"):
        return {
            "name": existing.get("name") or f"Step {step_index + 1}",
            "subject": existing.get("subject", ""),
            "body": existing.get("body", ""),
        }

    vi = locale == "vi"
    if channel == "email":
        subjects = {
            "onboarding": ["Welcome aboard!", "Get started with us"] if not vi else ["Chào mừng!", "Bắt đầu ngay"],
            "abandoned_basket": ["You left something behind", "Complete your order"]
            if not vi
            else ["Giỏ hàng đang chờ", "Hoàn tất đơn hàng"],
            "reactivation": ["We miss you!", "Come back for an offer"]
            if not vi
            else ["Chúng tôi nhớ bạn!", "Quay lại nhận ưu đãi"],
        }
        pool = subjects.get(category, subjects["onboarding"])
        return {
            "name": f"Email step {step_index + 1}" if not vi else f"Email bước {step_index + 1}",
            "subject": pool[step_index % len(pool)],
            "body": "<p>Thanks for being with us.</p>" if not vi else "<p>Cảm ơn bạn đã đồng hành.</p>",
        }

    return {
        "name": f"SMS step {step_index + 1}" if not vi else f"SMS bước {step_index + 1}",
        "subject": "",
        "body": "Your update is ready." if not vi else "Cập nhật dành cho bạn.",
    }


def expand_workflow(workflow: dict[str, Any], prompt: str, locale: str = "en") -> dict[str, Any]:
    """Ensure workflow has enough steps based on prompt intent and category defaults."""
    steps = workflow.get("steps") or []
    if not isinstance(steps, list):
        steps = []

    category = workflow.get("category") or "onboarding"
    target = build_target_steps(prompt, category)

    if not target:
        if len(steps) >= 2:
            return workflow
        target = CATEGORY_DEFAULTS.get(category)
        if not target or len(steps) >= len(target):
            return workflow

    if len(steps) >= len(target):
        return workflow

    expanded: list[dict[str, Any]] = []
    for i, spec in enumerate(target):
        if i < len(steps):
            step = dict(steps[i])
            step["channel"] = spec["channel"]
            step["delay_value"] = spec["delay_value"]
            step["delay_unit"] = spec["delay_unit"]
        else:
            tpl = _make_template(spec["channel"], category, i, locale)
            step = {
                "channel": spec["channel"],
                "delay_value": spec["delay_value"],
                "delay_unit": spec["delay_unit"],
                "template": tpl,
            }
            if spec["channel"] == "email":
                step["email_subject"] = tpl["subject"]

        expanded.append(step)

    workflow = dict(workflow)
    workflow["steps"] = expanded
    return workflow
