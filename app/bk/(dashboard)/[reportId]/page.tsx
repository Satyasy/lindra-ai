import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  FileText,
  History,
  ListChecks,
  MessageSquare,
  Route,
  User,
  Zap,
} from "lucide-react";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";
import { recommendArticles } from "@/lib/ai/recommend-policy";
import { ROUTE_REASON, type RouteDestination } from "@/lib/routing/routing-engine";
import { cn } from "@/lib/utils";
import { StatusSelect } from "@/components/bk/StatusSelect";
import { IdentityReveal } from "@/components/bk/IdentityReveal";
import { TindakLanjutButton } from "@/components/bk/TindakLanjutButton";
import { DEST_BADGE, HANDLING_LABEL } from "@/components/bk/handling";
import { SchoolScene } from "@/components/illustrations";

const STATUS_LABEL: Record<string, string> = {
  terkirim: "Baru masuk",
  ditinjau: "Sedang ditinjau",
  selesai: "Selesai",
};

// Panel urgensi: warna cerah HANYA di sini. Alasan/note = konteks prioritas penanganan,
// BUKAN penilaian salah/benar atau kredibilitas pelapor.
type Tone = "danger" | "warm" | "primary";
const URGENCY: Record<string, { label: string; tone: Tone; chip: string; reason: string; note: string | null }> = {
  kritis: {
    label: "Kritis", tone: "danger", chip: "bg-danger-soft text-danger-deep",
    reason: "Prioritas kritis — ada indikasi keadaan darurat atau risiko keselamatan langsung.",
    note: "Butuh eskalasi cepat sekarang.",
  },
  tinggi: {
    label: "Tinggi", tone: "danger", chip: "bg-danger-soft text-danger-deep",
    reason: "Prioritas tinggi karena berpotensi mengganggu keamanan emosional siswa.",
    note: "Segera tindak lanjuti untuk mencegah dampak lebih lanjut.",
  },
  sedang: {
    label: "Sedang", tone: "warm", chip: "bg-warm-soft text-warm-deep",
    reason: "Prioritas sedang — perlu ditinjau, namun tidak mendesak.",
    note: "Jadwalkan tindak lanjut dalam waktu dekat.",
  },
  rendah: {
    label: "Rendah", tone: "primary", chip: "bg-primary-soft text-primary-ink",
    reason: "Prioritas rendah — pantau bila ada perkembangan baru.",
    note: null,
  },
};

const TONE_CLS: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger-deep",
  warm: "bg-warm-soft text-warm-deep",
  primary: "bg-primary-soft text-primary-ink",
};

// Riwayat aktivitas — label dari AuditLog action NYATA (tak mengarang entri)
function auditLabel(action: string, metadata: unknown): string {
  const m = (metadata ?? {}) as { status?: string; handlingStatus?: string; assignedToId?: string | null };
  switch (action) {
    case "created": return "Laporan dibuat";
    case "sent": return "Laporan dikirim";
    case "opened": return "Laporan dibuka";
    case "status-changed":
      if (m.handlingStatus) return `Penanganan diubah → ${HANDLING_LABEL[m.handlingStatus] ?? m.handlingStatus}`;
      return `Status diubah → ${STATUS_LABEL[m.status ?? ""] ?? m.status ?? "?"}`;
    case "assigned":
      return m.assignedToId ? "Petugas ditugaskan" : "Penugasan petugas dilepas";
    case "identity-opened": return "Identitas pelapor dibuka";
    default: return action;
  }
}

function Section({
  title,
  icon: Icon,
  tone = "primary",
  className,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-soft)]", className)}>
      <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-ink">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", TONE_CLS[tone])}>
          <Icon className="size-4" strokeWidth={2} aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const session = await auth();
  const myDestination = staffRole(session) === "satgas" ? "satgas-eksternal" : "dashboard-bk";

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { routingLogs: true, referralCode: true, followups: true },
  });
  // Staf hanya boleh membuka laporan yang memang dirutekan ke antreannya
  const myLog = report?.routingLogs.find((l) => l.destination === myDestination);
  if (!report || !myLog) notFound();

  // Catat pembukaan pertama saja — chain of custody (DESIGN.md §3.2)
  let openedAt = myLog.openedAt;
  if (!openedAt) {
    openedAt = new Date();
    await prisma.routingLog.update({ where: { id: myLog.id }, data: { openedAt } });
    await logAction(reportId, session?.user?.email ?? "staff", "opened");
  }

  const [recommendations, audits] = await Promise.all([
    recommendArticles(report.narrative ?? ""),
    prisma.auditLog.findMany({ where: { reportId }, orderBy: { createdAt: "asc" } }),
  ]);

  const urg = URGENCY[report.urgencyLevel ?? "rendah"] ?? URGENCY.rendah;
  // Sinyal follow-up (informatif) — bukan Lindra mengambil alih peran BK
  const noProgress = report.followups.reduce((n, f) => Math.max(n, f.noProgressCount), 0);

  // Timeline penanganan — semua dari data NYATA (createdAt, openedAt, status)
  const steps = [
    { label: "Diterima", done: true, at: report.createdAt },
    { label: "Ditinjau", done: true, at: openedAt },
    { label: "Ditindaklanjuti", done: report.status === "ditinjau" || report.status === "selesai", at: null },
    { label: "Selesai", done: report.status === "selesai", at: report.status === "selesai" ? report.updatedAt : null },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Action bar: Kembali + status dropdown (set status bebas) */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/bk"
          className="flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary-soft"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
          Kembali
        </Link>
        <StatusSelect reportId={report.id} status={report.status} />
      </div>

      {/* Header tunggal: ikon status + kode + tanggal + badge status + SchoolScene */}
      <div className="relative mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-7">
        <div className="relative flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft">
            <FileText className="size-6 text-primary-ink" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-ink">
              {STATUS_LABEL[report.status] ?? report.status}
            </span>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wide text-ink">
              {report.referralCode?.code ?? report.id.slice(-6)}
            </p>
            <p className="mt-1 text-sm text-text-soft">
              Masuk {report.createdAt.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>
        <SchoolScene className="pointer-events-none absolute -bottom-2 right-4 hidden w-40 sm:block" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* KONTEN UTAMA — kiri 8/12 */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Narasi laporan" icon={MessageSquare}>
            <p className="text-[1.0625rem] leading-[1.7] whitespace-pre-wrap text-text">
              {report.narrative ?? "(belum tersusun)"}
            </p>
          </Section>

          <Section title="Timeline penanganan" icon={ListChecks}>
            <ol className="flex items-start">
              {steps.map((s, i) => (
                <li key={s.label} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : steps[i - 1].done ? "bg-primary" : "bg-border")} />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        s.done ? "bg-primary text-ink" : "border-2 border-border bg-surface"
                      )}
                    >
                      {s.done ? (
                        <Check className="size-4" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <span className="size-2 rounded-full bg-text-muted" />
                      )}
                    </span>
                    <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "opacity-0" : s.done ? "bg-primary" : "bg-border")} />
                  </div>
                  <span className="mt-2 text-xs font-medium text-ink">{s.label}</span>
                  {s.at && (
                    <span className="text-[0.6875rem] text-text-muted">
                      {s.at.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Riwayat aktivitas" icon={History}>
            {audits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
            ) : (
              <ol className="space-y-3">
                {audits.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-deep" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{auditLabel(a.action, a.metadata)}</p>
                      <p className="text-[0.75rem] text-text-muted">
                        {a.actor} · {a.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Rute laporan" icon={Route}>
            <div className="space-y-3">
              {report.routingLogs.map((log) => {
                const dest = DEST_BADGE[log.destination];
                return (
                  <div key={log.id}>
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", dest?.cls ?? "")}>
                      {dest?.label ?? log.destination}
                    </span>
                    <p className="mt-1.5 text-sm text-text-soft">
                      {ROUTE_REASON[log.destination as RouteDestination]}
                    </p>
                  </div>
                );
              })}
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-surface-alt p-3 text-[0.8125rem] text-text-soft">
                <Check className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden />
                <span>
                  Rute ditentukan aturan business logic yang bisa diaudit — bukan keputusan AI, dan
                  bukan rekomendasi yang perlu disetujui.
                </span>
              </div>
            </div>
          </Section>

          <Section title="Rekomendasi pasal tata tertib" icon={BookOpen}>
            {recommendations.length === 0 ? (
              <p className="text-muted-foreground">
                Tidak ditemukan pasal yang relevan. Rekomendasi hanya muncul bila ada kutipan asli
                dari dokumen tata tertib — sistem tidak pernah mengarang kecocokan.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <blockquote key={rec.chunkId} className="border-l-2 border-primary pl-3">
                    <p className="italic">&ldquo;{rec.quote}&rdquo;</p>
                    <p className="mt-1 text-sm text-text-soft">{rec.reasoning}</p>
                  </blockquote>
                ))}
              </div>
            )}
            <p className="mt-3 text-[0.8125rem] text-muted-foreground">
              Kutipan + alasan, bukan angka final — penilaian konteks dan keputusan tetap di tangan
              staf.
            </p>
          </Section>
        </div>

        {/* SIDEBAR — kanan 4/12, sticky */}
        <div className="space-y-6 lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
          <Section title="Urgensi" icon={AlertCircle} tone={urg.tone}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex rounded-full px-3.5 py-1.5 text-lg font-bold", urg.chip)}>
                {urg.label}
              </span>
              {report.urgentVisum && (
                <span className="inline-flex rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
                  visum urgent
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">{urg.reason}</p>
            {urg.note && (
              <div className={cn("mt-3 flex items-start gap-2 rounded-[var(--radius-md)] p-3 text-sm", TONE_CLS[urg.tone])}>
                <Bell className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{urg.note}</span>
              </div>
            )}
            {noProgress > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-warm-soft p-3 text-sm text-warm-deep">
                <Bell className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>Siswa mulai resah — belum ada progres ×{noProgress}.</span>
              </div>
            )}
          </Section>

          <Section title="Identitas pelapor" icon={User}>
            {!report.isAnonymous && report.identityData ? (
              <IdentityReveal reportId={report.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Anonim — siswa memilih tidak membuka identitas.
              </p>
            )}
          </Section>

          {/* Panel aksi — bg dibedakan dari panel info; sticky ikut sidebar */}
          <Section title="Aksi cepat" icon={Zap} className="bg-surface-alt">
            <div className="space-y-2.5">
              <TindakLanjutButton reportId={report.id} status={report.status} />
              {/* ponytail: fitur ditunda (DESIGN.md §8) — stub disabled, bukan bangun dari nol */}
              <button
                type="button"
                disabled
                title="Segera hadir"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-border px-4 text-sm font-semibold text-text-soft disabled:cursor-not-allowed"
              >
                <MessageSquare className="size-4" aria-hidden />
                Catat internal · Segera hadir
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
