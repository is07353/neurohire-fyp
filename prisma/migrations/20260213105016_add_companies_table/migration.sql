-- CreateTable
CREATE TABLE "companies" (
    "company_id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_description" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "website_url" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_person_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_contact_email_key" ON "companies"("contact_email");
