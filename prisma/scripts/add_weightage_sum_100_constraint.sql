-- CV and Video score weightage are percentage parts that must sum to 100 (e.g. 75% + 25% = 100%).
-- This constraint enforces that at the DBMS level.

-- Fix any existing rows that don't sum to 100 (set to 50/50)
UPDATE jobs
SET cv_score_weightage = 50, video_score_weightage = 50
WHERE cv_score_weightage + video_score_weightage != 100;

-- Add the check constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_cv_video_weightage_sum_100'
  ) THEN
    ALTER TABLE jobs
    ADD CONSTRAINT jobs_cv_video_weightage_sum_100
    CHECK (cv_score_weightage + video_score_weightage = 100);
  END IF;
END $$;
