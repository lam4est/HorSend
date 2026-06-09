#!/usr/bin/env python3
"""Export accepted AI generations from PostgreSQL for retraining.

Usage:
  DATABASE_URL=postgresql://... python ml/scripts/export_feedback.py
  DATABASE_URL=postgresql://... python ml/scripts/export_feedback.py --output ml/dataset/feedback_export.jsonl
  pnpm ml:feedback   # export + rebuild dataset (reads DATABASE_URL from env)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from dataset_utils import to_jsonl_line, workflow_user_message

try:
    import psycopg2
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    raise SystemExit(1)


def export_lines() -> list[str]:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("Set DATABASE_URL", file=sys.stderr)
        raise SystemExit(1)

    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT prompt, draft_json, user_edits_json
        FROM ai_generation_log
        WHERE accepted = TRUE
        ORDER BY created_at
        """
    )

    lines: list[str] = []
    for prompt, draft_json, edits in cur.fetchall():
        workflow = edits if edits else draft_json.get("workflow") if draft_json else None
        if not workflow or not prompt:
            continue
        lines.append(to_jsonl_line(workflow_user_message(prompt), workflow))

    cur.close()
    conn.close()
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Export accepted AI feedback for retraining")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Write JSONL to file instead of stdout",
    )
    args = parser.parse_args()

    lines = export_lines()
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        print(f"Exported {len(lines)} accepted workflows to {args.output}", file=sys.stderr)
    else:
        for line in lines:
            print(line)


if __name__ == "__main__":
    main()
