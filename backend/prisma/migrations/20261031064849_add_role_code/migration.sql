/*
  Warnings:

  - A unique constraint covering the columns `[code,companyId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_companyId_key" ON "Role"("code", "companyId");
