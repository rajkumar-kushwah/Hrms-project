/*
  Warnings:

  - You are about to drop the `EmployeeDocumentVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmployeeDocumentVerification" DROP CONSTRAINT "EmployeeDocumentVerification_userId_fkey";

-- DropTable
DROP TABLE "EmployeeDocumentVerification";

-- DropEnum
DROP TYPE "VerificationDocumentType";

-- DropEnum
DROP TYPE "VerificationStatus";
