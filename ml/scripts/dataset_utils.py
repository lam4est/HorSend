"""Shared helpers for ML dataset format (build + feedback export)."""

from __future__ import annotations

import json

CHANNELS = ["email", "sms", "rcs", "voice", "voice_sms"]
CATEGORIES = [
    "onboarding",
    "abandoned_basket",
    "reactivation",
    "loyalty",
    "retention",
    "nurturing",
    "activation",
    "qualification",
]


def workflow_user_message(prompt: str) -> str:
    ctx = f"Channels: {','.join(CHANNELS)}\nCategories: {','.join(CATEGORIES)}\n\nPrompt: {prompt}"
    return ctx


def to_jsonl_line(user: str, assistant_obj: dict) -> str:
    return json.dumps(
        {
            "messages": [
                {"role": "user", "content": user},
                {"role": "assistant", "content": json.dumps(assistant_obj, ensure_ascii=False)},
            ]
        },
        ensure_ascii=False,
    )


def prompt_key(user_content: str) -> str:
    """Normalize user message for deduplication."""
    if "Prompt: " in user_content:
        return user_content.split("Prompt: ", 1)[-1].strip().lower()
    return user_content.strip().lower()
