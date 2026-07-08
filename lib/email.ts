import { Resend } from "resend";

// Follow-up email — NETRAL & aman untuk perangkat yang mungkin diawasi pelaku.
// ATURAN KERAS (Panduan §3): subject/body TIDAK boleh memuat kode referensi,
// tautan/link auto-login, token URL, atau kata "kekerasan"/"laporan".
// Hanya ajakan membuka aplikasi dan memasukkan kode SECARA MANUAL — tanpa tautan
// apa pun. Nama & domain pengirim netral ("Catatan Harian", bukan "Lindra"; §1.4).

export const FOLLOWUP_FROM = process.env.FOLLOWUP_FROM ?? "Catatan Harian <halo@catatan-harian.app>";

// Domain netral untuk tautan menu — TANPA kode/token di URL (link ke menu input kode saja).
const APP_URL = process.env.APP_URL ?? "https://catatan-harian.app";
export const FOLLOWUP_MENU_URL = `${APP_URL}/masuk`;

export const FOLLOWUP_SUBJECT = "Apa kabar kamu?";

// Sapaan netral + LINK HANYA ke menu input kode (bukan kode/token/auto-login).
// Korban mengetik kodenya sendiri di menu. Tak ada kata "kekerasan"/"laporan".
export const FOLLOWUP_BODY = [
  "Halo, apa kabar?",
  "",
  "Ini sapaan dari Catatan Harian — sekadar menanyakan kabarmu. Bagaimana kondisimu sekarang?",
  "",
  `Kalau kamu mau cerita lagi, buka menu ini lalu masukkan kodemu sendiri di sana:`,
  FOLLOWUP_MENU_URL,
  "",
  "Demi keamananmu, kami tidak menaruh kode apa pun di email ini — hanya kamu yang tahu kodemu.",
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
