-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OWN', 'COMPANY', 'ALL');

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "canPermanentDelete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataScope" "DataScope" NOT NULL DEFAULT 'OWN';
