import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

// CEK_KASUS: user memilih Iya/Tidak lewat TOMBOL (sinyal terstruktur, bukan AI menafsir
// teks bebas). Transisi deterministik (business logic).
// - "Iya" (masih perlu ditindaklanjuti) = konfirmasi RELEVANSI oleh user → set
//   followUpFlaggedAt (kasus naik + badge di antrean BK). TIDAK menyentuh noProgressCount
//   (itu sinyal kemandekan ADMIN, dinaikkan cron — jangan dicampur).
// - "Tidak" = tutup suportif; insiden baru TIDAK auto-buat laporan (klien arahkan ke intake).
const CLOSER_IYA =
  "Makasih udah ngasih tahu. Kasusmu aku tandai dan naikkan ke petugas supaya ditindaklanjuti. " +
  "Aku nggak bisa janji soal waktunya, tapi kamu sudah melakukan bagianmu. Kamu yang pegang kendali.";
const CLOSER_TIDAK =
  "Makasih udah mampir dan ngasih kabar. Kalau nanti ada yang berubah atau kamu mau cerita hal " +
  "baru, kamu selalu bisa mulai cerita lagi dari awal. Aku di sini kapan pun kamu butuh.";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const followupId = cookieStore.get("lindra_followup")?.value;
  if (!followupId) return Response.json({ error: "sesi tidak ada" }, { status: 401 });

  const { decision } = await request.json().catch(() => ({}));
  if (decision !== "iya" && decision !== "tidak") {
    return Response.json({ error: "input tidak valid" }, { status: 400 });
  }

  const followup = await prisma.followup.findUnique({ where: { id: followupId } });
  if (!followup) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  if (decision === "iya") {
    await prisma.followup.update({
      where: { id: followupId },
      // Pertahankan waktu flag PERTAMA (usia "sudah lama mandek" untuk triase BK).
      data: { state: "flagged", followUpFlaggedAt: followup.followUpFlaggedAt ?? new Date() },
    });
    await logAction(followup.reportId, "student", "followup-case-flagged");
    return Response.json({ message: CLOSER_IYA }, { headers: { "Cache-Control": "no-store" } });
  }

  await prisma.followup.update({ where: { id: followupId }, data: { state: "closed" } });
  await logAction(followup.reportId, "student", "followup-session-closed");
  return Response.json({ message: CLOSER_TIDAK }, { headers: { "Cache-Control": "no-store" } });
}
