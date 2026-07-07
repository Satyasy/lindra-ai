import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";
import { recommendArticles } from "@/lib/ai/recommend-policy";
import { ROUTE_REASON, type RouteDestination } from "@/lib/routing/routing-engine";
import { Badge } from "@/components/ui/badge";
import { StatusSelect } from "@/components/bk/StatusSelect";
import { IdentityReveal } from "@/components/bk/IdentityReveal";
import { DEST_BADGE } from "@/components/bk/ReportCard";

const URGENCY_STYLE: Record<string, string> = {
  kritis: "bg-danger-soft text-danger",
  tinggi: "bg-danger-soft text-danger",
  sedang: "bg-warm-soft text-warm-deep",
  rendah: "bg-primary-soft text-primary-ink",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
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
    include: { routingLogs: true, referralCode: true },
  });
  // Staf hanya boleh membuka laporan yang memang dirutekan ke antreannya
  const myLog = report?.routingLogs.find((l) => l.destination === myDestination);
  if (!report || !myLog) notFound();

  // Catat pembukaan pertama saja — refresh tidak membanjiri audit trail
  if (!myLog.openedAt) {
    await prisma.routingLog.update({ where: { id: myLog.id }, data: { openedAt: new Date() } });
    await logAction(reportId, session?.user?.email ?? "staff", "opened");
  }

  const recommendations = await recommendArticles(report.narrative ?? "");

  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/bk" className="text-primary-ink hover:underline">
          Antrean
        </Link>{" "}
        › #{report.referralCode?.code ?? report.id.slice(-6)}
      </nav>

      <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between gap-3 bg-background/95 px-6 py-3">
        <Link
          href="/bk"
          className="flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold text-primary-ink hover:bg-primary-soft"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
          Kembali
        </Link>
        <StatusSelect reportId={report.id} status={report.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Rail sticky kiri */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
            <p className="font-mono text-lg font-semibold tracking-widest text-primary-ink">
              {report.referralCode?.code ?? "-"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk{" "}
              {report.createdAt.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </p>
            <Badge variant="outline" className="mt-3">
              {report.status}
            </Badge>
          </div>
          <div className="rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
            <p className="mb-2 text-sm font-semibold">Urgensi</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={`border-transparent ${URGENCY_STYLE[report.urgencyLevel ?? "rendah"]}`}>
                {report.urgencyLevel ?? "belum terklasifikasi"}
              </Badge>
              {report.urgentVisum && (
                <Badge className="border-transparent bg-danger text-white">visum urgent</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Body kanan */}
        <div className="space-y-4">
          <Section title="Narasi laporan">
            <p className="leading-[1.65] whitespace-pre-wrap">{report.narrative ?? "(belum tersusun)"}</p>
          </Section>

          <Section title="Identitas pelapor">
            {!report.isAnonymous && report.identityData ? (
              <IdentityReveal reportId={report.id} />
            ) : (
              <p className="text-muted-foreground">
                Anonim — siswa memilih tidak membuka identitas.
              </p>
            )}
          </Section>

          <Section title="Rute laporan">
            <div className="space-y-3">
              {report.routingLogs.map((log) => {
                const dest = DEST_BADGE[log.destination];
                return (
                  <div key={log.id}>
                    <Badge className={`border-transparent ${dest?.cls ?? ""}`}>
                      {dest?.label ?? log.destination}
                    </Badge>
                    <p className="mt-1 text-sm text-text-soft">
                      {ROUTE_REASON[log.destination as RouteDestination]}
                    </p>
                  </div>
                );
              })}
              <p className="text-[0.8125rem] text-muted-foreground">
                Rute ditentukan aturan business logic yang bisa diaudit — bukan keputusan AI, dan
                bukan rekomendasi yang perlu disetujui.
              </p>
            </div>
          </Section>

          <Section title="Rekomendasi pasal tata tertib">
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
      </div>
    </div>
  );
}
