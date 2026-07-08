import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM untuk Report.identityData — default anonim, identitas hanya
// tersimpan terenkripsi saat siswa memilih "kirim dengan nama".
// Layout blob: [iv 12B][authTag 16B][ciphertext]

function key(): Buffer {
  const hex = process.env.IDENTITY_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("IDENTITY_ENCRYPTION_KEY harus 32 byte hex (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

// Uint8Array baru (bukan Buffer) — tipe kolom Bytes Prisma 6 menuntut ArrayBuffer murni
export function encryptIdentity(plaintext: string): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return new Uint8Array(Buffer.concat([iv, cipher.getAuthTag(), enc]));
}

export function decryptIdentity(blob: Uint8Array): string {
  const buf = Buffer.from(blob);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// Untuk kolom String (mis. Followup.contactEmail) — blob terenkripsi disimpan base64,
// bukan plaintext. Reuse AES-256-GCM di atas.
export function encryptToBase64(plaintext: string): string {
  return Buffer.from(encryptIdentity(plaintext)).toString("base64");
}

export function decryptFromBase64(b64: string): string {
  return decryptIdentity(new Uint8Array(Buffer.from(b64, "base64")));
}
