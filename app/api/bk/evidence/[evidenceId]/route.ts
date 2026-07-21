import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

// Unduh lampiran bukti — HANYA staf terautentikasi yang laporannya memang dirutekan
// ke antreannya (bukan link publik). Tiap akses tercatat di AuditLog (chain of custody).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { evidenceId } = await params;
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });

  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { report: { include: { routingLogs: true } } },
  });
  if (!evidence) return new Response("tidak ditemukan", { status: 404 });

  // Scope sama seperti halaman detail: laporan harus dirutekan ke destinasi peran ini.
  const myDestination = staffRole(session) === "satgas" ? "satgas-eksternal" : "dashboard-bk";
  const routed = evidence.report.routingLogs.some((l) => l.destination === myDestination);
  if (!routed) return new Response("tidak ditemukan", { status: 404 });

  await logAction(evidence.reportId, session.user.email ?? "staff", "evidence-opened", {
    evidenceId: evidence.id,
  });

  // Preview inline HANYA untuk foto/video (magic-bytes sudah diverifikasi saat upload,
  // + nosniff). PDF tetap attachment — viewer PDF permukaan serangan lebih luas.
  const inline = /^(image|video)\//.test(evidence.mimeType);
  // filename sudah disanitize sejak W3 ("bukti-<uuid>.ext") — aman jadi nama unduhan.
  return new Response(new Uint8Array(evidence.data), {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${evidence.filename}"`,
      "Cache-Control": "no-store",
      // Cegah MIME-sniffing browser me-render file "png" yang isinya HTML/script.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
