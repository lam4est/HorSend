-- Tracks sends per exact scheduled send date/time (not just per year).
CREATE TABLE IF NOT EXISTS scheduler_send_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scheduler_event_id INTEGER NOT NULL REFERENCES scheduler_event (id) ON DELETE CASCADE,
  event_year SMALLINT NOT NULL,
  scheduled_send_at TIMESTAMP NOT NULL,
  contacts_sent INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scheduler_event_id, scheduled_send_at)
);

CREATE INDEX IF NOT EXISTS idx_scheduler_send_log_year
  ON scheduler_send_log (event_year, scheduler_event_id);
