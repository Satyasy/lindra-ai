import { prisma } from "@/lib/prisma";

// Publik — siswa memantau via kode referensi tanpa membuka identitas.
// HANYA status yang dikembalikan, tidak pernah narasi/identitas.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const ref = await prisma.referralCode.findUnique({
    where: { code: code.trim().toLowerCase() },
    include: { report: { select: { status: true, updatedAt: true } } },
  });
  if (!ref) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  return Response.json(
    { status: ref.report.status, updatedAt: ref.report.updatedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
