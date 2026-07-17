// Embedding vektor untuk retrieval hybrid (lib/ai/recommend-policy.ts).
//
// Groq TIDAK punya endpoint embeddings — API-nya cuma chat/audio/models/batches/
// files/fine-tuning. Itu sebabnya kolom SchoolPolicyChunk.embedding kosong sejak
// awal. Jadi ini vendor KEDUA, dan satu-satunya tempat di kode yang menghubunginya.
//
// Yang dikirim ke vendor: teks pasal saat ingest (dokumen publik), dan
// narrativeSummary saat BK membuka rekomendasi. Yang TIDAK pernah dikirim:
// transkrip mentah, identitas, atau bukti.
//
// Pola fallback sengaja identik dengan groqChat(): kembalikan null, jangan throw.
// Pemanggil degradasi ke keyword-only. Vendor down != fitur mati.

import { EMBEDDING_DIMENSION } from "@/lib/config";

const EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

// 1536 dim — cocok persis dengan vector(1536) di prisma/schema.prisma, jadi tak
// perlu migration. Ganti model = ganti EMBEDDING_DIMENSION + kolomnya sekaligus.
const MODEL = "text-embedding-3-small";

export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) return null;

  const input = text.trim();
  if (!input) return null;

  try {
    const res = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, input }),
    });
    if (!res.ok) return null;

    const vec = (await res.json())?.data?.[0]?.embedding;
    // Dimensi salah = kolom vector(N) akan menolak baris. Tangkap di sini, bukan
    // di Postgres, supaya pesan gagalnya jelas saat model/config tak sinkron.
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSION) return null;
    if (!vec.every((n) => typeof n === "number" && Number.isFinite(n))) return null;

    return vec as number[];
  } catch {
    return null;
  }
}

// Literal vector pgvector: '[0.1,0.2,...]'. Dipakai lewat parameter ter-bind
// ($queryRaw/$executeRaw), jadi bukan jalur injeksi — angka sudah divalidasi
// Number.isFinite di atas.
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
