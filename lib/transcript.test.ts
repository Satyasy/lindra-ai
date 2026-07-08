import { describe, it, expect, beforeAll } from "vitest";
import { sealTranscript, readTranscript } from "./transcript";
import type { TranscriptTurn } from "./ai/classify-narrative";

// Jalur keamanan: transkrip siswa harus tersimpan ciphertext & round-trip utuh.
beforeAll(() => {
  process.env.IDENTITY_ENCRYPTION_KEY = "0".repeat(64); // key dummy 32-byte hex
});

const turns: TranscriptTurn[] = [
  { role: "user", content: "rahasia-siswa", ts: "2026-07-08T00:00:00Z" },
  { role: "assistant", content: "aku dengar kamu", ts: "2026-07-08T00:00:05Z" },
];

describe("transcript seal/read", () => {
  it("seals to ciphertext (bukan plaintext) lalu round-trip utuh", () => {
    const sealed = sealTranscript(turns);
    expect(typeof sealed.enc).toBe("string");
    expect(JSON.stringify(sealed)).not.toContain("rahasia-siswa");
    expect(readTranscript(sealed)).toEqual(turns);
  });

  it("tetap baca array plaintext lama (backward-compat)", () => {
    expect(readTranscript(turns)).toEqual(turns);
  });

  it("kembalikan [] untuk null / ciphertext rusak", () => {
    expect(readTranscript(null)).toEqual([]);
    expect(readTranscript({ enc: "bukan-ciphertext-valid" })).toEqual([]);
  });
});
