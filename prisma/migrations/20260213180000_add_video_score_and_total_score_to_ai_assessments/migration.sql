-- AlterTable
-- Add video_score (application-level video analysis score) and total_score (average of cv_score and video_score) to ai_assessments.
ALTER TABLE "ai_assessments" ADD COLUMN "video_score" INTEGER,
ADD COLUMN "total_score" INTEGER;

-- Optional: backfill total_score where both cv_score and video_score are set (total_score = average of the two)
UPDATE "ai_assessments"
SET "total_score" = ROUND(("cv_score" + "video_score") / 2.0)
WHERE "cv_score" IS NOT NULL AND "video_score" IS NOT NULL;
