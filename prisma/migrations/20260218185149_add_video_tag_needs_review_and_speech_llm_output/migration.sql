-- AlterTable
ALTER TABLE "video_submissions" ADD COLUMN     "speech_llm_output" JSONB,
ADD COLUMN     "tag_needs_review" BOOLEAN NOT NULL DEFAULT false;
