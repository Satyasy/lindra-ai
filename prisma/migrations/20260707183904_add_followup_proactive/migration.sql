-- AlterTable
ALTER TABLE "Followup" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "escalated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCheckinAt" TIMESTAMP(3),
ADD COLUMN     "noProgressCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proactiveEnabled" BOOLEAN NOT NULL DEFAULT false;
