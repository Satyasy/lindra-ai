// ============================================================
// Tier 2: klasifikasi + narrative composer (SATU panggilan Groq Key "bk",
// JSON mode + few-shot). Modul Nabil.
// AI hanya mencatat kronologi yang diceritakan siswa ("siswa menyatakan
// bahwa..."), TIDAK PERNAH menyimpulkan siapa yang salah.
// ============================================================

import { groqChat, type ChatMessage } from "./groq-client";
import { TIER2_FEWSHOT } from "./prompts/tier2-fewshot";

// Taksonomi resmi (Permendikbudristek 46/2023) — satu-satunya nilai violenceType
// yang boleh masuk DB. Harus sinkron dengan prompt TAKSONOMI di bawah.
const VIOLENCE_TYPES = [
  "kekerasan-fisik",
  "kekerasan-psikis",
  "perundungan",
  "kekerasan-seksual",
  "diskriminasi-intoleransi",
  "kebijakan-kekerasan",
  "lainnya",
] as const;

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

  // Sinyal rule-engine rekomendasi aksi (lib/ai/recommend-action.ts). null bila
  // tak diceritakan — JANGAN ditebak. Dipersist ke Report.actionSignals saat compose.
  cederaFisik: boolean | null;
  sudahBerulang: boolean | null;
  relasiKuasaTimpang: boolean | null;

  // duplikasi top-level, dibaca langsung oleh routing engine — JANGAN dihapus
  urgencyLevel: "rendah" | "sedang" | "tinggi" | "kritis";
  perpetratorRole: "siswa" | "guru-staf" | "orangtua-wali" | null;
  locationCategory: "dalam-sekolah" | "lintas-sekolah" | null;
  violenceType: string[];

  narrativeSummary: string;
}

// Sentinel decline: ditulis Tier 2 ke field teks saat siswa EKSPLISIT menolak/tidak
// tahu suatu topik. Kalimat wajar (bukan placeholder teknis) → enak dibaca apa adanya
// di draf, dan otomatis dianggap "tersentuh" oleh fieldPresent (string non-kosong → truthy).
export const DECLINED_SENTINEL = "Siswa memilih tidak menjawab";

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
  "cederaFisik": boolean|null,
  "sudahBerulang": boolean|null,
  "relasiKuasaTimpang": boolean|null,
  "urgencyLevel": "rendah"|"sedang"|"tinggi"|"kritis",
  "perpetratorRole": "siswa"|"guru-staf"|"orangtua-wali"|null,
  "locationCategory": "dalam-sekolah"|"lintas-sekolah"|null,
  "violenceType": string[],
  "narrativeSummary": string
}
Field top-level urgencyLevel/perpetratorRole/locationCategory/violenceType HARUS sama nilainya dengan yang di dalam blok terkait.

ATURAN ISI:
- Isi field null (atau [] untuk array) kalau informasinya BELUM tersedia dari transkrip. JANGAN mengarang, menebak, atau melengkapi yang tidak diceritakan siswa.
- Kalau dari transkrip terlihat siswa EKSPLISIT menolak menjawab ATAU bilang tidak tahu untuk suatu topik (mis. "gak mau sebut orangnya", "lupa kapan", "gak mau cerita dampaknya"), tulis kalimat "${DECLINED_SENTINEL}" pada field TEKS yang relevan (terlapor.deskripsi, kejadian.waktu, kejadian.deskripsi, dampak.deskripsi, keamanan.deskripsi, bukti.deskripsi, pelapor.relasiDenganKorban, korban.kelas/jenisKelamin) — jangan biarkan null untuk topik yang jelas-jelas ditolak, dan jangan mengarang isinya. Untuk topik yang memang BELUM disinggung sama sekali, tetap null.
- Kamu TIDAK PERNAH menyimpulkan siapa yang benar/salah. Kamu hanya mencatat apa yang diceritakan siswa.
- "narrativeSummary" ditulis dalam pola "Siswa menyatakan bahwa..." — merangkai kronologi apa adanya dari sudut siswa, tanpa penilaian salah/benar dan tanpa menambah fakta.
- "cederaFisik": true HANYA bila siswa menyebut ada luka/cedera fisik (lebam, berdarah, sakit, dsb). false bila jelas tak ada. null bila tak disinggung.
- "sudahBerulang": true bila kejadian disebut terjadi lebih dari sekali. false bila jelas sekali saja. null bila tak jelas.
- "relasiKuasaTimpang": true bila ada ketimpangan relasi kuasa (mis. kakak kelas ke adik kelas, guru ke siswa, senior ke junior). false bila jelas setara. null bila tak jelas.

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
    cederaFisik: null,
    sudahBerulang: null,
    relasiKuasaTimpang: null,
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

  const asBool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

  // Guard enum untuk DUA field yang dibaca langsung routing engine. Merge dangkal
  // di bawah meneruskan output model 8b apa adanya; enum-nya cuma didokumentasikan
  // di prompt, tak pernah dipaksakan di kode. Nilai halusinasi harus jadi null
  // (-> default dashboard-bk yang aman), bukan string asing yang lolos ke Prisma.
  const asEnum = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;

  const base = safeDefault(transcript);
  // Merge dangkal: pakai nilai model bila ada, kalau tidak jatuh ke default.
  return {
    ...base,
    ...(o as Partial<ReportDraft>),
    urgencyLevel: urgency,
    // Saring ke kode taksonomi resmi (Permendikbudristek 46/2023). Tanpa ini, elemen
    // non-string (mis. `[{...}]` dari injection) meledakkan kolom String[] Prisma di
    // dalam ReadableStream tanpa try/catch, dan string karangan lolos tampil ke BK.
    violenceType: Array.isArray(o.violenceType)
      ? (o.violenceType.filter(
          (v): v is string => typeof v === "string" && (VIOLENCE_TYPES as readonly string[]).includes(v)
        ))
      : [],
    // Input routing engine (lib/routing/routing-engine.ts) — di luar enum → null.
    perpetratorRole: asEnum(o.perpetratorRole, ["siswa", "guru-staf", "orangtua-wali"] as const),
    locationCategory: asEnum(o.locationCategory, ["dalam-sekolah", "lintas-sekolah"] as const),
    // Sinyal rule-engine: guard tipe (input jalur legal) — non-boolean → null.
    cederaFisik: asBool(o.cederaFisik),
    sudahBerulang: asBool(o.sudahBerulang),
    relasiKuasaTimpang: asBool(o.relasiKuasaTimpang),
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

// ============================================================
// Slot tracking terkunci (sticky) — state per sesi chat, disimpan di
// Report.slots (Json). Urutan field TETAP; sekali "filled"/"skipped" TERKUNCI.
// Semua pure & sync (tanpa LLM). Orkestrasi turn ada di app/api/chat/route.ts.
// ============================================================

export type SlotStatus = "empty" | "filled" | "skipped" | "declined";
// Satu slot per blok yang bisa digali natural. kejadian dipecah jadi 3 topik obrolan
// (gambaran/waktu/lokasi) karena memang beda pertanyaan; blok lain 1 slot per blok.
export type SlotField =
  | "gambaran_kejadian"
  | "pelaku"
  | "waktu"
  | "lokasi"
  | "dampak"
  | "keamanan"
  | "pelapor"
  | "korban"
  | "klasifikasi"
  | "bukti";
export type SessionPhase = "gathering" | "ready" | "done";

export interface Slots {
  gambaran_kejadian: SlotStatus;
  pelaku: SlotStatus;
  waktu: SlotStatus;
  lokasi: SlotStatus;
  dampak: SlotStatus;
  keamanan: SlotStatus;
  pelapor: SlotStatus;
  korban: SlotStatus;
  klasifikasi: SlotStatus;
  bukti: SlotStatus;
  phase: SessionPhase;
  target: SlotField | null; // field yang ditanyakan giliran lalu (untuk anti-stall)
  targetCount: number; // berapa kali target ini sudah ditanyakan berturut-turut
  // W3: pertanyaan bukti ditanya SEKALI setelah semua field selesai (bukan slot gathering).
  evidenceQuestionAsked: boolean; // AI sudah menanyakan bukti → jangan tanya ulang
  evidenceResolved: boolean; // siswa upload ≥1 file ATAU tekan "lewati" → boleh tawarkan draf
  [key: string]: string | number | boolean | null; // agar bisa disimpan langsung ke kolom Json Prisma
}

// Urutan gali (W2 §5): keamanan dulu, lalu kronologi kejadian, korban, pelaku,
// dampak, pelapor; klasifikasi diturunkan (ter-fill bareng gambaran).
// "bukti" SENGAJA tidak di sini (W3): bukti bukan lagi slot gathering verbal —
// ditangani sebagai langkah widget upload terpisah SETELAH semua field ini selesai.
// NOTE (business logic — ranah Revano): urutan ini keputusan prioritas W2 §5.
export const SLOT_ORDER: SlotField[] = [
  "keamanan",
  "gambaran_kejadian",
  "waktu",
  "lokasi",
  "korban",
  "pelaku",
  "dampak",
  "pelapor",
  "klasifikasi",
];

// Blok WAJIB untuk melewati gate (W2 §10 #3). "dampak" opsional (di SLOT_ORDER,
// jadi tetap DITAWARKAN, tapi tak menghalangi gate). "bukti" = langkah W3.
// NOTE (business logic — ranah Revano): daftar wajib vs opsional ini W2 §10 #3.
export const REQUIRED_BLOCKS: SlotField[] = [
  "keamanan",
  "gambaran_kejadian",
  "waktu",
  "lokasi",
  "korban",
  "pelaku",
  "pelapor",
  "klasifikasi",
];

// Frasa terbuka untuk di-inject ke prompt chat — BUKAN istilah teknis field.
export const SLOT_DIRECTIVE: Record<SlotField, string> = {
  gambaran_kejadian: "apa yang sebenarnya terjadi / kronologinya",
  pelaku: "siapa yang melakukannya (jangan paksa sebut nama kalau dia ragu)",
  waktu: "kapan kejadian itu terjadi",
  lokasi: "di mana kejadian itu terjadi",
  dampak: "gimana dampaknya ke dia selama ini",
  keamanan: "apakah dia aman sekarang atau kejadiannya masih berlangsung",
  pelapor: "apakah ini dia alami sendiri atau dia menceritakan soal orang lain (santai, jangan memaksa)",
  korban: "sedikit soal dirinya, kira-kira kelas berapa (santai, boleh dilewati kalau tidak mau)",
  // klasifikasi diturunkan dari narasi, BUKAN ditanyakan — praktisnya selalu ter-fill
  // bareng gambaran_kejadian (lihat fieldPresent) jadi hampir tak pernah jadi target.
  // Jaring pengaman kalau toh muncul: buka ruang cerita, JANGAN menebak jenis kekerasan.
  klasifikasi: "kalau masih ada bagian kejadian yang belum sempat diceritain, buka ruang buat itu (JANGAN menyebut/menebak jenis kekerasannya)",
  bukti: "apakah ada bukti seperti chat/foto/pesan (kalau ada bisa dilampirkan nanti; kalau tidak ada, tetap lanjut tanpa menekan)",
};

export function emptySlots(): Slots {
  return {
    gambaran_kejadian: "empty",
    pelaku: "empty",
    waktu: "empty",
    lokasi: "empty",
    dampak: "empty",
    keamanan: "empty",
    pelapor: "empty",
    korban: "empty",
    klasifikasi: "empty",
    bukti: "empty",
    phase: "gathering",
    target: null,
    targetCount: 0,
    evidenceQuestionAsked: false,
    evidenceResolved: false,
  };
}

// Blok WAJIB yang belum resolved (belum "filled"/"skipped"/"declined") — W2 §2.
export function identifyMissingBlocks(slots: Slots): SlotField[] {
  return REQUIRED_BLOCKS.filter((f) => slots[f] === "empty");
}

// W3 gate (W2 §3/§9). isReadyForDraftOffer = semua blok WAJIB resolved.
// isReadyToShowDraft = itu DAN pertanyaan bukti sudah terjawab (upload/lewati);
// hanya ini yang boleh memicu tawaran draf, supaya makna gate W2 tak berubah.
// Catatan: advanceSlots tetap menawarkan blok opsional (dampak) sebelum flip "ready",
// dan dampak (SLOT_ORDER idx 6) ditawarkan sebelum wajib terakhir pelapor (idx 7) —
// jadi di alur nyata identifyMissingBlocks()===[] berbarengan dengan advanced.ready.
export function isReadyForDraftOffer(slots: Slots): boolean {
  return identifyMissingBlocks(slots).length === 0;
}
export function isReadyToShowDraft(slots: Slots): boolean {
  return isReadyForDraftOffer(slots) && slots.evidenceResolved;
}

// "Tersentuh" = ada isi ATAU sentinel decline (string non-kosong → truthy, ikut ke-catch di sini).
// Boolean-only decline (keamanan/bukti) disimpan Tier 2 di field .deskripsi-nya sebagai sentinel.
function fieldPresent(draft: ReportDraft, f: SlotField): boolean {
  switch (f) {
    case "gambaran_kejadian":
      return !!draft.kejadian?.deskripsi;
    case "pelaku":
      return !!(draft.terlapor?.perpetratorRole || draft.terlapor?.deskripsi);
    case "waktu":
      return !!draft.kejadian?.waktu;
    case "lokasi":
      return !!draft.kejadian?.locationCategory;
    case "dampak":
      return !!draft.dampak?.deskripsi;
    case "keamanan":
      return draft.keamanan?.adaBahayaLangsung != null || !!draft.keamanan?.deskripsi;
    case "pelapor":
      return !!draft.pelapor?.relasiDenganKorban;
    case "korban":
      return !!(draft.korban?.kelas || draft.korban?.jenisKelamin);
    case "klasifikasi":
      // Diturunkan dari kejadian: tersentuh begitu ada narasi kejadian (atau tipe sudah ter-derive).
      return !!draft.kejadian?.deskripsi || draft.klasifikasi.violenceType.length > 0;
    case "bukti":
      return draft.bukti?.adaBukti != null || !!draft.bukti?.deskripsi;
  }
}

// Blok "tersentuh" karena siswa EKSPLISIT menolak/tidak tahu (Tier 2 menulis
// DECLINED_SENTINEL ke field teks-nya). Enum/derived (lokasi/klasifikasi/bukti)
// tak bisa membawa sentinel → selalu false.
function fieldDeclined(draft: ReportDraft, f: SlotField): boolean {
  const S = DECLINED_SENTINEL;
  switch (f) {
    case "gambaran_kejadian":
      return draft.kejadian?.deskripsi === S;
    case "pelaku":
      return draft.terlapor?.deskripsi === S;
    case "waktu":
      return draft.kejadian?.waktu === S;
    case "dampak":
      return draft.dampak?.deskripsi === S;
    case "keamanan":
      return draft.keamanan?.deskripsi === S;
    case "pelapor":
      return draft.pelapor?.relasiDenganKorban === S;
    case "korban":
      return draft.korban?.kelas === S || draft.korban?.jenisKelamin === S;
    case "lokasi":
    case "klasifikasi":
    case "bukti":
      return false;
  }
}

// Kunci sticky: empty -> filled/declined bila ekstraksi sekarang mengisinya.
// filled/skipped/declined TIDAK PERNAH berubah walau ekstraksi giliran ini beda.
export function updateSlots(prev: Slots, draft: ReportDraft): Slots {
  const next = { ...prev };
  for (const f of SLOT_ORDER) {
    if (next[f] === "empty" && fieldPresent(draft, f))
      next[f] = fieldDeclined(draft, f) ? "declined" : "filled";
  }
  return next;
}

export function nextEmptyField(slots: Slots): SlotField | null {
  return SLOT_ORDER.find((f) => slots[f] === "empty") ?? null;
}

// Pilih target giliran ini + anti-stall + transisi fase. Pure (tak memutasi input).
// - target = field kosong pertama sesuai urutan.
// - Anti-stall: target sama sudah ditanya >=2x & masih kosong → tandai "skipped", lanjut.
// - Tak ada field kosong tersisa → phase "ready" (giliran validasi, tanpa target).
export function advanceSlots(prev: Slots): { slots: Slots; target: SlotField | null; ready: boolean } {
  const slots = { ...prev };
  let target = nextEmptyField(slots);

  if (target && target === slots.target && slots.targetCount >= 2) {
    slots[target] = "skipped";
    target = nextEmptyField(slots);
  }

  if (!target) {
    slots.phase = "ready";
    slots.target = null;
    slots.targetCount = 0;
    return { slots, target: null, ready: true };
  }

  slots.targetCount = target === slots.target ? slots.targetCount + 1 : 1;
  slots.target = target;
  return { slots, target, ready: false };
}

// Draf terstruktur yang ditampilkan & diedit siswa di panel (E).
export interface StructuredDraft {
  gambaran_kejadian: string;
  pelaku: string;
  waktu: string;
  dampak: string;
  lokasi: string;
  narasi: string;
  [key: string]: string; // agar bisa disimpan langsung ke kolom Json Prisma
}

const LOKASI_LABEL: Record<string, string> = {
  "dalam-sekolah": "Di dalam sekolah",
  "lintas-sekolah": "Lintas sekolah",
};
const PELAKU_LABEL: Record<string, string> = {
  siswa: "Siswa",
  "guru-staf": "Guru / staf",
  "orangtua-wali": "Orang tua / wali",
};

export function toStructuredDraft(draft: ReportDraft): StructuredDraft {
  return {
    gambaran_kejadian: draft.kejadian?.deskripsi ?? "",
    pelaku:
      draft.terlapor?.deskripsi ??
      (draft.terlapor?.perpetratorRole ? PELAKU_LABEL[draft.terlapor.perpetratorRole] : "") ??
      "",
    waktu: draft.kejadian?.waktu ?? "",
    dampak: draft.dampak?.deskripsi ?? "",
    lokasi: draft.kejadian?.locationCategory ? LOKASI_LABEL[draft.kejadian.locationCategory] : "",
    narasi: draft.narrativeSummary,
  };
}
