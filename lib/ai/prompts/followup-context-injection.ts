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
