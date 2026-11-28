-- CreateEnum
CREATE TYPE "EmployeeUpgradeType" AS ENUM ('PROMOTION', 'INCREMENT', 'TRANSFER', 'ROLE_CHANGE');

-- CreateEnum
CREATE TYPE "EmployeeUpgradeStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SENT_BACK', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UpgradeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SENT_BACK', 'SKIPPED');

-- CreateTable
CREATE TABLE "EmployeeUpgrade" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "upgradeType" "EmployeeUpgradeType" NOT NULL,
    "status" "EmployeeUpgradeStatus" NOT NULL DEFAULT 'DRAFT',
    "currentData" JSONB NOT NULL,
    "proposedData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpgradeApproval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "upgradeId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "UpgradeApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCareerHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "upgradeId" TEXT,
    "createdById" TEXT NOT NULL,
    "changeType" "EmployeeUpgradeType" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCareerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeUpgrade_companyId_status_idx" ON "EmployeeUpgrade"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmployeeUpgrade_employeeId_idx" ON "EmployeeUpgrade"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeUpgrade_effectiveDate_idx" ON "EmployeeUpgrade"("effectiveDate");

-- CreateIndex
CREATE INDEX "UpgradeApproval_companyId_approverId_status_idx" ON "UpgradeApproval"("companyId", "approverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UpgradeApproval_upgradeId_sequence_key" ON "UpgradeApproval"("upgradeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCareerHistory_upgradeId_key" ON "EmployeeCareerHistory"("upgradeId");

-- CreateIndex
CREATE INDEX "EmployeeCareerHistory_companyId_employeeId_effectiveDate_idx" ON "EmployeeCareerHistory"("companyId", "employeeId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "EmployeeUpgrade" ADD CONSTRAINT "EmployeeUpgrade_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeUpgrade" ADD CONSTRAINT "EmployeeUpgrade_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeUpgrade" ADD CONSTRAINT "EmployeeUpgrade_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApproval" ADD CONSTRAINT "UpgradeApproval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApproval" ADD CONSTRAINT "UpgradeApproval_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "EmployeeUpgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeApproval" ADD CONSTRAINT "UpgradeApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCareerHistory" ADD CONSTRAINT "EmployeeCareerHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCareerHistory" ADD CONSTRAINT "EmployeeCareerHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCareerHistory" ADD CONSTRAINT "EmployeeCareerHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCareerHistory" ADD CONSTRAINT "EmployeeCareerHistory_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "EmployeeUpgrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
