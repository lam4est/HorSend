-- Per-recipient send records for Campaign Auto Scheduler batches.
CREATE TABLE IF NOT EXISTS scheduler_send_detail (
  id BIGSERIAL PRIMARY KEY,
  send_log_id INTEGER NOT NULL REFERENCES scheduler_send_log (id) ON DELETE CASCADE,
  contact_id INTEGER,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduler_send_detail_log
  ON scheduler_send_detail (send_log_id);
