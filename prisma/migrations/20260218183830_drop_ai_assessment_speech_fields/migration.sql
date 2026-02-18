/*
  Warnings:

  - You are about to drop the column `answer_relevance` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `clarity` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `confidence_score` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `speech_analysis` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `speech_llm_output` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `total_score` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `video_score` on the `ai_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `tag_needs_review` on the `candidate_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_assessments" DROP COLUMN "answer_relevance",
DROP COLUMN "clarity",
DROP COLUMN "confidence_score",
DROP COLUMN "speech_analysis",
DROP COLUMN "speech_llm_output",
DROP COLUMN "total_score",
DROP COLUMN "video_score";

-- AlterTable
ALTER TABLE "candidate_applications" DROP COLUMN "tag_needs_review";
