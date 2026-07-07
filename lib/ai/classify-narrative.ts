// ============================================================
// Tier 2: klasifikasi + narrative composer (SATU panggilan Groq Key "bk",
// JSON mode + few-shot). Modul Nabil.
// AI hanya mencatat kronologi yang diceritakan siswa ("siswa menyatakan
// bahwa..."), TIDAK PERNAH menyimpulkan siapa yang salah.
// ============================================================

import { groqChat, type ChatMessage } from "./groq-client";
import { TIER2_FEWSHOT } from "./prompts/tier2-fewshot";

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface ReportDraft {
  pelapor: { relasiDenganKorban: string | null } | null;
  korban: { kelas: string | null; jenisKelamin: string | null } | null;
  terlapor: { perpetratorRole: "siswa" | "guru-staf" | "orangtua-wali" | null; deskripsi: string | null };
  kejadian: { locationCategory: "dalam-sekolah" | "lintas-sekolah" | null; waktu: string | null; deskripsi: string | null };
  klasifikasi: { violenceType: string[] };
  bukti: { adaBukti: boolean | null; deskripsi: string | null };
  dampak: { deskripsi: string | null };
  keamanan: { adaBahayaLangsung: boolean | null; deskripsi: string | null };

  // duplikasi top-level, dibaca langsung oleh routing engine — JANGAN dihapus
  urgencyLevel: "rendah" | "sedang" | "tinggi" | "kritis";
  perpetratorRole: "siswa" | "guru-staf" | "orangtua-wali" | null;
  locationCategory: "dalam-sekolah" | "lintas-sekolah" | null;
  violenceType: string[];

  narrativeSummary: string;
}

const SYSTEM_PROMPT = `Kamu adalah mesin ekstraksi terstruktur untuk laporan kekerasan siswa. Dari transkrip percakapan siswa dengan chatbot, susun SATU objek JSON persis skema di bawah. Balas HANYA JSON valid, tanpa teks lain.

SKEMA JSON (semua field wajib ada):
{
  "pelapor": { "relasiDenganKorban": string|null } | null,
  "korban": { "kelas": string|null, "jenisKelamin": string|null } | null,
  "terlapor": { "perpetratorRole": "siswa"|"guru-staf"|"orangtua-wali"|null, "deskripsi": string|null },
  "kejadian": { "locationCategory": "dalam-sekolah"|"lintas-sekolah"|null, "waktu": string|null, "deskripsi": string|null },
  "klasifikasi": { "violenceType": string[] },
  "bukti": { "adaBukti": boolean|null, "deskripsi": string|null },
  "dampak": { "deskripsi": string|null },
  "keamanan": { "adaBahayaLangsung": boolean|null, "deskripsi": string|null },
  "urgencyLevel": "rendah"|"sedang"|"tinggi"|"kritis",
  "perpetratorRole": "siswa"|"guru-staf"|"orangtua-wali"|null,
  "locationCategory": "dalam-sekolah"|"lintas-sekolah"|null,
  "violenceType": string[],
  "narrativeSummary": string
}
Field top-level urgencyLevel/perpetratorRole/locationCategory/violenceType HARUS sama nilainya dengan yang di dalam blok terkait.

ATURAN ISI:
- Isi field null (atau [] untuk array) kalau informasinya BELUM tersedia dari transkrip. JANGAN mengarang, menebak, atau melengkapi yang tidak diceritakan siswa.
- Kamu TIDAK PERNAH menyimpulkan siapa yang benar/salah. Kamu hanya mencatat apa yang diceritakan siswa.
- "narrativeSummary" ditulis dalam pola "Siswa menyatakan bahwa..." — merangkai kronologi apa adanya dari sudut siswa, tanpa penilaian salah/benar dan tanpa menambah fakta.

TAKSONOMI violenceType (Permendikbudristek 46/2023 Pasal 6 & 8 — pakai PERSIS kode ini, jangan bikin kategori sendiri):
- "kekerasan-fisik": kontak fisik pelaku ke korban (pakai/tanpa alat) — tawuran, penganiayaan, perkelahian, kerja paksa, pembunuhan.
- "kekerasan-psikis": perbuatan nonfisik untuk merendahkan/menghina/menakuti — pengucilan, penolakan, pengabaian, penghinaan, penyebaran rumor, ejekan, intimidasi, teror, mempermalukan di depan umum, pemerasan.
- "perundungan": kekerasan fisik ATAU psikis yang BERULANG (lebih dari 1 kali) DAN ada ketimpangan relasi kuasa. WAJIB dua syarat sekaligus. Kejadian sekali, atau tanpa relasi kuasa timpang = kekerasan-fisik/psikis biasa, BUKAN perundungan.
- "kekerasan-seksual": (TODO: verifikasi definisi lengkap Pasal 9 sebelum finalisasi — belum diverifikasi penuh).
- "diskriminasi-intoleransi": (TODO: verifikasi definisi lengkap).
- "kebijakan-kekerasan": kebijakan yang berpotensi/menimbulkan kekerasan oleh pendidik/tenaga kependidikan/komite/kepala satuan pendidikan/kepala dinas.
- "lainnya": ada indikasi kekerasan tapi tak cocok kategori manapun.
Isi violenceType HANYA kalau narasi cocok kriteria di atas. Kalau obrolan bukan soal kekerasan, violenceType: []. Ini murni pencocokan pola dengan taksonomi regulasi, BUKAN penilaian "layak lapor atau tidak".`;

// Rangkuman transkrip apa adanya — dipakai sebagai fallback narrativeSummary.
function fallbackSummary(transcript: TranscriptTurn[]): string {
  const studentLines = transcript.filter((t) => t.role === "user").map((t) => t.content);
  return studentLines.length > 0
    ? `Siswa menyatakan bahwa: ${studentLines.join(" ")}`
    : "Belum ada cerita yang bisa dirangkum.";
}

// Default aman — dikembalikan saat tak ada key, gagal call, atau JSON tak valid.
// Tidak pernah throw supaya chat tidak crash.
function safeDefault(transcript: TranscriptTurn[]): ReportDraft {
  return {
    pelapor: null,
    korban: null,
    terlapor: { perpetratorRole: null, deskripsi: null },
    kejadian: { locationCategory: null, waktu: null, deskripsi: null },
    klasifikasi: { violenceType: [] },
    bukti: { adaBukti: null, deskripsi: null },
    dampak: { deskripsi: null },
    keamanan: { adaBahayaLangsung: null, deskripsi: null },
    urgencyLevel: "sedang",
    perpetratorRole: null,
    locationCategory: null,
    violenceType: [],
    narrativeSummary: fallbackSummary(transcript),
  };
}

// Validasi minimal: field wajib ada & bertipe benar. Selebihnya dinormalkan.
function coerceDraft(raw: unknown, transcript: TranscriptTurn[]): ReportDraft {
  if (!raw || typeof raw !== "object") return safeDefault(transcript);
  const o = raw as Record<string, unknown>;

  const urgency = o.urgencyLevel;
  const validUrgency =
    urgency === "rendah" || urgency === "sedang" || urgency === "tinggi" || urgency === "kritis";
  const summary = typeof o.narrativeSummary === "string" && o.narrativeSummary.trim();
  // Field wajib hilang/rusak -> default aman.
  if (!validUrgency || !summary) return safeDefault(transcript);

  const base = safeDefault(transcript);
  // Merge dangkal: pakai nilai model bila ada, kalau tidak jatuh ke default.
  return {
    ...base,
    ...(o as Partial<ReportDraft>),
    urgencyLevel: urgency,
    violenceType: Array.isArray(o.violenceType) ? (o.violenceType as string[]) : [],
    narrativeSummary: o.narrativeSummary as string,
  };
}

export async function composeReport(transcript: TranscriptTurn[]): Promise<ReportDraft> {
  const transcriptText =
    transcript.map((t) => `${t.role}: ${t.content}`).join("\n") || "(transkrip kosong)";

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...TIER2_FEWSHOT,
    { role: "user", content: transcriptText },
  ];

  try {
    const res = await groqChat(messages, "bk", false, { type: "json_object" });
    if (!res || !res.ok) return safeDefault(transcript);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return safeDefault(transcript);
    return coerceDraft(JSON.parse(content), transcript);
  } catch {
    // JSON gagal parse / jaringan error / bentuk respons tak terduga -> default aman.
    return safeDefault(transcript);
  }
}
