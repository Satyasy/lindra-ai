import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Publik — siswa memantau via kode referensi tanpa membuka identitas.
// HANYA status yang dikembalikan, tidak pernah narasi/identitas.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  // Kode = lin- + 4 byte hex (32-bit); tanpa limit ruang itu bisa disondir per-status.
  // Sejajar dengan /api/followup/verify & /enable.
  if (!rateLimit(`lacak:${clientIp(request)}`, 20)) {
    return Response.json({ error: "terlalu banyak permintaan" }, { status: 429 });
  }
  const { code } = await params;
  const ref = await prisma.referralCode.findUnique({
    where: { code: code.trim().toLowerCase() },
    include: {
      report: {
        select: { status: true, updatedAt: true, followups: { select: { proactiveEnabled: true } } },
      },
    },
  });
  if (!ref) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  // Status + apakah follow-up sudah aktif (untuk mengikat toggle /lacak ke laporan ini).
  // Tetap TIDAK pernah kembalikan narasi/identitas.
  return Response.json(
    {
      status: ref.report.status,
      updatedAt: ref.report.updatedAt,
      followupEnabled: ref.report.followups.some((f) => f.proactiveEnabled),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
