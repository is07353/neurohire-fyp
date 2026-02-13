-- Resolve drift: align jobs table with schema (no data loss).
-- Safe to run on DB that was updated manually: uses IF EXISTS and USING.

-- Remove eligibility_text if it still exists (e.g. from an older migration state)
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "eligibility_text";

-- Ensure job_description is JSONB (works whether column is currently TEXT or JSONB)
ALTER TABLE "jobs"
  ALTER COLUMN "job_description" TYPE JSONB
  USING "job_description"::text::jsonb;
