import { prisma } from "@/lib/prisma";

// Verifikasi kode follow-up yang dimasukkan MANUAL siswa (dari email netral yang
// tak memuat kode). Sukses → set cookie sesi httpOnly (followupId) — TANPA kode/token
// di URL, TANPA auto-login. Halaman sesi membaca cookie ini.
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return Response.json({ error: "input tidak valid" }, { status: 400 });
  }

  const ref = await prisma.referralCode.findUnique({
    where: { code: code.trim().toLowerCase() },
  });
  if (!ref) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  const followup = await prisma.followup.findFirst({
    where: { reportId: ref.reportId, proactiveEnabled: true },
  });
  if (!followup) return Response.json({ error: "tidak ada follow-up aktif" }, { status: 404 });

  // Konsisten dgn cookie sesi lain (app/api/chat) — Secure di produksi.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `lindra_followup=${followup.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${secure}`,
      },
    }
  );
}
