-- Dedupe by exact scheduled send time (re-send allowed when user changes Send date).
ALTER TABLE scheduler_send_log ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMP;
ALTER TABLE scheduler_send_log DROP CONSTRAINT IF EXISTS scheduler_send_log_user_id_scheduler_event_id_event_year_key;
DELETE FROM scheduler_send_log WHERE scheduled_send_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduler_send_log_schedule
  ON scheduler_send_log (user_id, scheduler_event_id, scheduled_send_at);
