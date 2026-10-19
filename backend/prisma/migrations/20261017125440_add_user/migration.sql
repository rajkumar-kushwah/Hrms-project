-- AddForeignKey
ALTER TABLE "EmployeeDocumentVerification" ADD CONSTRAINT "EmployeeDocumentVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
