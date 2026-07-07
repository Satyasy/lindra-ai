import Link from "next/link";
import { Inbox, RefreshCw } from "lucide-react";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportCard } from "@/components/bk/ReportCard";

const URGENCY_ORDER: Record<string, number> = { kritis: 0, tinggi: 1, sedang: 2, rendah: 3 };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showDone = tab === "selesai";
  const session = await auth();
  // BK melihat tujuan dashboard-bk, Satgas melihat satgas-eksternal —
  // kasus pelaku guru-staf secara struktural tak pernah tampil ke BK (bypass by design)
  const destination = staffRole(session) === "satgas" ? "satgas-eksternal" : "dashboard-bk";

  const reports = (
    await prisma.report.findMany({
      where: {
        routingLogs: { some: { destination } },
        status: showDone ? "selesai" : { not: "selesai" },
      },
      orderBy: { createdAt: "desc" },
    })
  ).sort(
    (a, b) => (URGENCY_ORDER[a.urgencyLevel ?? ""] ?? 9) - (URGENCY_ORDER[b.urgencyLevel ?? ""] ?? 9)
  );

  const counts = await prisma.report.groupBy({
    by: ["status"],
    where: { routingLogs: { some: { destination } } },
    _count: true,
  });
  const doneCount = counts.find((c) => c.status === "selesai")?._count ?? 0;
  const activeCount = counts.reduce((n, c) => n + (c.status === "selesai" ? 0 : c._count), 0);

  const tabCls = (active: boolean) =>
    `border-b-2 px-1 pb-2 text-sm font-semibold ${
      active
        ? "border-primary-ink text-primary-ink"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sticky top-0 z-10 -mx-6 mb-5 flex items-center justify-between bg-background/95 px-6 pb-3 pt-2 backdrop-blur-none">
        <h1 className="text-xl">Antrean Laporan</h1>
        <Link
          href={showDone ? "/bk?tab=selesai" : "/bk"}
          className="flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold text-primary-ink hover:bg-primary-soft"
        >
          <RefreshCw className="size-4" strokeWidth={2} aria-hidden />
          Refresh
        </Link>
      </div>

      <div className="mb-6 flex gap-6 border-b">
        <Link href="/bk" className={tabCls(!showDone)}>
          Kasus Aktif ({activeCount})
        </Link>
        <Link href="/bk?tab=selesai" className={tabCls(showDone)}>
          Riwayat Selesai ({doneCount})
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed py-16 text-muted-foreground">
          <Inbox className="size-8" strokeWidth={1.5} aria-hidden />
          <p className="text-sm">Belum ada laporan pada tab ini.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} destination={destination} />
          ))}
        </div>
      )}
    </div>
  );
}
