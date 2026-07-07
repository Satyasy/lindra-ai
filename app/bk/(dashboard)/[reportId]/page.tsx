import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";
import { recommendArticles } from "@/lib/ai/recommend-policy";
import { decryptIdentity } from "@/lib/identity-crypto";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusSelect } from "@/components/bk/StatusSelect";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const session = await auth();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { routingLogs: true, referralCode: true },
  });
  // Hanya laporan yang memang dirutekan ke BK yang boleh dibuka di portal ini
  const bkLog = report?.routingLogs.find((l) => l.destination === "dashboard-bk");
  if (!report || !bkLog) notFound();

  // Catat pembukaan pertama saja — refresh tidak boleh membanjiri audit trail
  if (!bkLog.openedAt) {
    await prisma.routingLog.update({
      where: { id: bkLog.id },
      data: { openedAt: new Date() },
    });
    await logAction(reportId, session?.user?.email ?? "staff", "opened");
  }

  const recommendations = await recommendArticles(report.narrative ?? "");
  const identity =
    !report.isAnonymous && report.identityData
      ? decryptIdentity(report.identityData)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            report.urgencyLevel === "kritis"
              ? "bg-destructive text-white"
              : "bg-secondary text-secondary-foreground"
          }
        >
          {report.urgencyLevel ?? "belum terklasifikasi"}
        </Badge>
        {report.urgentVisum && <Badge variant="outline">visum urgent — koordinasi segera</Badge>}
        <span className="text-sm text-muted-foreground">
          Kode: {report.referralCode?.code ?? "-"}
        </span>
        <div className="ml-auto">
          <StatusSelect reportId={report.id} status={report.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Narasi laporan</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">
          {report.narrative ?? "(belum tersusun)"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identitas pelapor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {identity ?? <span className="text-muted-foreground">Anonim — siswa memilih tidak membuka identitas.</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekomendasi pasal tata tertib</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground">
              Tidak ada pasal yang cocok ditemukan. Rekomendasi hanya muncul bila benar-benar ada
              kutipan relevan dari dokumen tata tertib — sistem tidak pernah mengarang kecocokan.
            </p>
          ) : (
            recommendations.map((rec) => (
              <blockquote key={rec.chunkId} className="border-l-2 border-primary pl-3">
                <p className="italic">&ldquo;{rec.quote}&rdquo;</p>
                <p className="mt-1 text-muted-foreground">{rec.reasoning}</p>
              </blockquote>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            Kutipan + alasan, bukan angka final — penilaian konteks dan keputusan tetap di tangan BK.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
