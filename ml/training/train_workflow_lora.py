#!/usr/bin/env python3
"""Fine-tune LoRA adapter for workflow-structure task (QLoRA)."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = Path(__file__).resolve().parent / "config.yaml"


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def main() -> None:
    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig, get_peft_model
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from trl import SFTTrainer, SFTConfig
    except ImportError as e:
        print("Install ML dependencies: pip install -r ml/requirements.txt")
        raise SystemExit(1) from e

    if not torch.cuda.is_available():
        print("WARNING: No CUDA GPU detected. Training will be very slow on CPU.")
        print("Use a cloud GPU (Colab, RunPod) or skip training and use mock inference.")

    cfg = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    wf = cfg["workflow"]
    train_path = (CONFIG_PATH.parent / wf["train_file"]).resolve()
    val_path = (CONFIG_PATH.parent / wf["val_file"]).resolve()
    out_dir = (CONFIG_PATH.parent / cfg["output_dir"] / "workflow-lora").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not train_path.exists():
        print(f"Run ml/scripts/build_dataset.py first. Missing {train_path}")
        raise SystemExit(1)

    model_name = cfg["base_model"]
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    def format_example(row: dict) -> dict:
        msgs = row["messages"]
        text = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False)
        return {"text": text}

    train_ds = Dataset.from_list([format_example(r) for r in load_jsonl(train_path)])
    val_ds = Dataset.from_list([format_example(r) for r in load_jsonl(val_path)])

    bnb_config = None
    if cfg["qlora"]["load_in_4bit"]:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type=cfg["qlora"]["bnb_4bit_quant_type"],
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
    )

    target_modules = cfg.get("lora_target_modules", ["q_proj", "k_proj", "v_proj", "o_proj"])
    lora = LoraConfig(
        r=wf["lora_r"],
        lora_alpha=wf["lora_alpha"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=target_modules,
    )
    model = get_peft_model(model, lora)

    sft_config = SFTConfig(
        output_dir=str(out_dir),
        num_train_epochs=wf["epochs"],
        per_device_train_batch_size=wf["batch_size"],
        learning_rate=wf["learning_rate"],
        logging_steps=10,
        save_strategy="epoch",
        max_length=wf["max_seq_length"],
        dataset_text_field="text",
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    print(f"Saved workflow LoRA adapter to {out_dir}")


if __name__ == "__main__":
    main()
