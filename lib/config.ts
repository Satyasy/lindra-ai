export const SLA_THRESHOLD_HOURS = Number(process.env.SLA_THRESHOLD_HOURS ?? 48);

// Harus sama dengan dimensi vector(N) di prisma/schema.prisma (SchoolPolicyChunk.embedding).
// Koordinasikan dengan Nabil sebelum mengubah — placeholder sampai model embedding dipilih.
export const EMBEDDING_DIMENSION = 1536;

// Gate retrieval pasal UU pada narasi rekomendasi kasus. Default OFF: section UU
// disembunyikan TOTAL dari response (beda dgn "dicari tapi kosong"). Retrieval nyata
// belum diimplementasi — lihat lib/ai/recommend-action.ts retrieveUU().
export const UU_RETRIEVAL_ENABLED = process.env.UU_RETRIEVAL_ENABLED === "true";
