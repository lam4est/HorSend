"""FastAPI inference service for AI Workflow Builder."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .model_loader import (
    adapters_available,
    enrich_templates,
    generate_with_model,
    rule_based_workflow,
)

app = FastAPI(title="Campaign Workflow ML Inference", version="1.0.0")


class GenerateWorkflowRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=4000)
    context: dict[str, Any] = Field(default_factory=dict)
    locale: str = "en"


class GenerateTemplateRequest(BaseModel):
    intent: str
    channel: str
    workflow_name: str = ""
    step_index: int = 0
    locale: str = "en"


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "adapters_available": adapters_available(),
        "mode": "lora" if adapters_available() else "rule_based",
    }


@app.post("/generate/workflow")
def generate_workflow(req: GenerateWorkflowRequest) -> dict[str, Any]:
    workflow = generate_with_model(req.prompt, req.context, req.locale)
    source = "lora"
    if workflow is None:
        workflow = rule_based_workflow(req.prompt, req.locale)
        source = "rule_based"
    workflow = enrich_templates(workflow, req.locale)
    return {"workflow": workflow, "source": source}


@app.post("/generate/template")
def generate_template(req: GenerateTemplateRequest) -> dict[str, Any]:
    vi = req.locale == "vi"
    ch = req.channel.lower()
    if ch == "email":
        subjects = {
            "welcome": "Chào mừng!" if vi else "Welcome!",
            "cart reminder": "Hoàn tất đơn hàng" if vi else "Complete your order",
        }
        subject = subjects.get(req.intent, "Hello" if not vi else "Xin chào")
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
        "template": {
            "name": f"{req.intent} {ch}",
            "subject": subject,
            "body": body,
        },
        "source": "rule_based",
    }
