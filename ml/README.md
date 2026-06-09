# Campaign Workflow ML Pipeline

Fine-tune open-weight models for:

1. **workflow-structure** — prompt → workflow JSON (channels, delays, category)
2. **template-content** — step context → email/SMS copy

## Llama 3.2 3B on Google Colab

See [`notebooks/train_llama_colab.ipynb`](notebooks/train_llama_colab.ipynb).

1. Accept https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct license
2. Zip `ml/dataset/*.jsonl` → upload to Colab
3. Train → download `workflow-lora.zip`
4. Extract to `ml/adapters/workflow-lora/` on your machine
5. `pnpm ml:serve` + set `ML_USE_MOCK=false` in `.env`

## Quick start

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Build / augment training data from seed examples
python scripts/build_dataset.py

# Evaluate JSON validity on val set
python scripts/evaluate.py

# Train LoRA adapters (requires GPU, ~16GB VRAM with QLoRA)
python training/train_workflow_lora.py
python training/train_template_lora.py

# Run inference API (port 8001)
uvicorn inference.server:app --host 127.0.0.1 --port 8001
```

Backend reads `ML_INFERENCE_URL` (default `http://127.0.0.1:8001`). Set `ML_USE_MOCK=true` in backend `.env` to skip inference and use the rule-based generator.

## Dataset format

Dataset sources (rebuilt via `pnpm ml:dataset`):

| Source | Description |
|--------|-------------|
| [`curated_workflows.json`](dataset/curated_workflows.json) | 25 hand-crafted train + 9 val workflows |
| `workflow_catalog.py` | 41 archetypes × 3 variants — realistic multi-step journeys |
| `prompt_generator.py` | Auto EN/VI prompts from step timing + delay jitter variants |
| `feedback_export.jsonl` | Accepted workflows from production (merged first) |

Typical output: **600+ workflow train**, **70+ val**, **450+ template train** — all multi-step (avg ~2.6 steps).

Rebuild:

```bash
pnpm ml:dataset
```

Each JSONL line:

```json
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "{...json...}"}]}
```

To add more workflows, append entries to `curated_workflows.json` then re-run `pnpm ml:dataset`.

Target sizes:

| Stage | Workflow examples | Template examples |
|-------|-------------------|-------------------|
| POC | 100 (curated) | auto-extracted from steps |
| Production | 500+ | 2000+ |

## Feedback loop (steps 9–11)

1. **Accept workflows in UI** — edits are saved to `ai_generation_log` (`accepted = TRUE`).
2. **Export + rebuild dataset:**
   ```bash
   export DATABASE_URL=postgresql://user:pass@localhost:5432/campaign
   pnpm ml:feedback
   ```
   Or manually:
   ```bash
   python ml/scripts/export_feedback.py -o ml/dataset/feedback_export.jsonl
   python ml/scripts/build_dataset.py
   ```
3. **Retrain on Colab** — zip `ml/dataset/*.jsonl`, upload notebook, download new adapters to `ml/adapters/`.

Feedback samples are merged **first** (higher priority than synthetic data) and deduped by prompt.

## Template LoRA at inference (step 13)

When `ml/adapters/template-lora/` is present, `/generate/template` and workflow `enrich_templates()` use the template adapter for email/SMS copy instead of hardcoded text.

Check health:
```bash
curl http://127.0.0.1:8001/health
# template_adapter_available: true
```

## Retrain checklist

| Step | Command |
|------|---------|
| Use AI, accept + edit workflows | UI → Workflows → AI Builder |
| Export feedback | `pnpm ml:feedback` |
| Validate dataset | `pnpm ml:eval` |
| Train adapters | Colab notebook or local GPU scripts |
| Serve | `pnpm ml:serve` + `ML_USE_MOCK=false` |
