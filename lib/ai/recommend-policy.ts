// ============================================================
// RAG rekomendasi pasal tata tertib — VERSI SEDERHANA (keyword matching).
// Retrieval murni keyword (BUKAN vector embedding). LLM hanya menjelaskan
// kecocokan yang sudah ditemukan keyword matching — tidak menentukannya,
// dan tidak pernah mengarang kecocokan. Modul Nabil.
// Versi vector (pgvector) ditunda — lihat Task 4 di panduan.
// ============================================================

import { prisma } from "@/lib/prisma";
import { groqChat } from "./groq-client";

export interface PolicyRecommendation {
  chunkId: string;
  quote: string;
  reasoning: string;
}

const MIN_SCORE = 2; // ambang minimal jumlah kata kunci yang cocok
const MAX_RESULTS = 5;

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

export async function recommendArticles(
  narrativeSummary: string
): Promise<PolicyRecommendation[]> {
  const keywords = extractKeywords(narrativeSummary);
  if (keywords.length === 0) return [];

  // TODO: verifikasi nama field asli ke tim backend.
  // Skema saat ini: SchoolPolicyChunk { id, content } — tidak ada "articleNumber".
  const chunks = await prisma.schoolPolicyChunk.findMany({
    select: { id: true, content: true },
  });

  const scored = chunks
    .map((c) => {
      const low = c.content.toLowerCase();
      const score = keywords.reduce((n, k) => (low.includes(k) ? n + 1 : n), 0);
      return { chunk: c, score };
    })
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  if (scored.length === 0) return []; // tak ada yang lolos ambang — jangan mengarang

  return Promise.all(
    scored.map(async ({ chunk }) => {
      const quote = pickQuote(chunk.content, keywords);
      return { chunkId: chunk.id, quote, reasoning: await explain(narrativeSummary, quote) };
    })
  );
}
