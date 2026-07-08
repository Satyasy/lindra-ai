import { encryptToBase64, decryptFromBase64 } from "./identity-crypto";
import type { TranscriptTurn } from "./ai/classify-narrative";

// rawTranscript disimpan TERENKRIPSI (AES-256-GCM, reuse identity-crypto): kolom Json
// memuat { enc: base64 } — bukan array plaintext. Tak perlu kolom/model baru.
// Backward-compat: array lama (plaintext) tetap terbaca & otomatis ter-seal saat
// write berikutnya. Sumber tunggal baca/tulis transkrip siswa.

export function readTranscript(raw: unknown): TranscriptTurn[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TranscriptTurn[]; // legacy plaintext
  const enc = (raw as { enc?: unknown }).enc;
  if (typeof enc !== "string") return [];
  try {
    const parsed = JSON.parse(decryptFromBase64(enc));
    return Array.isArray(parsed) ? (parsed as TranscriptTurn[]) : [];
  } catch {
    return [];
  }
}

export function sealTranscript(turns: TranscriptTurn[]): { enc: string } {
  return { enc: encryptToBase64(JSON.stringify(turns)) };
}
