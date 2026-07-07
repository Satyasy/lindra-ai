import { prisma } from "@/lib/prisma";
import { ReportCard } from "@/components/bk/ReportCard";
import { Inbox } from "lucide-react";

export default async function DashboardPage() {
  // Filter lewat RoutingLog, bukan semua Report — laporan dengan pelaku guru-staf
  // dirutekan ke satgas-eksternal dan secara struktural TIDAK PERNAH muncul di sini
  const reports = await prisma.report.findMany({
    where: { routingLogs: { some: { destination: "dashboard-bk" } } },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Laporan masuk</h1>
      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Inbox className="size-8" aria-hidden />
          <p className="text-sm">Belum ada laporan yang dirutekan ke BK.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
