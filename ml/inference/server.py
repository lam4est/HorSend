"""FastAPI inference service for AI Workflow Builder."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .model_loader import (
    adapters_available,
    enrich_templates,
    generate_template_with_model,
    generate_with_model,
    rule_based_template,
    rule_based_workflow,
    template_adapter_available,
)
from .workflow_expand import expand_workflow

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
    wf = adapters_available()
    tpl = template_adapter_available()
    mode = "lora" if wf else "rule_based"
    return {
        "ok": True,
        "adapters_available": wf,
        "template_adapter_available": tpl,
        "mode": mode,
    }


@app.post("/generate/workflow")
def generate_workflow(req: GenerateWorkflowRequest) -> dict[str, Any]:
    workflow = generate_with_model(req.prompt, req.context, req.locale)
    source = "lora"
    if workflow is None:
        workflow = rule_based_workflow(req.prompt, req.locale)
        source = "rule_based"
    workflow = expand_workflow(workflow, req.prompt, req.locale)
    workflow = enrich_templates(workflow, req.locale)
    return {"workflow": workflow, "source": source}


@app.post("/generate/template")
def generate_template(req: GenerateTemplateRequest) -> dict[str, Any]:
    template = generate_template_with_model(
        intent=req.intent,
        channel=req.channel,
        workflow_name=req.workflow_name,
        step_index=req.step_index,
        locale=req.locale,
    )
    source = "lora"
    if template is None:
        template = rule_based_template(
            req.intent,
            req.channel,
            req.workflow_name,
            req.step_index,
            req.locale,
        )
        source = "rule_based"
    return {"template": template, "source": source}
