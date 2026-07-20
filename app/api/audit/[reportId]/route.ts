import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Verifikasi chain of custody: riwayat audit + kecocokan hash konten
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { reportId } = await params;
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      auditLogs: { orderBy: { createdAt: "asc" } },
      routingLogs: true,
    },
  });
  if (!report) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  // Scope per antrean peran (sama seperti route evidence & halaman detail) — tanpa ini
  // Satgas bisa membaca audit-log laporan antrean BK (IDOR). 404, bukan 403, agar tak
  // membocorkan keberadaan laporan di luar wewenang.
  const myDestination = staffRole(session) === "satgas" ? "satgas-eksternal" : "dashboard-bk";
  if (!report.routingLogs.some((l) => l.destination === myDestination)) {
    return Response.json({ error: "tidak ditemukan" }, { status: 404 });
  }

  return Response.json({
    history: report.auditLogs.map(({ actor, action, metadata, createdAt }) => ({
      actor,
      action,
      metadata,
      createdAt,
    })),
    integrityVerified:
      report.contentHash !== null &&
      report.routingLogs.length > 0 &&
      report.routingLogs.every((l) => l.hashAtSend === report.contentHash),
  });
}
