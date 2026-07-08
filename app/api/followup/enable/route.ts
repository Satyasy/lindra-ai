import { prisma } from "@/lib/prisma";
import { encryptToBase64 } from "@/lib/identity-crypto";
import { logAction } from "@/lib/audit/log-action";

// Email check-in pertama dikirim ~1 menit setelah disimpan (timing demo), bukan menunggu SLA.
const FIRST_CHECKIN_MS = 60_000;

// Opt-in follow-up di layar konfirmasi (sesi sudah selesai → cookie hilang, jadi
// diautentikasi lewat kode referensi yang baru diterima siswa). Email disimpan
// TERENKRIPSI (ciphertext base64), tak pernah plaintext; audit tak memuat email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { code, email, enabled } = await request.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return Response.json({ error: "input tidak valid" }, { status: 400 });
  }

  const ref = await prisma.referralCode.findUnique({ where: { code: code.trim().toLowerCase() } });
  if (!ref) return Response.json({ error: "kode tidak ditemukan" }, { status: 404 });

  // Matikan follow-up — tanpa email, cukup set proactiveEnabled=false.
  if (enabled === false) {
    const existing = await prisma.followup.findFirst({ where: { reportId: ref.reportId } });
    if (existing) {
      await prisma.followup.update({ where: { id: existing.id }, data: { proactiveEnabled: false } });
    }
    await logAction(ref.reportId, "student", "followup-enabled", { enabled: false });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  // Nyalakan — wajib email valid, disimpan TERENKRIPSI (ciphertext base64), tak pernah plaintext.
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json({ error: "input tidak valid" }, { status: 400 });
  }
  // AUTO-ON begitu email tersimpan (consent sudah tampil di UI sebelum form).
  const data = {
    contactEmail: encryptToBase64(email.trim()),
    proactiveEnabled: true,
    scheduledAt: new Date(Date.now() + FIRST_CHECKIN_MS),
  };
  const existing = await prisma.followup.findFirst({ where: { reportId: ref.reportId } });
  if (existing) {
    await prisma.followup.update({ where: { id: existing.id }, data });
  } else {
    await prisma.followup.create({ data: { reportId: ref.reportId, ...data } });
  }
  await logAction(ref.reportId, "student", "followup-enabled"); // tanpa email di metadata

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
