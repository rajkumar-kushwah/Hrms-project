-- AlterTable
ALTER TABLE "OnboardingChecklistItem" ADD COLUMN     "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
