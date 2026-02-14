-- Add speech/video LLM output columns to ai_assessments: confidence_score, clarity, answer_relevance, speech_analysis, speech_llm_output.
ALTER TABLE "ai_assessments" ADD COLUMN "confidence_score" INTEGER;
ALTER TABLE "ai_assessments" ADD COLUMN "clarity" INTEGER;
ALTER TABLE "ai_assessments" ADD COLUMN "answer_relevance" INTEGER;
ALTER TABLE "ai_assessments" ADD COLUMN "speech_analysis" TEXT;
ALTER TABLE "ai_assessments" ADD COLUMN "speech_llm_output" JSONB;
