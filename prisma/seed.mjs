import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Format hash harus sama dengan lib/password.ts: "saltHex:hashHex"
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const staff = await prisma.staffAccount.upsert({
  where: { email: "bk@sekolah.sch.id" },
  update: {},
  create: {
    name: "Bu Rina (BK)",
    email: "bk@sekolah.sch.id",
    passwordHash: hashPassword("lindra-demo"),
    role: "bk",
  },
});
console.log(`Seeded staff: ${staff.email} (password: lindra-demo)`);

await prisma.$disconnect();
