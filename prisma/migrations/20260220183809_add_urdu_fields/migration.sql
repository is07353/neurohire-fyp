-- AlterTable
ALTER TABLE "job_questions" ADD COLUMN     "question_text_ur" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "job_description_ur" TEXT,
ADD COLUMN     "job_title_ur" TEXT;
