import { describe, expect, it, beforeAll } from "vitest";
import {
  encryptIdentity,
  decryptIdentity,
  encryptToBase64,
  decryptFromBase64,
} from "./identity-crypto";

// Enkripsi at-rest (FASE 1 #3): identityData & Followup.contactEmail WAJIB tersimpan
// ciphertext, dekripsi mengembalikan asli, dan tag GCM menolak blob yang dirusak.
beforeAll(() => {
  process.env.IDENTITY_ENCRYPTION_KEY =
    process.env.IDENTITY_ENCRYPTION_KEY ??
    "0000000000000000000000000000000000000000000000000000000000000000";
});

describe("identity-crypto — AES-256-GCM at-rest", () => {
  const plain = "Budi Santoso, kelas 8B, 0812-3456-7890";

  it("round-trip: dekripsi mengembalikan plaintext asli", () => {
    expect(decryptIdentity(encryptIdentity(plain))).toBe(plain);
  });

  it("blob TIDAK memuat plaintext terbaca (ciphertext, bukan plaintext)", () => {
    const blob = Buffer.from(encryptIdentity(plain));
    expect(blob.toString("utf8")).not.toContain("Budi");
    expect(blob.toString("latin1")).not.toContain("0812");
  });

  it("IV acak → dua enkripsi plaintext sama menghasilkan blob berbeda", () => {
    const a = Buffer.from(encryptIdentity(plain)).toString("hex");
    const b = Buffer.from(encryptIdentity(plain)).toString("hex");
    expect(a).not.toBe(b);
  });

  it("base64 variant (contactEmail) round-trip", () => {
    const email = "wali.budi@example.com";
    const stored = encryptToBase64(email);
    expect(stored).not.toContain("@example.com");
    expect(decryptFromBase64(stored)).toBe(email);
  });

  it("blob dirusak (tag GCM tak cocok) → dekripsi DITOLAK", () => {
    const blob = Buffer.from(encryptIdentity(plain));
    blob[blob.length - 1] ^= 0xff; // flip byte ciphertext terakhir
    expect(() => decryptIdentity(new Uint8Array(blob))).toThrow();
  });

  it("kunci salah → dekripsi DITOLAK (bukan mengembalikan sampah)", () => {
    const blob = encryptIdentity(plain);
    const orig = process.env.IDENTITY_ENCRYPTION_KEY;
    process.env.IDENTITY_ENCRYPTION_KEY =
      "1111111111111111111111111111111111111111111111111111111111111111";
    expect(() => decryptIdentity(blob)).toThrow();
    process.env.IDENTITY_ENCRYPTION_KEY = orig;
  });
});
