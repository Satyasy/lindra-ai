import { cookies } from "next/headers";

export const SESSION_COOKIE = "lindra_session";

// Umur cookie sesi (detik). Dulu session-cookie (hilang saat browser ditutup) →
// draf belum-terkirim lenyap kalau browser di-restart. 7 hari = draf selamat,
// QuickExit & kirim laporan tetap menghapusnya lebih awal. Keputusan pemilik produk.
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

// Batas keamanan draf: cookie sesi httpOnly harus cocok dengan sessionId di URL
export async function guardSession(sessionId: string): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === sessionId;
}
