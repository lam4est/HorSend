CREATE TABLE IF NOT EXISTS workflow_templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id INTEGER PRIMARY KEY,
  workflow_template_id INTEGER NOT NULL REFERENCES workflow_templates (id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  channel TEXT NOT NULL,
  delay_in_minutes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflow_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  workflow_id INTEGER NOT NULL REFERENCES workflow_templates (id),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS step_users (
  id SERIAL PRIMARY KEY,
  workflow_user_id INTEGER NOT NULL REFERENCES workflow_users (id) ON DELETE CASCADE,
  workflow_step_id INTEGER NOT NULL REFERENCES workflow_steps (id),
  channel TEXT NOT NULL,
  delay_in_minutes INTEGER,
  template_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_confirmed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB,
  UNIQUE (workflow_user_id, workflow_step_id)
);

CREATE TABLE IF NOT EXISTS scheduler_events (
  id INTEGER PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS scheduler_subscriptions (
  user_id INTEGER NOT NULL,
  scheduler_event_id INTEGER NOT NULL REFERENCES scheduler_events (id) ON DELETE CASCADE,
  contact_list_id INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, scheduler_event_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_users_user_id ON workflow_users (user_id);
CREATE INDEX IF NOT EXISTS idx_step_users_workflow_user_id ON step_users (workflow_user_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_events_month ON scheduler_events (month);
