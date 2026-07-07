import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, createHash, createCipheriv } from "node:crypto";

const prisma = new PrismaClient();

// Format hash harus sama dengan lib/password.ts: "saltHex:hashHex"
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// Cermin lib/identity-crypto.ts: AES-256-GCM, blob [iv 12B][tag 16B][ct].
// Pakai IDENTITY_ENCRYPTION_KEY yang sama dengan app agar reveal bisa dekripsi.
function encryptIdentity(plaintext) {
  const key = Buffer.from(process.env.IDENTITY_ENCRYPTION_KEY, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return new Uint8Array(Buffer.concat([iv, cipher.getAuthTag(), enc]));
}
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

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

// Laporan seed — demo juri + UJI KEAMANAN bypass (DESIGN.md §6, routing-engine).
// guru-staf -> satgas-eksternal, orangtua-wali -> sapa129: keduanya TAK PERNAH
// dashboard-bk. Antrean BK memfilter destination=dashboard-bk, jadi seed-r3/r4
// (bertanda PENANDA-*) tidak boleh muncul di antrean BK.
const REPORTS = [
  {
    id: "seed-r1", code: "a1b2c3d4", destination: "dashboard-bk",
    isAnonymous: true, urgencyLevel: "sedang", perpetratorRole: "siswa",
    locationCategory: "dalam-sekolah", violenceType: ["fisik", "verbal"], status: "ditinjau",
    narrative:
      "Siswa menyatakan bahwa ia berkali-kali diejek dan didorong oleh beberapa teman sekelasnya saat jam istirahat di koridor. Ia mulai takut berangkat sekolah dan lebih sering menyendiri agar tidak jadi sasaran.",
  },
  {
    id: "seed-r2", code: "b2c3d4e5", destination: "dashboard-bk",
    isAnonymous: false, identity: "Rani Pramesti, kelas 8B",
    urgencyLevel: "tinggi", perpetratorRole: "siswa", locationCategory: "dalam-sekolah",
    violenceType: ["verbal"], status: "terkirim",
    narrative:
      "Siswa menyatakan bahwa seorang kakak kelas terus mengirim pesan yang mengancam dan mempermalukannya di grup kelas. Ia merasa cemas dan sulit berkonsentrasi belajar.",
  },
  {
    id: "seed-r3", code: "c3d4e5f6", destination: "satgas-eksternal",
    isAnonymous: true, urgencyLevel: "tinggi", perpetratorRole: "guru-staf",
    locationCategory: "dalam-sekolah", violenceType: ["seksual"], urgentVisum: true, status: "ditinjau",
    narrative:
      "Siswa menyatakan bahwa seorang guru memintanya bertemu berdua lalu melakukan hal yang membuatnya sangat tidak nyaman dan takut bercerita. [PENANDA-GURU-STAF]",
  },
  {
    id: "seed-r4", code: "d4e5f6a7", destination: "sapa129",
    isAnonymous: true, urgencyLevel: "tinggi", perpetratorRole: "orangtua-wali",
    locationCategory: "dalam-sekolah", violenceType: ["fisik"], status: "terkirim",
    narrative:
      "Siswa menyatakan bahwa ia sering dipukul di rumah oleh walinya saat nilainya turun, dan tidak tahu harus meminta tolong ke siapa. [PENANDA-ORTU-WALI]",
  },
];

for (const r of REPORTS) {
  const hash = sha256(r.narrative);
  const data = {
    isAnonymous: r.isAnonymous,
    identityData: r.identity ? encryptIdentity(r.identity) : null,
    narrative: r.narrative,
    urgencyLevel: r.urgencyLevel,
    perpetratorRole: r.perpetratorRole,
    locationCategory: r.locationCategory,
    violenceType: r.violenceType,
    urgentVisum: r.urgentVisum ?? false,
    status: r.status,
    contentHash: hash,
  };
  await prisma.report.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });
  await prisma.routingLog.upsert({
    where: { id: `${r.id}-log` },
    update: { destination: r.destination, hashAtSend: hash, openedAt: null },
    create: { id: `${r.id}-log`, reportId: r.id, destination: r.destination, hashAtSend: hash },
  });
  await prisma.referralCode.upsert({
    where: { id: `${r.id}-ref` },
    update: { code: r.code },
    create: { id: `${r.id}-ref`, reportId: r.id, code: r.code },
  });
  console.log(`Seeded report ${r.id} -> ${r.destination}`);
}

await prisma.$disconnect();
