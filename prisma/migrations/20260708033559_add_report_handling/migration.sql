-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "handlingStatus" TEXT NOT NULL DEFAULT 'belum-diassign';

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "StaffAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
