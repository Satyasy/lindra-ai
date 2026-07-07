export const SLA_THRESHOLD_HOURS = Number(process.env.SLA_THRESHOLD_HOURS ?? 48);

// Harus sama dengan dimensi vector(N) di prisma/schema.prisma (SchoolPolicyChunk.embedding).
// Koordinasikan dengan Nabil sebelum mengubah — placeholder sampai model embedding dipilih.
export const EMBEDDING_DIMENSION = 1536;
