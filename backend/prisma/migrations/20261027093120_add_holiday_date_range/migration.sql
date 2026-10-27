-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "date" DROP NOT NULL;
