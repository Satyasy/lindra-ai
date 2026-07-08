// ============================================================
// STUB — modul milik Nabil (Tier 1: deteksi krisis regex).
// Revano hanya memanggil interface ini; implementasi asli akan
// menggantikan isi fungsi tanpa mengubah pemanggilnya.
// ============================================================

export interface CrisisResult {
  isCrisis: boolean;
  matchedCategory?: string;
}

// Regex per kategori, dievaluasi berurutan. Kategori pertama yang cocok menang.
// Fokus: sinyal krisis AKTIF/SEKARANG, bukan penyebutan kekerasan secara umum.
// Toleran bahasa gaul remaja + typo umum (case-insensitive).
const CRISIS_PATTERNS: { category: string; re: RegExp }[] = [
  {
    // Ide/rencana bunuh diri
    category: "ide-bunuh-diri",
    re: /\b(pengen|pgn|pengin|kepengen|mau|pen|ingin|niat|rencana)\s+(mati|bunuh\s*di?ri|mengakhiri\s+hidup|ngakhirin\s+hidup)\b|\bbun\s*dir\b|\bbundir\b|\bpengen\s*ilang\s*aja\b|\b(ga+k?|nggak|gak|tida?k|ndak|engga+k?)\s*(mau|pengen|pgn)\s*(hidup|idup)\b|\bmend?ing\s+mati\b|\blebih\s+baik\s+mati\b|\bcapek\s+(hidup|idup)\b|\bpengen\s+(mati|mengakhiri)\b|\bmau\s+ngilangin\s+nyawa\s*(ku|sendiri)\b/i,
  },
  {
    // Self-harm sedang/baru terjadi
    category: "self-harm-aktif",
    re: /\b(nyilet|nyayat|ngiris|gores(in)?\s+(tangan|pergelangan|nadi)|silet(in)?\s+tangan|nyakitin\s+diri\s*(sendiri)?|nyakitin\s+diriku|sakitin\s+diri\s*(sendiri)?|melukai\s+diri\s*(sendiri)?|ngelukain\s+diri|self\s*-?\s*harm)\b/i,
  },
  {
    // Kekerasan fisik SEDANG berlangsung sekarang
    category: "kekerasan-fisik-berlangsung",
    re: /\b(lagi|sedang|skrg|sekarang|barusan\s+lagi|tolong.*lagi)\b[^.!?]*\b(dipukul(in)?|dihajar|dikeroyok|ditendang(in)?|dibanting|dianiaya|dipiting|ditampar(in)?|dijambak)\b|\b(dia|mereka|kakak\s*kelas|dia\s+lagi)\b[^.!?]*\b(mukul(in)?|nghajar|ngeroyok|nendang(in)?|nampar(in)?)\b[^.!?]*\b(sekarang|skrg|nih|ini)\b|\btolong\s+lagi\s+di(pukul|keroyok|hajar)/i,
  },
  {
    // Ancaman nyawa eksplisit
    category: "ancaman-nyawa",
    re: /\b(mau|akan|bakal|di?ancam)\s*(di)?(bunuh|bacok|tikam|tusuk|abisin|habisi|ngabisin)\b|\bmau\s+di(bunuh|bacok|abisin)\b|\b(dia|mereka)\s+(bilang|ngancem|ancam)[^.!?]*\b(bunuh|abisin|ngabisin|bacok|tusuk)\b|\bnyawa\s*(ku|saya)\s+terancam\b|\bmau\s+dihabisi\b/i,
  },
];

// Harus pure/sync tanpa I/O — kecepatan = keselamatan.
export function detectCrisisSignal(message: string): CrisisResult {
  // Normalisasi: lowercase + rapatkan spasi berulang (toleransi typo spasi).
  const text = message.toLowerCase().replace(/\s+/g, " ").trim();
  for (const { category, re } of CRISIS_PATTERNS) {
    if (re.test(text)) return { isCrisis: true, matchedCategory: category };
  }
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
