"""Programmatic high-quality workflow catalog for dataset expansion."""

from __future__ import annotations

import copy
import random
from typing import Any

# Rich template pools — rotate by variant index for diversity
EMAIL_TEMPLATES: dict[str, list[dict[str, str]]] = {
    "welcome": [
        {"name": "Welcome Email", "subject": "Welcome aboard!", "body": "<p>Thanks for joining. Complete your profile to unlock personalized recommendations.</p>"},
        {"name": "Hello Email", "subject": "You are all set!", "body": "<p>Your account is ready. Explore the dashboard and start your first project.</p>"},
        {"name": "Getting Started", "subject": "3 steps to get started", "body": "<p>Follow this quick guide to get value in your first session.</p>"},
    ],
    "cart": [
        {"name": "Cart Reminder", "subject": "You left something behind", "body": "<p>Your cart is still waiting. Checkout before your items sell out.</p>"},
        {"name": "Cart Nudge", "subject": "Complete your order", "body": "<p>Finish checkout in one click — your items are reserved for 24 hours.</p>"},
        {"name": "Cart Discount", "subject": "10% off your cart", "body": "<p>Use code <strong>SAVE10</strong> to complete your order today.</p>"},
    ],
    "winback": [
        {"name": "We Miss You", "subject": "We miss you!", "body": "<p>It has been a while. Come back and see what is new.</p>"},
        {"name": "Comeback Offer", "subject": "A special offer just for you", "body": "<p>Use <strong>COMEBACK15</strong> for 15% off your next order.</p>"},
        {"name": "Final Win-back", "subject": "Last chance to return", "body": "<p>Your exclusive comeback offer expires this week.</p>"},
    ],
    "loyalty": [
        {"name": "VIP Reward", "subject": "Your VIP reward is here", "body": "<p>You have earned exclusive access to our loyalty rewards store.</p>"},
        {"name": "Points Update", "subject": "You earned 250 points", "body": "<p>Redeem points for discounts, gifts, and early access to sales.</p>"},
        {"name": "Loyalty Milestone", "subject": "Congratulations — Gold status!", "body": "<p>You unlocked Gold tier benefits. Here is what you can enjoy now.</p>"},
    ],
    "retention": [
        {"name": "Renewal Notice", "subject": "Your plan renews soon", "body": "<p>Review your subscription or update payment details before renewal.</p>"},
        {"name": "Stay With Us", "subject": "Before you go…", "body": "<p>We would love to keep you. Here is a special offer to stay subscribed.</p>"},
        {"name": "Thank You", "subject": "Thanks for staying", "body": "<p>Your subscription is active. Here is a summary of your plan benefits.</p>"},
    ],
    "nurture": [
        {"name": "Education Email", "subject": "A guide to solving your challenge", "body": "<p>Download our practical guide with actionable tips for your team.</p>"},
        {"name": "Case Study", "subject": "How peers achieved 2x growth", "body": "<p>Read how similar teams improved results in 90 days.</p>"},
        {"name": "Demo Invite", "subject": "See it in action — 15 min demo", "body": "<p>Book a short demo and get a personalized walkthrough.</p>"},
    ],
    "activation": [
        {"name": "Setup Guide", "subject": "Finish your setup", "body": "<p>Complete these steps to unlock all features and integrations.</p>"},
        {"name": "Feature Tip", "subject": "Try this power feature", "body": "<p>Enable automations to save hours every week.</p>"},
        {"name": "Trial Ending", "subject": "Your trial ends soon", "body": "<p>Upgrade now to keep your data and premium features.</p>"},
    ],
    "qualify": [
        {"name": "Intro Email", "subject": "Thanks for your interest", "body": "<p>Tell us about your goals so we can recommend the right solution.</p>"},
        {"name": "Survey", "subject": "Quick 2-minute survey", "body": "<p>Answer three questions to get a tailored recommendation.</p>"},
        {"name": "Follow-up", "subject": "Ready for the next step?", "body": "<p>Book a call with our team to discuss your requirements.</p>"},
    ],
    "promo": [
        {"name": "Sale Teaser", "subject": "Big sale coming soon", "body": "<p>Mark your calendar — our biggest promotion starts this week.</p>"},
        {"name": "Sale Launch", "subject": "Sale is live!", "body": "<p>Shop now and save up to 50% on selected items.</p>"},
        {"name": "Last Chance", "subject": "Final hours — ends tonight", "body": "<p>Do not miss out — sale ends at midnight.</p>"},
    ],
}

SMS_TEMPLATES: dict[str, list[str]] = {
    "welcome": [
        "Welcome! Open the app to claim your new-user offer.",
        "Thanks for joining — complete your profile in 2 taps!",
        "Your account is ready. Start exploring now!",
    ],
    "cart": [
        "Your cart is waiting — checkout now!",
        "Items in your cart are selling fast. Order today!",
        "Use SAVE10 on your cart — expires tonight!",
    ],
    "winback": [
        "We miss you! Use COMEBACK15 on your next order.",
        "Come back for 15% off — today only!",
        "Your exclusive offer expires soon. Shop now!",
    ],
    "loyalty": [
        "You earned 250 points — redeem in the app!",
        "VIP reward waiting — claim before it expires!",
        "Gold status unlocked! See your new perks.",
    ],
    "retention": [
        "Your subscription renews tomorrow.",
        "Stay with us — reply YES for 30% off 3 months!",
        "Payment failed — update your card to keep access.",
    ],
    "nurture": [
        "New guide for you — check your inbox!",
        "See how peers grew 2x — link in email.",
        "Book your 15-min demo — slots filling up!",
    ],
    "activation": [
        "Finish setup in 2 min — unlock all features!",
        "Try automations today — enable in Settings.",
        "Trial ends soon! Upgrade to keep your data.",
    ],
    "qualify": [
        "Quick survey — 2 min to get a tailored plan!",
        "Ready for next steps? Book a call today.",
        "We have a recommendation for you — check email.",
    ],
    "promo": [
        "SALE IS ON! Shop now before bestsellers sell out.",
        "Flash sale live — up to 50% off today only!",
        "Last chance! Sale ends at midnight tonight.",
    ],
}

CATEGORY_INTENT = {
    "onboarding": "welcome",
    "abandoned_basket": "cart",
    "reactivation": "winback",
    "loyalty": "loyalty",
    "retention": "retention",
    "nurturing": "nurture",
    "activation": "activation",
    "qualification": "qualify",
}

# Archetype: (channels/delays), intent override optional
ARCHETYPES: list[dict[str, Any]] = [
    # onboarding
    {"category": "onboarding", "name": "Welcome Email + SMS", "intent": "welcome",
     "steps": [("email", 0, "minute"), ("sms", 1, "day")]},
    {"category": "onboarding", "name": "3-Step Welcome Series", "intent": "welcome",
     "steps": [("email", 0, "minute"), ("sms", 1, "day"), ("email", 3, "day")]},
    {"category": "onboarding", "name": "SMS-first Onboarding", "intent": "welcome",
     "steps": [("sms", 0, "minute"), ("email", 1, "day")]},
    {"category": "onboarding", "name": "RCS Welcome", "intent": "welcome",
     "steps": [("email", 0, "minute"), ("rcs", 1, "day")]},
    {"category": "onboarding", "name": "Extended Onboarding", "intent": "welcome",
     "steps": [("email", 0, "minute"), ("email", 2, "day"), ("sms", 5, "day")]},
    # abandoned_basket
    {"category": "abandoned_basket", "name": "Cart Recovery 2-Step", "intent": "cart",
     "steps": [("email", 1, "hour"), ("sms", 1, "day")]},
    {"category": "abandoned_basket", "name": "Cart Recovery 3-Step", "intent": "cart",
     "steps": [("email", 1, "hour"), ("sms", 1, "day"), ("email", 3, "day")]},
    {"category": "abandoned_basket", "name": "Browse Abandonment", "intent": "cart",
     "steps": [("email", 2, "hour"), ("sms", 1, "day")]},
    {"category": "abandoned_basket", "name": "High-Value Cart", "intent": "cart",
     "steps": [("email", 30, "minute"), ("sms", 4, "hour"), ("voice", 1, "day")]},
    {"category": "abandoned_basket", "name": "Wishlist Reminder", "intent": "cart",
     "steps": [("email", 1, "day"), ("sms", 3, "day")]},
    # reactivation
    {"category": "reactivation", "name": "Win-back 2-Step", "intent": "winback",
     "steps": [("email", 0, "minute"), ("sms", 7, "day")]},
    {"category": "reactivation", "name": "Win-back 3-Step", "intent": "winback",
     "steps": [("email", 0, "minute"), ("sms", 7, "day"), ("email", 14, "day")]},
    {"category": "reactivation", "name": "SMS-first Win-back", "intent": "winback",
     "steps": [("sms", 0, "minute"), ("email", 1, "day")]},
    {"category": "reactivation", "name": "Usage Drop Save", "intent": "winback",
     "steps": [("email", 0, "minute"), ("sms", 3, "day")]},
    {"category": "reactivation", "name": "Long Inactive Win-back", "intent": "winback",
     "steps": [("email", 0, "minute"), ("email", 7, "day"), ("sms", 14, "day")]},
    # loyalty
    {"category": "loyalty", "name": "VIP Points Reward", "intent": "loyalty",
     "steps": [("email", 0, "minute"), ("sms", 5, "day")]},
    {"category": "loyalty", "name": "Points Expiry Alert", "intent": "loyalty",
     "steps": [("email", 14, "day"), ("sms", 3, "day"), ("email", 0, "minute")]},
    {"category": "loyalty", "name": "Birthday Offer", "intent": "loyalty",
     "steps": [("email", 0, "minute"), ("sms", 3, "day")]},
    {"category": "loyalty", "name": "Referral Launch", "intent": "loyalty",
     "steps": [("email", 0, "minute"), ("sms", 2, "day"), ("email", 7, "day")]},
    {"category": "loyalty", "name": "Anniversary Gift", "intent": "loyalty",
     "steps": [("email", 0, "minute"), ("sms", 2, "day")]},
    # retention
    {"category": "retention", "name": "Subscription Renewal", "intent": "retention",
     "steps": [("email", 7, "day"), ("sms", 1, "day"), ("email", 0, "minute")]},
    {"category": "retention", "name": "Payment Recovery", "intent": "retention",
     "steps": [("email", 0, "minute"), ("sms", 6, "hour"), ("email", 2, "day")]},
    {"category": "retention", "name": "Cancellation Save", "intent": "retention",
     "steps": [("email", 0, "minute"), ("sms", 2, "day")]},
    {"category": "retention", "name": "Post-Purchase Thanks", "intent": "retention",
     "steps": [("email", 0, "minute"), ("sms", 5, "day")]},
    {"category": "retention", "name": "Cross-sell Sequence", "intent": "retention",
     "steps": [("email", 3, "day"), ("sms", 7, "day")]},
    # nurturing
    {"category": "nurturing", "name": "Lead Nurture Drip", "intent": "nurture",
     "steps": [("email", 0, "minute"), ("email", 3, "day"), ("email", 7, "day")]},
    {"category": "nurturing", "name": "Free Tier Nurture", "intent": "nurture",
     "steps": [("email", 0, "minute"), ("email", 4, "day"), ("email", 10, "day")]},
    {"category": "nurturing", "name": "Event Registration", "intent": "nurture",
     "steps": [("email", 0, "minute"), ("sms", 1, "day"), ("email", 1, "day")]},
    {"category": "nurturing", "name": "Black Friday Blast", "intent": "promo",
     "steps": [("email", 7, "day"), ("email", 0, "minute"), ("sms", 0, "minute"), ("email", 2, "day")]},
    {"category": "nurturing", "name": "Flash Sale 24h", "intent": "promo",
     "steps": [("email", 0, "minute"), ("sms", 0, "minute"), ("email", 12, "hour")]},
    {"category": "nurturing", "name": "Summer Sale", "intent": "promo",
     "steps": [("email", 5, "day"), ("email", 0, "minute"), ("sms", 0, "minute")]},
    # activation
    {"category": "activation", "name": "Trial Conversion", "intent": "activation",
     "steps": [("email", 3, "day"), ("sms", 0, "minute"), ("email", 1, "day")]},
    {"category": "activation", "name": "Account Setup", "intent": "activation",
     "steps": [("email", 0, "minute"), ("sms", 1, "day"), ("email", 3, "day")]},
    {"category": "activation", "name": "First Purchase Activation", "intent": "activation",
     "steps": [("email", 0, "minute"), ("email", 2, "day"), ("sms", 5, "day")]},
    {"category": "activation", "name": "Feature Announcement", "intent": "activation",
     "steps": [("email", 0, "minute"), ("sms", 1, "day")]},
    {"category": "activation", "name": "Product Adoption", "intent": "activation",
     "steps": [("email", 0, "minute"), ("email", 3, "day"), ("sms", 7, "day")]},
    # qualification
    {"category": "qualification", "name": "Lead Qualification", "intent": "qualify",
     "steps": [("email", 0, "minute"), ("email", 2, "day"), ("sms", 4, "day")]},
    {"category": "qualification", "name": "Demo Follow-up", "intent": "qualify",
     "steps": [("email", 0, "minute"), ("sms", 1, "day")]},
    {"category": "qualification", "name": "Cold Lead Re-qualify", "intent": "qualify",
     "steps": [("email", 0, "minute"), ("email", 5, "day")]},
    {"category": "qualification", "name": "MQL to SQL Handoff", "intent": "qualify",
     "steps": [("email", 0, "minute"), ("sms", 2, "day"), ("email", 4, "day")]},
    {"category": "qualification", "name": "Webinar Qualification", "intent": "qualify",
     "steps": [("email", 0, "minute"), ("email", 1, "day"), ("sms", 3, "day")]},
]

DESCRIPTIONS: dict[str, list[str]] = {
    "onboarding": [
        "Onboard new contacts with a timed multi-channel welcome sequence.",
        "Guide new users through their first week with email and SMS touchpoints.",
    ],
    "abandoned_basket": [
        "Recover abandoned checkouts with escalating reminders across channels.",
        "Bring shoppers back to complete their purchase with timed follow-ups.",
    ],
    "reactivation": [
        "Re-engage inactive customers with a structured comeback offer sequence.",
        "Win back dormant users before they churn permanently.",
    ],
    "loyalty": [
        "Reward loyal customers and drive engagement with the loyalty program.",
        "Celebrate milestones and encourage reward redemption.",
    ],
    "retention": [
        "Retain subscribers and buyers with proactive renewal and save offers.",
        "Prevent churn with timely retention messaging.",
    ],
    "nurturing": [
        "Educate and nurture leads through a multi-touch content sequence.",
        "Drive conversions with a timed promotional campaign.",
    ],
    "activation": [
        "Activate new users and trial accounts with guided setup messaging.",
        "Drive feature adoption and trial-to-paid conversion.",
    ],
    "qualification": [
        "Qualify inbound leads and move them toward a sales conversation.",
        "Assess lead fit and schedule follow-up touchpoints.",
    ],
}


def _pick_template(channel: str, intent: str, step_index: int, variant: int) -> dict[str, str]:
    if channel == "email":
        pool = EMAIL_TEMPLATES.get(intent, EMAIL_TEMPLATES["welcome"])
        tpl = pool[(step_index + variant) % len(pool)]
        return {"name": tpl["name"], "subject": tpl["subject"], "body": tpl["body"]}
    if channel in ("sms", "rcs", "voice", "voice_sms"):
        pool = SMS_TEMPLATES.get(intent, SMS_TEMPLATES["welcome"])
        body = pool[(step_index + variant) % len(pool)]
        if channel == "voice":
            body = f"Automated voice message: {body[:80]}"
        name = f"{channel.upper()} step {step_index + 1}"
        return {"name": name, "subject": "", "body": body[:160] if channel in ("sms", "rcs") else body}
    return {"name": f"Step {step_index + 1}", "subject": "", "body": "Message content."}


def build_workflow_from_archetype(arch: dict[str, Any], variant: int = 0) -> dict[str, Any]:
    category = arch["category"]
    intent = arch.get("intent", CATEGORY_INTENT.get(category, "welcome"))
    steps = []
    for i, (channel, delay_value, delay_unit) in enumerate(arch["steps"]):
        steps.append({
            "channel": channel,
            "delay_value": delay_value,
            "delay_unit": delay_unit,
            "template": _pick_template(channel, intent, i, variant),
        })
    desc_pool = DESCRIPTIONS.get(category, ["Automated customer journey workflow."])
    return {
        "name": arch["name"],
        "category": category,
        "description": desc_pool[variant % len(desc_pool)],
        "contact_list_id": None,
        "steps": steps,
    }


def generate_catalog_items(variants_per_archetype: int = 2) -> list[dict[str, Any]]:
    """Return catalog items ready for build_dataset (workflow only, no prompts)."""
    items: list[dict[str, Any]] = []
    for arch in ARCHETYPES:
        for v in range(variants_per_archetype):
            wf = build_workflow_from_archetype(arch, variant=v)
            # Slight delay jitter on variant > 0
            if v > 0:
                wf = copy.deepcopy(wf)
                for step in wf["steps"]:
                    if step["delay_value"] > 0:
                        step["delay_value"] = max(1, step["delay_value"] + (v - 1))
                wf["name"] = f"{arch['name']} (variant {v + 1})"
            items.append({"workflow": wf, "source": "catalog"})
    return items


def jitter_workflow(workflow: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    """Create a timing variant with ±1 delay on non-zero steps."""
    out = copy.deepcopy(workflow)
    for step in out["steps"]:
        if step["delay_value"] > 0:
            step["delay_value"] = max(1, step["delay_value"] + rng.choice([-1, 1]))
    return out
