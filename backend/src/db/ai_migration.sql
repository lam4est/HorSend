-- AI workflow builder migrations
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system';

CREATE TABLE IF NOT EXISTS ai_generation_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  draft_json JSONB NOT NULL,
  user_edits_json JSONB,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_user_id INTEGER REFERENCES workflow_user (id) ON DELETE SET NULL,
  inference_source TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_log_user ON ai_generation_log (user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows (owner_id);
