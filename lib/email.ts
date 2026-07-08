import { Resend } from "resend";

// Follow-up email — NETRAL & aman untuk perangkat yang mungkin diawasi pelaku.
// ATURAN KERAS (Panduan §3): subject/body TIDAK boleh memuat kode referensi,
// tautan/link auto-login, token URL, atau kata "kekerasan"/"laporan".
// Hanya ajakan membuka aplikasi dan memasukkan kode SECARA MANUAL — tanpa tautan
// apa pun. Nama & domain pengirim netral ("Catatan Harian", bukan "Lindra"; §1.4).

export const FOLLOWUP_FROM = process.env.FOLLOWUP_FROM ?? "Catatan Harian <halo@catatan-harian.app>";

export const FOLLOWUP_SUBJECT = "Apa kabar kamu?";

export const FOLLOWUP_BODY = [
  "Halo,",
  "",
  "Ini sapaan dari Catatan Harian — sekadar menanyakan kabarmu.",
  "",
  "Kalau kamu mau melanjutkan, buka Catatan Harian seperti biasa lalu masukkan kodemu sendiri di halaman follow-up. Demi keamananmu, kami sengaja tidak menaruh tautan atau kode apa pun di email ini.",
  "",
  "Kamu yang pegang kendali — tidak ada yang terjadi tanpa kamu memilih.",
  "",
  "— Catatan Harian",
].join("\n");

// Kirim via Resend. Tanpa RESEND_API_KEY (dev/demo) → di-skip, bukan error,
// supaya cron tetap jalan & bercabang benar tanpa kredensial email.
export async function sendFollowupEmail(to: string): Promise<{ sent: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[followup-email] RESEND_API_KEY tak diset — email di-skip (dev/demo).");
    return { sent: false, skipped: true };
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FOLLOWUP_FROM,
    to,
    subject: FOLLOWUP_SUBJECT,
    text: FOLLOWUP_BODY,
  });
  if (error) throw new Error(error.message);
  return { sent: true };
}
