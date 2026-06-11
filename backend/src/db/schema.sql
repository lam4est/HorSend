CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY,
  workflow_key TEXT NOT NULL DEFAULT '',
  workflow_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  owner_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_step (
  id INTEGER PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
  status SMALLINT NOT NULL DEFAULT 1,
  step_order SMALLINT NOT NULL,
  channel TEXT NOT NULL,
  delay_value INTEGER,
  delay_unit TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_user (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
  original_workflow_id INTEGER NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  segment_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, original_workflow_id)
);

CREATE TABLE IF NOT EXISTS contact_list (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contacts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_step_user (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  workflow_user_id INTEGER NOT NULL REFERENCES workflow_user (id) ON DELETE CASCADE,
  workflow_step_id INTEGER NOT NULL REFERENCES workflow_step (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  delay_in_minutes INTEGER,
  template_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_confirmed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_user_id, workflow_step_id)
);

CREATE TABLE IF NOT EXISTS content_template (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact (
  id SERIAL PRIMARY KEY,
  display_name TEXT,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  contact_list_id INTEGER REFERENCES contact_list (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheduler_event (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  day SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  country_code VARCHAR(2),
  language VARCHAR(2) NOT NULL DEFAULT 'en',
  translation_key VARCHAR(255) NOT NULL DEFAULT '',
  name_key VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduler_event_subscription (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scheduler_event_id INTEGER NOT NULL REFERENCES scheduler_event (id) ON DELETE CASCADE,
  contact_list_id INTEGER REFERENCES contact_list (id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  channel TEXT NOT NULL DEFAULT 'sms',
  template_id TEXT,
  hour SMALLINT,
  minute SMALLINT,
  days_before INTEGER NOT NULL DEFAULT 0,
  estimated_number_of_contacts INTEGER NOT NULL DEFAULT 0,
  cost_per_contact DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scheduler_event_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_user_user_id ON workflow_user (user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_user_workflow_user_id ON workflow_step_user (workflow_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_workflow_id ON workflow_step (workflow_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_event_month_day ON scheduler_event (month, day);
CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows (owner_id);

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

CREATE INDEX IF NOT EXISTS idx_content_template_owner ON content_template (owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_list_owner_id ON contact_list (owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_owner_id ON contact (owner_id);
