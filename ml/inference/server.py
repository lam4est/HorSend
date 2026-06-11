"""FastAPI inference service for AI Workflow Builder."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .model_loader import (
    adapters_available,
    enrich_templates,
    generate_template_with_model,
    generate_with_model,
    is_model_loaded,
    load_model,
    rule_based_template,
    rule_based_workflow,
    template_adapter_available,
)
from .workflow_expand import expand_workflow

WarmupStatus = Literal["idle", "loading", "ready", "skipped", "failed"]
_warmup_status: WarmupStatus = "idle"


def warmup_status() -> WarmupStatus:
    return _warmup_status


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _warmup_status
    if adapters_available():
        _warmup_status = "loading"
        print("[inference] Warming up LoRA model…")
        try:
            ok = load_model()
            _warmup_status = "ready" if ok else "failed"
            if ok:
                print("[inference] Model ready.")
            else:
                print("[inference] Warmup failed — rule-based fallback will be used.")
        except Exception as exc:
            _warmup_status = "failed"
            print(f"[inference] Warmup error: {exc}")
    else:
        _warmup_status = "skipped"
        print("[inference] No adapters found — rule-based mode only.")
    yield


app = FastAPI(title="Campaign Workflow ML Inference", version="1.0.0", lifespan=lifespan)


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
    loaded = is_model_loaded()
    status = warmup_status()
    if wf and loaded:
        mode = "lora"
    else:
        mode = "rule_based"
    return {
        "ok": True,
        "adapters_available": wf,
        "template_adapter_available": tpl,
        "model_loaded": loaded,
        "warmup_status": status,
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
