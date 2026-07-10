import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QueueTable } from "@/components/bk/QueueTable";
import { QueueToolbar } from "@/components/bk/QueueToolbar";
import type { QueueRowData } from "@/components/bk/QueueRow";

const URGENCY_ORDER: Record<string, number> = { kritis: 0, tinggi: 1, sedang: 2, rendah: 3 };
const PAGE_SIZE = 5;

const wibDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const wibTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", hour12: false });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const showDone = sp.tab === "selesai";
  const session = await auth();
  const role = staffRole(session);
  // Filter keamanan: BK hanya lihat dashboard-bk, Satgas hanya satgas-eksternal.
  // Kasus guru-staf/orangtua-wali dirutekan ke luar → tak pernah tampil di antrean BK.
  const destination = role === "satgas" ? "satgas-eksternal" : "dashboard-bk";

  const where: Prisma.ReportWhereInput = {
    routingLogs: { some: { destination } },
    status: showDone ? "selesai" : { not: "selesai" },
  };
  if (sp.risiko) where.urgencyLevel = sp.risiko;
  if (sp.penanganan) where.handlingStatus = sp.penanganan;
  if (sp.petugas) where.assignedToId = sp.petugas === "unassigned" ? null : sp.petugas;
  if (sp.q) {
    where.OR = [
      { narrative: { contains: sp.q, mode: "insensitive" } },
      { referralCode: { code: { contains: sp.q, mode: "insensitive" } } },
    ];
  }

  const [all, staff, counts] = await Promise.all([
    prisma.report.findMany({
      where,
      // Urutan sekunder deterministik (terbaru dulu) — tanpa ini, baris dengan urgensi
      // sama acak posisinya & meloncat antar-halaman setiap kali di-update.
      orderBy: { createdAt: "desc" },
      include: {
        referralCode: true,
        chatThreads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        // W5: sinyal "perlu tindak lanjut" (user konfirmasi "Iya") + kemandekan admin.
        followups: { select: { followUpFlaggedAt: true, noProgressCount: true } },
      },
    }),
    prisma.staffAccount.findMany({ where: { role }, orderBy: { name: "asc" } }),
    // Hitungan tab pakai filter destination saja (bukan filter aktif) — total antrean.
    prisma.report.groupBy({
      by: ["status"],
      where: { routingLogs: { some: { destination } } },
      _count: true,
    }),
  ]);

  // Urutan triase (W5): (1) kasus ter-flag user di atas yang tidak; (2) di antara ter-flag,
  // PALING LAMA MANDEK dulu (noProgressCount desc, lalu flag paling tua) — kegagalan yang
  // paling ingin ditangkap; (3) urgensi tertinggi. LALU paginasi. ponytail: sort di app
  // cukup untuk skala antrean sekolah; pindah ke urutan DB kalau data membesar.
  const flagOf = (r: (typeof all)[number]) => r.followups.find((f) => f.followUpFlaggedAt);
  const sorted = all.sort((a, b) => {
    const fa = flagOf(a);
    const fb = flagOf(b);
    if (!!fa !== !!fb) return fa ? -1 : 1;
    if (fa && fb) {
      if (fb.noProgressCount !== fa.noProgressCount) return fb.noProgressCount - fa.noProgressCount;
      const ta = fa.followUpFlaggedAt!.getTime();
      const tb = fb.followUpFlaggedAt!.getTime();
      if (ta !== tb) return ta - tb; // flag lebih tua (mandek lebih lama) di atas
    }
    return (URGENCY_ORDER[a.urgencyLevel ?? ""] ?? 9) - (URGENCY_ORDER[b.urgencyLevel ?? ""] ?? 9);
  });
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const start = (page - 1) * PAGE_SIZE;

  const rows: QueueRowData[] = sorted.slice(start, start + PAGE_SIZE).map((r) => {
    const messages = r.chatThreads
      .flatMap((t) => t.messages)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // "belum dibaca" = pesan siswa setelah balasan staf terakhir (tanpa kolom readAt)
    let lastStaff = -1;
    messages.forEach((m, i) => {
      if (m.sender === "staff") lastStaff = i;
    });
    const unread = messages.slice(lastStaff + 1).filter((m) => m.sender === "student").length;
    const fu = r.followups.find((f) => f.followUpFlaggedAt);
    return {
      id: r.id,
      code: r.referralCode?.code ?? r.id.slice(-6),
      urgency: r.urgencyLevel ?? "rendah",
      narrative: r.narrative ?? "(narasi belum tersusun)",
      dateLabel: `${wibDate(r.createdAt)}\n${wibTime(r.createdAt)}`,
      urgentVisum: r.urgentVisum,
      assignedToId: r.assignedToId,
      handlingStatus: r.handlingStatus,
      unread,
      flaggedAt: fu?.followUpFlaggedAt?.toISOString() ?? null,
      noProgress: fu?.noProgressCount ?? 0,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        timeLabel: wibTime(m.createdAt),
      })),
    };
  });

  const staffOpts = staff.map((s) => ({ id: s.id, name: s.name }));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const doneCount = countOf("selesai");
  const activeCount = counts.reduce((n, c) => n + (c.status === "selesai" ? 0 : c._count), 0);

  const tabCls = (active: boolean) =>
    `inline-flex min-h-11 items-end border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
      active ? "border-primary-ink text-primary-ink" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // Link paginasi — pertahankan filter/search aktif, ganti page.
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") u.set(k, v);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/bk?${s}` : "/bk";
  };
  const pageBtn = "flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-border text-sm font-medium transition-colors";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-[length:var(--t-h1)]">Antrean Laporan</h1>
        <Link
          href={showDone ? "/bk?tab=selesai" : "/bk"}
          className="flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary-soft"
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

      <QueueToolbar staff={staffOpts} />

      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed py-16 text-muted-foreground">
          <Inbox className="size-8" strokeWidth={1.5} aria-hidden />
          <p className="text-sm">Belum ada laporan pada tab ini.</p>
        </div>
      ) : (
        <>
          <QueueTable rows={rows} staff={staffOpts} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-soft">
            <span>
              Menampilkan {start + 1}–{Math.min(start + PAGE_SIZE, total)} dari {total} kasus
            </span>
            <nav className="flex items-center gap-1" aria-label="Paginasi">
              {page > 1 ? (
                <Link href={qs(page - 1)} aria-label="Halaman sebelumnya" className={`${pageBtn} text-primary-ink hover:bg-primary-soft`}>
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              ) : (
                <span aria-disabled className={`${pageBtn} text-text-muted opacity-40`}>
                  <ChevronLeft className="size-4" aria-hidden />
                </span>
              )}
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={qs(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`${pageBtn} ${p === page ? "border-primary-ink bg-primary-ink font-bold text-white" : "text-ink hover:bg-primary-soft"}`}
                >
                  {p}
                </Link>
              ))}
              {page < pageCount ? (
                <Link href={qs(page + 1)} aria-label="Halaman berikutnya" className={`${pageBtn} text-primary-ink hover:bg-primary-soft`}>
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <span aria-disabled className={`${pageBtn} text-text-muted opacity-40`}>
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
