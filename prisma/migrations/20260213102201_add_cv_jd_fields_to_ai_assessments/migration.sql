/*
  Warnings:

  - You are about to drop the column `ai_recommendation` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `reason_summary` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `total_score` on the `ai_assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_assessments" DROP COLUMN "ai_recommendation",
DROP COLUMN "reason_summary",
DROP COLUMN "total_score",
ADD COLUMN     "cv_jd_output" JSONB,
ADD COLUMN     "cv_matching_analysis" TEXT,
ADD COLUMN     "cv_reason_summary" TEXT,
ADD COLUMN     "cv_recommendation" TEXT,
ADD COLUMN     "cv_score" INTEGER;
