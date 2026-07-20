export const SLA_THRESHOLD_HOURS = Number(process.env.SLA_THRESHOLD_HOURS ?? 48);

// W5 follow-up proaktif.
// SAPA129_THRESHOLD = jumlah siklus kemandekan ADMIN (kasus ter-flag tapi belum dibuka)
// sebelum sesi follow-up berikutnya menawarkan opsi SAPA 129 ke user. Dipicu inaksi
// institusi — BUKAN berapa kali user bilang "Iya".
export const SAPA129_THRESHOLD = Number(process.env.SAPA129_THRESHOLD ?? 2);

// DUMMY: bypass ambang waktu → email check-in pertama dikirim segera saat opt-in (demo/testing).
// Flag, BUKAN hardcode — supaya delay produksi tak terhapus shortcut testing.
export const DUMMY_FOLLOWUP_IMMEDIATE = process.env.DUMMY_FOLLOWUP_IMMEDIATE === "true";

// EMBEDDING_DIMENSION pindah ke lib/ai/embed.ts — dimensi itu properti dari model
// embedding, jadi ia serumah dengan tempat model dipilih. Model sudah ditentukan
// (text-embedding-3-small, 1536), jadi ini bukan placeholder lagi.

// Gate retrieval pasal UU pada narasi rekomendasi kasus. Default OFF: section UU
// disembunyikan TOTAL dari response (beda dgn "dicari tapi kosong"). Retrieval nyata
// belum diimplementasi — lihat lib/ai/recommend-action.ts retrieveUU().
export const UU_RETRIEVAL_ENABLED = process.env.UU_RETRIEVAL_ENABLED === "true";
