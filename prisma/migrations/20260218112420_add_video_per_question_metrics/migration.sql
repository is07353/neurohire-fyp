-- AlterTable
ALTER TABLE "video_submissions" ADD COLUMN     "answer_relevance" INTEGER,
ADD COLUMN     "clarity" INTEGER,
ADD COLUMN     "confidence_score" INTEGER,
ADD COLUMN     "speech_analysis" TEXT,
ADD COLUMN     "video_score" INTEGER;
