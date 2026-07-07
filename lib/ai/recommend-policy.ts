// ============================================================
// STUB — modul milik Nabil (pipeline RAG rekomendasi pasal tata tertib).
// Versi asli: retrieval dari SchoolPolicyChunk (keyword dulu, pgvector
// kalau sempat), generation dengan kutipan asli, array kosong bila tak cocok.
// ============================================================

export interface PolicyRecommendation {
  chunkId: string;
  quote: string;
  reasoning: string;
}

export async function recommendArticles(
  _narrativeSummary: string
): Promise<PolicyRecommendation[]> {
  return []; // jangan pernah mengarang kecocokan
}
