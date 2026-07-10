import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";

// Context injection sesi follow-up (Prompt 2 / Nabil, versi minimal). Suntik ringkasan
// laporan sebelumnya ke system prompt SEBELUM sesi — jangan biarkan model menemukan
// konteks dari nol. NON-LEADING: sapa soal kabar; JANGAN bocorkan detail laporan
// kecuali siswa sendiri yang mengangkatnya. Tier 1 (deteksi krisis) tetap di lapisan
// terpisah (app/api/chat) — tak disentuh di sini.
export function followupSystemPrompt(narrative: string | null): string {
  if (!narrative) return SYSTEM_PROMPT;
  return [
    SYSTEM_PROMPT,
    "",
    "Ini SESI LANJUTAN (follow-up), bukan laporan baru. Ringkasan laporan sebelumnya (konteks untukmu saja, JANGAN dibacakan ke siswa): " +
      narrative,
    "Buka dengan pertanyaan TERBUKA soal kabar siswa. JANGAN membeberkan detail laporan; singgung hanya bila siswa sendiri yang mengangkatnya. Tetap non-leading, tidak menuntun, tidak memaksa.",
  ].join("\n");
}

// Frasa LUNAK per kategori (taksonomi violenceType, lib/ai/classify-narrative). Menyebut
// kategori TANPA memvonis status korban. Kategori sangat sensitif (seksual) & kategori
// kebijakan/lainnya sengaja TIDAK dipetakan → jatuh ke frasa umum. Multi/kosong → umum.
const SOFT_PHRASE: Record<string, string> = {
  perundungan: "perundungan yang kamu ceritakan kemarin",
  "kekerasan-fisik": "kejadian yang kamu alami kemarin",
  "kekerasan-psikis": "hal yang kamu ceritakan kemarin",
  "diskriminasi-intoleransi": "perlakuan yang kamu ceritakan kemarin",
};
const GENERIC_PHRASE = "hal yang kamu ceritakan kemarin";

// Pertanyaan CEK_KASUS = TEMPLATE TETAP (bukan digenerate AI). Rangkuman diturunkan dari
// klasifikasi tersimpan (violenceType) — bukan ditebak ulang. Selalu sediakan jalan
// "belum yakin / tidak mau jawab" sebagai respons valid (trauma-informed).
export function cekKasusQuestion(violenceType: string[]): { question: string; category: string } {
  const only = violenceType.length === 1 ? violenceType[0] : null;
  const mapped = only && SOFT_PHRASE[only] ? only : null;
  const phrase = mapped ? SOFT_PHRASE[mapped] : GENERIC_PHRASE;
  const question =
    `Soal ${phrase}, sekarang gimana keadaannya? Menurutmu masih perlu ditindaklanjuti nggak? ` +
    `Kalau kamu belum yakin atau nggak mau jawab sekarang, itu juga nggak apa-apa.`;
  return { question, category: mapped ?? "umum" };
}
