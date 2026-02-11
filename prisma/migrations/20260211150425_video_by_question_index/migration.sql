-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'REMOTE');

-- CreateTable
CREATE TABLE "admins" (
    "admin_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "ai_assessments" (
    "assessment_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "total_score" INTEGER,
    "ai_recommendation" TEXT,
    "reason_summary" TEXT,

    CONSTRAINT "ai_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "application_id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tag_needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "candidate_logs" (
    "log_id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "candidate_id" SERIAL NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "cv_data" (
    "cv_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "cv_text" TEXT NOT NULL,
    "parsed_keywords" TEXT NOT NULL,
    "technical_score" INTEGER,
    "cv_url" TEXT,
    "cv_file_key" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_data_pkey" PRIMARY KEY ("cv_id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "error_id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "error_message" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("error_id")
);

-- CreateTable
CREATE TABLE "job_questions" (
    "question_id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "job_id" SERIAL NOT NULL,
    "recruiter_id" INTEGER NOT NULL,
    "job_title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL DEFAULT '',
    "branch_name" TEXT NOT NULL DEFAULT '',
    "job_description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibility_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimum_experience_years" INTEGER NOT NULL DEFAULT 0,
    "other_requirements" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "work_mode" "WorkMode" NOT NULL DEFAULT 'REMOTE',
    "salary_monthly_pkr" INTEGER NOT NULL DEFAULT 0,
    "cv_score_weightage" INTEGER NOT NULL DEFAULT 50,
    "video_score_weightage" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "recruiter_decisions" (
    "decision_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "recruiter_id" INTEGER NOT NULL,
    "final_decision" TEXT,
    "overrode_ai" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "decision_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_decisions_pkey" PRIMARY KEY ("decision_id")
);

-- CreateTable
CREATE TABLE "recruiter_logs" (
    "log_id" SERIAL NOT NULL,
    "recruiter_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "recruiters" (
    "recruiter_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'recruiter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiters_pkey" PRIMARY KEY ("recruiter_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "setting_id" SERIAL NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("setting_id")
);

-- CreateTable
CREATE TABLE "video_submissions" (
    "video_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "question_index" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "video_file_key" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audio_transcript" TEXT,
    "video_score" INTEGER,
    "quality_flag" TEXT,

    CONSTRAINT "video_submissions_pkey" PRIMARY KEY ("video_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ai_assessments_application_id_key" ON "ai_assessments"("application_id");

-- CreateIndex
CREATE INDEX "ai_assessments_application_id_idx" ON "ai_assessments"("application_id");

-- CreateIndex
CREATE INDEX "candidate_applications_candidate_id_job_id_idx" ON "candidate_applications"("candidate_id", "job_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_data_application_id_key" ON "cv_data"("application_id");

-- CreateIndex
CREATE INDEX "cv_data_application_id_idx" ON "cv_data"("application_id");

-- CreateIndex
CREATE INDEX "jobs_recruiter_id_idx" ON "jobs"("recruiter_id");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_decisions_application_id_key" ON "recruiter_decisions"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_email_key" ON "recruiters"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");

-- CreateIndex
CREATE INDEX "video_submissions_application_id_idx" ON "video_submissions"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_submissions_application_id_question_index_key" ON "video_submissions"("application_id", "question_index");

-- AddForeignKey
ALTER TABLE "ai_assessments" ADD CONSTRAINT "ai_assessments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_logs" ADD CONSTRAINT "candidate_logs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_data" ADD CONSTRAINT "cv_data_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_questions" ADD CONSTRAINT "job_questions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("recruiter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_decisions" ADD CONSTRAINT "recruiter_decisions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_decisions" ADD CONSTRAINT "recruiter_decisions_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("recruiter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_logs" ADD CONSTRAINT "recruiter_logs_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("recruiter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_submissions" ADD CONSTRAINT "video_submissions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;
