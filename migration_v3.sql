-- migration_v3.sql
-- Add display_order to categories for custom sort order in weekly report

ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order integer;

-- Initialize existing rows: assign order based on current alphabetical sort within each type
UPDATE categories c
SET display_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY name) AS rn
  FROM categories
) sub
WHERE c.id = sub.id;
