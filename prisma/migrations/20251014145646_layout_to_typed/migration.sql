BEGIN;

-- 1) Add new column
ALTER TABLE "templates" ADD COLUMN layout_arr jsonb[];

-- 2) Fill it (row-by-row, no subquery in ALTER)
UPDATE "templates"
SET layout_arr = COALESCE(
  (SELECT array_agg(e) FROM jsonb_array_elements(layout) AS e),
  '{}'::jsonb[]
);

-- 3) Drop old and rename
ALTER TABLE "templates" DROP COLUMN layout;
ALTER TABLE "templates" RENAME COLUMN layout_arr TO layout;

COMMIT;
