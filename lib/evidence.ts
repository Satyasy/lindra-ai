// Label & tampilan bukti — nama file asli siswa TIDAK PERNAH dipakai (privasi
// terkunci sejak W3: kolom Evidence.filename sudah disanitize jadi "bukti-<uuid>.ext").
// Referensi bukti = baris tabel Evidence (query per reportId), BUKAN blok JSON di
// ReportDraft — ReportDraft disusun ulang AI dari transkrip tiap compose dan tak
// pernah tahu file yang diupload, jadi ID-nya tak bisa hidup di sana.
// ponytail: label diturunkan saat render dari mimeType+index, tak perlu kolom label.

export const NO_EVIDENCE_SENTINEL = "Tidak ada bukti dilampirkan";

export type EvidenceKind = "foto" | "dokumen";

export function evidenceKind(mimeType: string): EvidenceKind {
  return mimeType.startsWith("image/") ? "foto" : "dokumen";
}

// "Bukti 1 (foto)" — generik, tanpa nama asli. index 0-based.
export function evidenceLabel(mimeType: string, index: number): string {
  return `Bukti ${index + 1} (${evidenceKind(mimeType)})`;
}
