-- Incremental migrations for databases created before production schema alignment.
ALTER TABLE workflow_user ADD COLUMN IF NOT EXISTS segment_id INTEGER;
