-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('PAN', 'AADHAAR', 'BANK_ACCOUNT', 'OTHER');

-- CreateTable
CREATE TABLE "EmployeeDocumentVerification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "VerificationDocumentType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "provider" TEXT,
    "providerReference" TEXT,
    "maskedIdentifier" TEXT,
    "documentUrl" TEXT,
    "consentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocumentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeDocumentVerification_companyId_userId_idx" ON "EmployeeDocumentVerification"("companyId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentVerification_userId_documentType_status_idx" ON "EmployeeDocumentVerification"("userId", "documentType", "status");
