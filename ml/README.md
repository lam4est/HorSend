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

Each JSONL line:

```json
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "{...json...}"}]}
```

Target sizes:

| Stage | Workflow examples | Template examples |
|-------|-------------------|-------------------|
| POC | 100–200 | 300–500 |
| Production | 500+ | 2000+ |

## Feedback loop

Accepted AI generations are logged in PostgreSQL table `ai_generation_log`. Export with:

```sql
SELECT prompt, draft_json, user_edits_json
FROM ai_generation_log
WHERE accepted = TRUE;
```

Merge exports into `dataset/` and re-run `build_dataset.py` before retraining.
