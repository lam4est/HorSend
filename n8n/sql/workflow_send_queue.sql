-- Queue for Campaign Workflow sends (processed by n8n dispatcher).
CREATE TABLE IF NOT EXISTS workflow_send_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  workflow_user_id INTEGER NOT NULL REFERENCES workflow_user (id) ON DELETE CASCADE,
  workflow_step_user_id INTEGER NOT NULL REFERENCES workflow_step_user (id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contact (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template_id TEXT,
  message_subject TEXT NOT NULL DEFAULT '',
  message_body TEXT NOT NULL DEFAULT '',
  sender TEXT NOT NULL DEFAULT '',
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_step_user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_send_queue_pending
  ON workflow_send_queue (status, scheduled_at)
  WHERE status = 'pending';
