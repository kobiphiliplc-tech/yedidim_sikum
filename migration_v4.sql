-- migration_v4.sql
-- Add sort_order to events to preserve insertion order within a batch
-- (batch inserts share the same created_at, so a secondary sort key is needed)

ALTER TABLE events ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
