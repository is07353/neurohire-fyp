/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `recruiters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_id]` on the table `recruiters` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "recruiters" ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_username_key" ON "recruiters"("username");

-- CreateIndex
CREATE UNIQUE INDEX "recruiters_employee_id_key" ON "recruiters"("employee_id");

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE ON UPDATE CASCADE;
