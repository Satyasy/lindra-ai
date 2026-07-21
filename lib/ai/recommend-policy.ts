// ============================================================
// RAG rekomendasi pasal tata tertib — HYBRID (vector + keyword).
//
// Dua jalur retrieval berjalan berdampingan lalu digabung dengan Reciprocal
// Rank Fusion. Keyword menangkap istilah harfiah; vector menangkap makna
// ("dijulidin di grup" -> pasal "perundungan siber", nol kata kunci sama).
// Jalur vector butuh EMBEDDING_API_KEY; tanpa itu ia dilewati dan hasilnya
// keyword murni — vendor down bukan fitur mati.
//
// Yang TIDAK berubah, dan tidak boleh berubah: LLM hanya MENJELASKAN kecocokan
// yang sudah ditentukan sistem — tidak pernah memilihnya, tidak pernah
// mengarangnya. Kalau kedua jalur kosong, hasilnya kosong. Modul Nabil.
// ============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { groqChat } from "./groq-client";
import { embed, toVectorLiteral } from "./embed";

export interface PolicyRecommendation {
  chunkId: string;
  quote: string;
  reasoning: string;
}

// Tata tertib & UU berbagi tabel SchoolPolicyChunk. Baris ber-documentTitle awalan
// ini = pasal UU (masuk section perundang-undangan); selain itu = tata tertib sekolah.
// recommendArticles MENGECUALIKAN awalan ini; recommendLaws HANYA yang berawalan ini.
export const UU_TITLE_PREFIX = "UU ";

// Bentuk `where` retrieval: hanya-UU, atau semua-kecuali-UU.
type PolicyWhere =
  | { documentTitle: { startsWith: string } }
  | { NOT: { documentTitle: { startsWith: string } } };

const MIN_SCORE = 2; // ambang minimal jumlah kata kunci yang cocok
const MAX_RESULTS = 5;

// Lantai relevansi jalur vector — cosine distance, makin kecil makin mirip.
// WAJIB ada: jalur keyword punya rem (MIN_SCORE) dan berani balik kosong, tapi
// pgvector SELALU mengembalikan top-k. Tanpa lantai ini, narasi yang tidak
// melanggar apa pun tetap disodori 5 pasal "paling tidak jauh" — persis
// automation-bias yang harus dihindari.
// Kalibrasi (gemini-embedding-001): kasus jelas "dipukul teman" mendapat pasal
// relevan pada 0.32–0.39 dan pasal jelas melenceng (presensi/dispensasi) pada
// ~0.43. Lantai 0.6 lama = cosine sim 0.4 → nyaris tak menyaring apa pun. 0.45
// (sim ~0.55) mulai membuang yang jelas tak nyambung. TETAP kalibrasi ulang
// dengan korpus tata tertibmu sendiri — nilai ini dari satu contoh.
export const MAX_DISTANCE = 0.45;

// Berapa kandidat vector diambil sebelum disaring lantai + difusikan.
const VECTOR_CANDIDATES = 10;

// Stopword umum Bahasa Indonesia + kata pola narasi ("siswa menyatakan bahwa...").
const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "atau", "itu", "ini", "aku",
  "saya", "dia", "kamu", "mereka", "kita", "kami", "adalah", "akan", "sudah", "juga", "bahwa",
  "karena", "saat", "waktu", "tadi", "kemarin", "terus", "aja", "sih", "banget", "nya", "ada",
  "gak", "nggak", "tidak", "biasa", "biasanya", "siswa", "menyatakan", "sama", "buat", "kalau",
  "kalo", "gara", "pas", "jadi", "bikin", "sampe", "sampai", "rame",
]);

function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(tokens)];
}

// Ambil kutipan ASLI (bukan parafrase): kalimat pertama di chunk yang memuat
// salah satu kata kunci; fallback ke ~200 karakter pertama.
function pickQuote(content: string, keywords: string[]): string {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => {
    const low = s.toLowerCase();
    return keywords.some((k) => low.includes(k));
  });
  const quote = (hit ?? content).trim();
  return quote.length > 240 ? quote.slice(0, 240).trimEnd() + "…" : quote;
}

async function explain(narrativeSummary: string, quote: string): Promise<string> {
  const fallback = "Kutipan ini memuat kata kunci yang muncul dalam narasi siswa.";
  try {
    const res = await groqChat(
      [
        {
          role: "system",
          content:
            "Kamu menjelaskan RELEVANSI kutipan aturan sekolah terhadap narasi kejadian, dalam SATU kalimat singkat. Kecocokan sudah ditentukan sistem lain — kamu hanya merangkai penjelasan. Jangan menilai benar/salah, jangan menyimpulkan pelanggaran, jangan menambah fakta.",
        },
        {
          role: "user",
          content: `Narasi:\n${narrativeSummary}\n\nKutipan aturan:\n${quote}\n\nJelaskan singkat kenapa kutipan ini relevan dengan narasi.`,
        },
      ],
      "bk",
      false
    );
    if (!res || !res.ok) return fallback;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : fallback;
  } catch {
    return fallback;
  }
}

export interface PolicyChunk {
  id: string;
  documentTitle: string;
  content: string;
}

// Gabung VEKTOR-DULU. Vektor = sinyal relevansi tepercaya: sudah terurut jarak
// & lolos MAX_DISTANCE, jadi urutannya yang dipakai. Keyword hanya MENAMBAH recall
// di bawahnya (chunk lolos-ambang yang tak masuk kandidat vektor). Dedup by id,
// kemunculan pertama menang → posisi vektor menang atas keyword. Dipotong MAX_RESULTS.
//
// Menggantikan Reciprocal Rank Fusion lama. RRF memberi bobot SAMA ke keyword, jadi
// chunk berkosakata-umum yang kebetulan muncul di DUA jalur (mis. "presensi/
// dispensasi" — berbagi "sekolah/izin/sakit" dengan narasi) terangkat ke atas pasal
// yang benar-benar cocok makna tapi tak ketangkap keyword ("kekerasan fisik", karena
// bahasa siswa != bahasa formal aturan). Di rekomendasi pasal, promosi-kosakata-umum
// itu automation-bias — persis yang harus dihindari modul ini.
//
// Murni & tanpa I/O supaya bisa diuji tanpa DB maupun jaringan. Vektor kosong
// (vendor down / korpus belum di-embed) → hasil = keyword murni (jalur bertahan hidup).
export function mergeVectorFirst(
  vectorRanked: PolicyChunk[],
  keywordRanked: PolicyChunk[]
): PolicyChunk[] {
  const seen = new Set<string>();
  const out: PolicyChunk[] = [];
  for (const chunk of [...vectorRanked, ...keywordRanked]) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    out.push(chunk);
  }
  return out.slice(0, MAX_RESULTS);
}

// Jalur keyword — tidak berubah dari versi sebelumnya. Ini juga jalur bertahan
// hidup saat vendor embedding tak tersedia.
async function keywordSearch(
  keywords: string[],
  where: PolicyWhere
): Promise<PolicyChunk[]> {
  if (keywords.length === 0) return [];

  const chunks = await prisma.schoolPolicyChunk.findMany({
    where,
    select: { id: true, documentTitle: true, content: true },
  });

  return chunks
    .map((c) => {
      const low = c.content.toLowerCase();
      const score = keywords.reduce((n, k) => (low.includes(k) ? n + 1 : n), 0);
      return { chunk: c, score };
    })
    .filter((s) => s.score >= MIN_SCORE) // tak lolos ambang — jangan mengarang
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.chunk);
}

// Jalur vector — pgvector, cosine distance (<=>). Prisma tak bisa menanyakan
// kolom Unsupported("vector"), jadi harus raw.
// ponytail: tanpa index (ivfflat/hnsw) — korpus tata tertib cuma puluhan chunk,
// full scan lebih cepat daripada index di ukuran ini. Tambah index kalau tembus ribuan.
async function vectorSearch(
  narrativeSummary: string,
  where: PolicyWhere
): Promise<PolicyChunk[]> {
  const vec = await embed(narrativeSummary);
  if (!vec) return []; // tanpa key / vendor gagal -> hybrid degradasi ke keyword

  // Filter judul disamakan dengan `where` jalur keyword; $queryRaw tak menerima
  // objek `where` Prisma, jadi disusun sebagai fragmen SQL ter-parameter.
  const pattern = `${UU_TITLE_PREFIX}%`;
  const titleFilter =
    "documentTitle" in where
      ? Prisma.sql`"documentTitle" LIKE ${pattern}`
      : Prisma.sql`"documentTitle" NOT LIKE ${pattern}`;

  const rows = await prisma.$queryRaw<(PolicyChunk & { distance: number })[]>`
    SELECT id, "documentTitle", content, embedding <=> ${toVectorLiteral(vec)}::vector AS distance
    FROM "SchoolPolicyChunk"
    WHERE embedding IS NOT NULL
      AND ${titleFilter}
    ORDER BY distance ASC
    LIMIT ${VECTOR_CANDIDATES}
  `;

  return rows.filter((r) => r.distance <= MAX_DISTANCE).map(({ id, documentTitle, content }) => ({
    id,
    documentTitle,
    content,
  }));
}

// Retrieval hybrid bersama (dipakai tata tertib & UU). `where` menyaring baris
// mana yang dicari; scoring/quote/explain identik supaya tak ada duplikasi logika.
async function retrieve(
  narrativeSummary: string,
  where: PolicyWhere
): Promise<{ id: string; documentTitle: string; quote: string; reasoning: string }[]> {
  const keywords = extractKeywords(narrativeSummary);

  // Dua jalur paralel — jalur vector menunggu vendor, jalur keyword tidak perlu ikut menunggu.
  const [keywordHits, vectorHits] = await Promise.all([
    keywordSearch(keywords, where),
    vectorSearch(narrativeSummary, where),
  ]);

  const hits = mergeVectorFirst(vectorHits, keywordHits);
  if (hits.length === 0) return []; // kedua jalur kosong — jangan mengarang

  return Promise.all(
    hits.map(async (chunk) => {
      // Hit yang hanya datang dari jalur vector bisa saja tak memuat satu pun
      // keyword; pickQuote sudah menangani itu (fallback ke ~240 char pertama).
      const quote = pickQuote(chunk.content, keywords);
      return {
        id: chunk.id,
        documentTitle: chunk.documentTitle,
        quote,
        reasoning: await explain(narrativeSummary, quote),
      };
    })
  );
}

export async function recommendArticles(
  narrativeSummary: string
): Promise<PolicyRecommendation[]> {
  const rows = await retrieve(narrativeSummary, {
    NOT: { documentTitle: { startsWith: UU_TITLE_PREFIX } },
  });
  return rows.map((r) => ({ chunkId: r.id, quote: r.quote, reasoning: r.reasoning }));
}

// Pasal UU (documentTitle awalan "UU "). Section perundang-undangan di narasi kasus.
export async function recommendLaws(
  narrativeSummary: string
): Promise<{ pasal: string; kutipan: string; alasan: string }[]> {
  const rows = await retrieve(narrativeSummary, {
    documentTitle: { startsWith: UU_TITLE_PREFIX },
  });
  return rows.map((r) => ({ pasal: r.documentTitle, kutipan: r.quote, alasan: r.reasoning }));
}
