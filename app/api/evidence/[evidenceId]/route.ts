import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";
import { SESSION_COOKIE } from "@/lib/session";

// Bukti milik siswa — hanya boleh dilihat/dihapus oleh pemiliknya (cookie sesi
// httpOnly == reportId) DAN selama laporan masih "draft". Setelah terkirim, cookie
// sesi dihapus & status berubah → route ini menutup diri; kelola bukti pindah ke
// Portal BK. Tak pakai id file asli (privasi terkunci sejak W3).
async function ownedDraftEvidence(evidenceId: string) {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const ev = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    select: { id: true, reportId: true, mimeType: true, report: { select: { status: true } } },
  });
  if (!ev || ev.reportId !== sessionId || ev.report.status !== "draft") return null;
  return ev;
}

// Lihat lampiran sendiri (inline, tetap di bawah shell app + QuickExit — bukan tab mentah).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { evidenceId } = await params;
  const ev = await ownedDraftEvidence(evidenceId);
  if (!ev) return new Response("tidak ditemukan", { status: 404 });
  // bytes diambil terpisah — auth di atas tak memuat data (delete jadi murah).
  const file = await prisma.evidence.findUnique({ where: { id: ev.id }, select: { data: true } });
  if (!file) return new Response("tidak ditemukan", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": ev.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Hapus lampiran dari draf sebelum kirim.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const { evidenceId } = await params;
  const ev = await ownedDraftEvidence(evidenceId);
  if (!ev) return NextResponse.json({ error: "tidak ditemukan" }, { status: 404 });
  await prisma.evidence.delete({ where: { id: ev.id } });
  await logAction(ev.reportId, "system", "evidence-removed", { evidenceId: ev.id });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
