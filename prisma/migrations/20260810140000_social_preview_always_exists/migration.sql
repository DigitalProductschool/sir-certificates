-- AlterTable
ALTER TABLE "social_previews" ALTER COLUMN "contentType" DROP NOT NULL;

-- Backfill: every existing Program should have a SocialPreview row, even
-- with no background image configured yet. This is additive-only (never
-- touches existing rows) and can't violate the programId FK/unique
-- constraints since it only inserts programId values taken from programs.id.
INSERT INTO "social_previews" ("programId", "layout", "updatedAt")
SELECT p.id, '{}'::jsonb, CURRENT_TIMESTAMP
FROM "programs" p
LEFT JOIN "social_previews" sp ON sp."programId" = p.id
WHERE sp."programId" IS NULL
ON CONFLICT ("programId") DO NOTHING;
