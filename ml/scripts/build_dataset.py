#!/usr/bin/env python3
"""Build workflow-structure and template-content JSONL datasets from canonical examples."""

from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "dataset"
SEED_PATH = ROOT.parent / "backend" / "data" / "seed.json"

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

CANONICAL = [
    {
        "prompts": [
            "Welcome new users: email immediately, SMS after 1 day",
            "Tạo workflow chào mừng: email ngay, SMS sau 1 ngày",
            "3-step welcome journey with email and SMS",
        ],
        "workflow": {
            "name": "Welcome Journey",
            "category": "onboarding",
            "description": "Welcome new contacts with timed email and SMS.",
            "contact_list_id": None,
            "steps": [
                {
                    "channel": "email",
                    "delay_value": 0,
                    "delay_unit": "minute",
                    "template": {
                        "name": "Welcome Email",
                        "subject": "Welcome aboard!",
                        "body": "<p>Thanks for joining us. Start exploring today.</p>",
                    },
                },
                {
                    "channel": "sms",
                    "delay_value": 1,
                    "delay_unit": "day",
                    "template": {
                        "name": "Welcome SMS",
                        "subject": "",
                        "body": "Welcome! Open the app to claim your offer.",
                    },
                },
            ],
        },
    },
    {
        "prompts": [
            "Abandoned cart: email after 1 hour, SMS after 24 hours",
            "Nhắc giỏ hàng: email sau 1 giờ, SMS sau 24 giờ",
            "Cart recovery with discount email after 72 hours",
        ],
        "workflow": {
            "name": "Abandoned Cart Recovery",
            "category": "abandoned_basket",
            "description": "Recover abandoned carts with timed reminders.",
            "contact_list_id": None,
            "steps": [
                {
                    "channel": "email",
                    "delay_value": 1,
                    "delay_unit": "hour",
                    "template": {
                        "name": "Cart Reminder Email",
                        "subject": "You left something behind",
                        "body": "<p>Your cart is waiting. Complete checkout now.</p>",
                    },
                },
                {
                    "channel": "sms",
                    "delay_value": 1,
                    "delay_unit": "day",
                    "template": {
                        "name": "Cart SMS",
                        "subject": "",
                        "body": "Your cart is waiting — checkout now!",
                    },
                },
            ],
        },
    },
    {
        "prompts": [
            "Win back inactive users with email and SMS over 2 weeks",
            "Kích hoạt lại khách không hoạt động với ưu đãi quay lại",
        ],
        "workflow": {
            "name": "Win-back Campaign",
            "category": "reactivation",
            "description": "Re-engage inactive customers with a comeback offer.",
            "contact_list_id": None,
            "steps": [
                {
                    "channel": "email",
                    "delay_value": 0,
                    "delay_unit": "minute",
                    "template": {
                        "name": "We miss you",
                        "subject": "We miss you!",
                        "body": "<p>Come back and use code <strong>COMEBACK10</strong>.</p>",
                    },
                },
                {
                    "channel": "sms",
                    "delay_value": 7,
                    "delay_unit": "day",
                    "template": {
                        "name": "Comeback SMS",
                        "subject": "",
                        "body": "We miss you! Use COMEBACK10 on your next order.",
                    },
                },
            ],
        },
    },
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


def augment_workflow(wf: dict) -> dict:
    """Light augmentation: vary delays slightly."""
    out = json.loads(json.dumps(wf))
    for step in out.get("steps", []):
        if step["delay_value"] > 0 and random.random() < 0.3:
            step["delay_value"] = max(1, step["delay_value"] + random.choice([-1, 1]))
    return out


def build_workflow_dataset(target_train: int = 120, val_ratio: float = 0.15) -> None:
    lines: list[str] = []
    for item in CANONICAL:
        for prompt in item["prompts"]:
            wf = augment_workflow(item["workflow"])
            lines.append(to_jsonl_line(workflow_user_message(prompt), wf))

    # Synthetic variations
    templates = [
        ("Create {cat} workflow with email only", "email", 0, "minute"),
        ("{cat} journey: SMS after {d} days", "sms", 2, "day"),
        ("{cat}: email now then email after {d} hours", "email", 4, "hour"),
    ]
    for _ in range(target_train - len(lines)):
        cat = random.choice(CATEGORIES)
        tpl, ch, dv, du = random.choice(templates)
        prompt = tpl.format(cat=cat.replace("_", " "), d=random.randint(1, 5))
        wf = {
            "name": f"{cat.replace('_', ' ').title()} Flow",
            "category": cat,
            "description": f"AI-style {cat} workflow.",
            "contact_list_id": None,
            "steps": [
                {
                    "channel": ch,
                    "delay_value": dv,
                    "delay_unit": du,
                    "template": {
                        "name": f"{ch.upper()} step",
                        "subject": "Hello!" if ch == "email" else "",
                        "body": "<p>Automated message.</p>"
                        if ch == "email"
                        else "Your update is ready.",
                    },
                }
            ],
        }
        if random.random() < 0.4:
            wf["steps"].append(
                {
                    "channel": "sms" if ch == "email" else "email",
                    "delay_value": random.randint(1, 3),
                    "delay_unit": "day",
                    "template": {
                        "name": "Follow-up",
                        "subject": "Follow up",
                        "body": "Follow up with your customer.",
                    },
                }
            )
        lines.append(to_jsonl_line(workflow_user_message(prompt), wf))

    random.shuffle(lines)
    split = int(len(lines) * (1 - val_ratio))
    train, val = lines[:split], lines[split:]

    DATASET.mkdir(parents=True, exist_ok=True)
    (DATASET / "workflow-structure.train.jsonl").write_text("\n".join(train) + "\n", encoding="utf-8")
    (DATASET / "workflow-structure.val.jsonl").write_text("\n".join(val) + "\n", encoding="utf-8")
    print(f"workflow-structure: {len(train)} train, {len(val)} val")


def build_template_dataset(target_train: int = 350, val_ratio: float = 0.15) -> None:
    lines: list[str] = []
    intents = [
        ("welcome", "email", "Welcome!", "<p>Thanks for signing up.</p>"),
        ("cart reminder", "email", "Complete your order", "<p>Items still in your cart.</p>"),
        ("cart reminder", "sms", "", "Your cart is waiting!"),
        ("win back", "email", "We miss you", "<p>Use COMEBACK10 today.</p>"),
        ("win back", "sms", "", "Come back for 10% off!"),
        ("loyalty", "email", "VIP reward inside", "<p>Exclusive offer for you.</p>"),
    ]
    for intent, channel, subject, body in intents:
        for i in range(25):
            user = json.dumps(
                {
                    "intent": intent,
                    "channel": channel,
                    "workflow_name": "Sample",
                    "step_index": i % 3,
                    "locale": "en" if i % 2 == 0 else "vi",
                }
            )
            assistant = json.dumps(
                {
                    "name": f"{intent.title()} {channel}",
                    "subject": subject,
                    "body": body,
                },
                ensure_ascii=False,
            )
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

    while len(lines) < target_train:
        intent, channel, subject, body = random.choice(intents)
        user = json.dumps({"intent": intent, "channel": channel, "step_index": 0, "locale": "en"})
        assistant = json.dumps({"name": intent, "subject": subject, "body": body})
        lines.append(
            json.dumps(
                {
                    "messages": [
                        {"role": "user", "content": f"[TEMPLATE]\n{user}"},
                        {"role": "assistant", "content": assistant},
                    ]
                }
            )
        )

    random.shuffle(lines)
    split = int(len(lines) * (1 - val_ratio))
    train, val = lines[:split], lines[split:]
    (DATASET / "template-content.train.jsonl").write_text("\n".join(train) + "\n", encoding="utf-8")
    (DATASET / "template-content.val.jsonl").write_text("\n".join(val) + "\n", encoding="utf-8")
    print(f"template-content: {len(train)} train, {len(val)} val")


def main() -> None:
    random.seed(42)
    if SEED_PATH.exists():
        print(f"Seed file found: {SEED_PATH}")
    build_workflow_dataset()
    build_template_dataset()
    print("Done.")


if __name__ == "__main__":
    main()
