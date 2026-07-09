import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

// Auth (FASE 1 #8, bagian KDF): password di-hash scrypt (memory-hard) format
// "salt:hash", verifikasi konstan-waktu. Uji password salah & hash rusak DITOLAK.
describe("password — scrypt hash & verify", () => {
  const pw = "rahasia-guru-bk-2026";

  it("format tersimpan = saltHex:hashHex (bukan plaintext)", () => {
    const stored = hashPassword(pw);
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(stored).not.toContain(pw);
  });

  it("password benar → verify true", () => {
    expect(verifyPassword(pw, hashPassword(pw))).toBe(true);
  });

  it("password salah → verify false (NEGATIVE)", () => {
    expect(verifyPassword("salah-total", hashPassword(pw))).toBe(false);
  });

  it("salt acak → dua hash password sama berbeda, keduanya tetap verify", () => {
    const a = hashPassword(pw);
    const b = hashPassword(pw);
    expect(a).not.toBe(b);
    expect(verifyPassword(pw, a)).toBe(true);
    expect(verifyPassword(pw, b)).toBe(true);
  });

  it("hash rusak/format salah → verify false, tidak throw (NEGATIVE)", () => {
    expect(verifyPassword(pw, "bukan-format-valid")).toBe(false);
    expect(verifyPassword(pw, "")).toBe(false);
  });
});
