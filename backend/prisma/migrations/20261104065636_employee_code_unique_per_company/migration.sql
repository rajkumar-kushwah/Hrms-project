/*
  Warnings:

  - A unique constraint covering the columns `[companyId,employeeCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_employeeCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_employeeCode_key" ON "User"("companyId", "employeeCode");
