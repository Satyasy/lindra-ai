import nodemailer from "nodemailer";

// Follow-up email — NETRAL & aman untuk perangkat yang mungkin diawasi pelaku.
// ATURAN KERAS (Panduan §3): subject/body TIDAK boleh memuat kode referensi,
// tautan/link auto-login, token URL, atau kata "kekerasan"/"laporan".
// Hanya ajakan membuka aplikasi dan memasukkan kode SECARA MANUAL — tanpa tautan
// apa pun. Nama & domain pengirim netral ("Catatan Harian", bukan "Lindra"; §1.4).

export const FOLLOWUP_FROM =
  process.env.FOLLOWUP_EMAIL_FROM ?? "Catatan Harian <halo@catatan-harian.app>";

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

// Transport SMTP (nodemailer). Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
// Tanpa SMTP_HOST (dev/demo) → jsonTransport: tak menyentuh jaringan, hanya kembalikan
// payload untuk di-log — cron tetap jalan & terverifikasi tanpa kredensial email.
function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return nodemailer.createTransport({ jsonTransport: true });
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = TLS langsung; 587 = STARTTLS
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

// Kirim email check-in netral KE alamat siswa via SMTP. Tanpa SMTP_HOST → di-log
// (jsonTransport), bukan error, supaya cron tetap jalan & bercabang benar.
export async function sendFollowupEmail(to: string): Promise<{ sent: boolean; skipped?: boolean }> {
  const info = await transport().sendMail({
    from: FOLLOWUP_FROM,
    to,
    subject: FOLLOWUP_SUBJECT,
    text: FOLLOWUP_BODY,
  });
  if (!process.env.SMTP_HOST) {
    // jsonTransport menaruh payload email di info.message (string) — tak ada di tipe SMTP.
    const payload = (info as { message?: unknown }).message ?? JSON.stringify(info);
    console.warn(`[followup-email] SMTP_HOST tak diset — email TIDAK dikirim (jsonTransport dev). Payload:\n${payload}`);
    return { sent: false, skipped: true };
  }
  return { sent: true };
}
