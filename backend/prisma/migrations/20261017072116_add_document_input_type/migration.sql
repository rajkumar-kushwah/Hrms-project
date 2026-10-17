-- CreateEnum
CREATE TYPE "DocumentInputType" AS ENUM ('FILE_UPLOAD', 'DOCUMENT_NUMBER', 'EITHER');

-- AlterTable
ALTER TABLE "OnboardingChecklistItem" ADD COLUMN     "documentInputType" "DocumentInputType",
ADD COLUMN     "documentNumber" TEXT;

-- AlterTable
ALTER TABLE "OnboardingChecklistTemplate" ADD COLUMN     "documentInputType" "DocumentInputType";
