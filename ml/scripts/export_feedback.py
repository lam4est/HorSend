#!/usr/bin/env python3
"""Export accepted AI generations from PostgreSQL for retraining.

Usage:
  DATABASE_URL=postgresql://... python ml/scripts/export_feedback.py > ml/dataset/feedback_export.jsonl
"""

from __future__ import annotations

import json
import os
import sys

try:
    import psycopg2
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
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
    for prompt, draft_json, edits in cur.fetchall():
        workflow = edits if edits else draft_json.get("workflow") if draft_json else None
        if not workflow:
            continue
        line = {
            "messages": [
                {"role": "user", "content": f"Prompt: {prompt}"},
                {"role": "assistant", "content": json.dumps(workflow, ensure_ascii=False)},
            ]
        }
        print(json.dumps(line, ensure_ascii=False))

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
