-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "branch_name_ur" TEXT,
ADD COLUMN     "company_name_ur" TEXT,
ADD COLUMN     "location_ur" TEXT,
ADD COLUMN     "minimum_experience_ur" TEXT,
ADD COLUMN     "other_requirements_ur" TEXT,
ADD COLUMN     "salary_monthly_ur" TEXT,
ADD COLUMN     "skills_ur" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "work_mode_ur" TEXT;
