import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt dari node:crypto — KDF password yang sah tanpa dependency bcrypt.
// Format simpan: "saltHex:hashHex" (harus sama dengan prisma/seed.mjs)
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
}
