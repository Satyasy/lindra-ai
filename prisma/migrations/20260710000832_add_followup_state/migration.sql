-- AlterTable
ALTER TABLE "Followup" ADD COLUMN     "followUpFlaggedAt" TIMESTAMP(3),
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'kabar';
