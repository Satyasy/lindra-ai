// ============================================================
// STUB — modul milik Nabil (Tier 1: deteksi krisis regex).
// Revano hanya memanggil interface ini; implementasi asli akan
// menggantikan isi fungsi tanpa mengubah pemanggilnya.
// ============================================================

export interface CrisisResult {
  isCrisis: boolean;
  matchedCategory?: string;
}

// Harus pure/sync tanpa I/O di versi asli — kecepatan = keselamatan.
export function detectCrisisSignal(_message: string): CrisisResult {
  return { isCrisis: false };
}

// Pesan eskalasi darurat yang di-stream saat krisis terdeteksi (tanpa panggilan model)
export const CRISIS_RESPONSE = [
  "Aku dengar kamu. Yang kamu rasakan sekarang penting, dan kamu tidak sendirian.",
  "",
  "Kalau kamu dalam bahaya sekarang, tolong hubungi:",
  "- SAPA 129 (telepon 129, atau WhatsApp 08111-129-129) — gratis, 24 jam",
  "- 112 untuk keadaan darurat",
  "",
  "Laporanmu juga sudah kami tandai prioritas tertinggi.",
].join("\n");
