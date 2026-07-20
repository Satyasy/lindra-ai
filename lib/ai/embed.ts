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

// Vendor bisa diganti via env selama endpoint-nya OpenAI-compatible dan modelnya
// bisa 1536 dim (Gemini via .../v1beta/openai/embeddings, Cohere compat, dst.).
// Ganti vendor/model = vektor lama tak kompatibel → re-ingest korpus dokumen.
const EMBEDDING_URL = process.env.EMBEDDING_BASE_URL ?? "https://api.openai.com/v1/embeddings";

const MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

// Dimensi adalah properti MODEL di atas, jadi tinggal serumah dengannya — ini
// satu-satunya tempat yang bisa membuatnya benar. Harus sama dengan vector(N)
// pada SchoolPolicyChunk.embedding (prisma/schema.prisma). Ganti model =
// ganti angka ini + migration kolomnya, sekaligus.
export const EMBEDDING_DIMENSION = 1536;

export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) return null;

  const input = text.trim();
  if (!input) return null;

  try {
    const res = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      // dimensions eksplisit: default Gemini 3072, OpenAI v3 juga menerimanya —
      // memaksa keduanya cocok dengan vector(1536) di skema.
      body: JSON.stringify({ model: MODEL, input, dimensions: EMBEDDING_DIMENSION }),
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
