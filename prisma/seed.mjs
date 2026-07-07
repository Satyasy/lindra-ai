import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Format hash harus sama dengan lib/password.ts: "saltHex:hashHex"
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

for (const acc of [
  { name: "Bu Rina (BK)", email: "bk@sekolah.sch.id", role: "bk" },
  { name: "Pak Dimas (Satgas)", email: "satgas@disdik.go.id", role: "satgas" },
]) {
  await prisma.staffAccount.upsert({
    where: { email: acc.email },
    update: {},
    create: { ...acc, passwordHash: hashPassword("lindra-demo") },
  });
  console.log(`Seeded staff: ${acc.email} (password: lindra-demo)`);
}

await prisma.$disconnect();
