import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, createHash, createCipheriv } from "node:crypto";

const prisma = new PrismaClient();

// Format hash harus sama dengan lib/password.ts: "saltHex:hashHex"
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// Cermin lib/identity-crypto.ts: AES-256-GCM, blob [iv 12B][tag 16B][ct].
function encryptIdentity(plaintext) {
  const key = Buffer.from(process.env.IDENTITY_ENCRYPTION_KEY, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return new Uint8Array(Buffer.concat([iv, cipher.getAuthTag(), enc]));
}
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ── Staf (login demo: bk@sekolah.sch.id / lindra-demo) ──────────────────────
const STAFF = [
  { name: "Bu Rina (BK)", email: "bk@sekolah.sch.id", role: "bk" },
  { name: "Bu Sari (BK)", email: "sari@sekolah.sch.id", role: "bk" },
  { name: "Bu Bima (BK)", email: "bima@sekolah.sch.id", role: "bk" },
  { name: "Pak Dimas (Satgas)", email: "satgas@disdik.go.id", role: "satgas" },
];
const staffId = {};
for (const acc of STAFF) {
  const s = await prisma.staffAccount.upsert({
    where: { email: acc.email },
    update: { name: acc.name, role: acc.role },
    create: { ...acc, passwordHash: hashPassword("lindra-demo") },
  });
  staffId[acc.email] = s.id;
  console.log(`Seeded staff: ${acc.email} (${acc.name})`);
}
const RINA = staffId["bk@sekolah.sch.id"];
const SARI = staffId["sari@sekolah.sch.id"];
const BIMA = staffId["bima@sekolah.sch.id"];

// ── Laporan ─────────────────────────────────────────────────────────────────
// dest default dashboard-bk (antrean BK). SEC-* = uji keamanan bypass: guru-staf →
// satgas-eksternal & orangtua-wali → sapa129 TAK PERNAH muncul di antrean BK.
// Reuse id seed-r1..r4 (audit_log append-only → tak bisa hapus laporan lama).
// chat: [sender, content] — "belum dibaca" = pesan siswa setelah balasan staf terakhir.
const D = (iso) => new Date(iso); // WIB offset ditulis eksplisit di string

const REPORTS = [
  { id: "seed-r2", code: "DUMMY-01", urgency: "kritis", status: "ditinjau", handling: "belum-diassign", assign: null,
    at: "2026-07-07T11:25:00+07:00",
    narrative: "Siswa menyatakan bahwa seorang kakak kelas terus mengirim pesan yang mengancam dan mempermalukannya di grup kelas.",
    chat: [["student", "kak, aku takut buka hp. pesannya makin parah."]] },

  { id: "seed-r1", code: "DUMMY-02", urgency: "tinggi", status: "ditinjau", handling: "investigasi", assign: RINA,
    anon: false, identity: "Rani Pramesti, kelas 8B", at: "2026-07-07T11:25:00+07:00",
    narrative: "Siswa menyatakan bahwa ia berkali-kali diejek dan didorong oleh beberapa teman sekelasnya saat jam istirahat di koridor.",
    chat: [["student", "aku mau cerita lagi soal kejadian kemarin."], ["staff", "terima kasih sudah cerita. kamu aman di sini."], ["student", "tadi mereka ejek lagi pas olahraga."], ["student", "aku jadi nggak mau ke sekolah besok."]] },

  { id: "seed-b03", code: "DUMMY-03", urgency: "sedang", status: "ditinjau", handling: "dijadwalkan", assign: SARI,
    at: "2026-07-07T05:45:00+07:00",
    narrative: "Siswa menyatakan bahwa ia takut berangkat sekolah dan lebih sering menyendiri agar tidak jadi sasaran.",
    chat: [["staff", "kita jadwalkan ngobrol ya, kamu pilih waktunya."], ["student", "boleh kak, makasih."]] },

  { id: "seed-b04", code: "DUMMY-04", urgency: "tinggi", status: "ditinjau", handling: "eskalasi-hukum", assign: BIMA,
    at: "2026-07-07T05:44:00+07:00",
    narrative: "Siswa menyatakan bahwa ia ingin membuat laporan agar pihak sekolah dapat membantu menyelesaikan masalah yang dialaminya." },

  { id: "seed-b05", code: "DUMMY-05", urgency: "sedang", status: "terkirim", handling: "belum-diassign", assign: null,
    at: "2026-07-06T16:20:00+07:00",
    narrative: "Siswa merasa tidak nyaman dengan perkataan teman yang merendahkan dirinya di depan umum." },

  { id: "seed-b06", code: "DUMMY-06", urgency: "tinggi", status: "terkirim", handling: "belum-diassign", assign: null,
    at: "2026-07-06T14:10:00+07:00",
    narrative: "Siswa menyatakan bahwa ia berkali-kali dipaksa menyerahkan uang jajannya oleh kakak kelas di kamar mandi sekolah." },

  { id: "seed-b07", code: "DUMMY-07", urgency: "rendah", status: "terkirim", handling: "belum-diassign", assign: null,
    at: "2026-07-06T10:05:00+07:00",
    narrative: "Siswa merasa sering dikucilkan dari kelompok belajar dan tidak diajak bicara oleh teman-teman sekelas." },

  { id: "seed-b08", code: "DUMMY-08", urgency: "sedang", status: "ditinjau", handling: "dijadwalkan", assign: RINA,
    at: "2026-07-05T13:30:00+07:00",
    narrative: "Siswa menyatakan bahwa foto dirinya yang memalukan disebarkan di grup angkatan tanpa izin." },

  { id: "seed-b09", code: "DUMMY-09", urgency: "kritis", status: "terkirim", handling: "belum-diassign", assign: null,
    at: "2026-07-05T08:15:00+07:00",
    narrative: "Siswa menyatakan bahwa ia diancam akan dipukul sepulang sekolah kalau melapor ke guru.",
    chat: [["student", "kak, aku beneran takut pulang sendiri hari ini."]] },

  { id: "seed-b10", code: "DUMMY-10", urgency: "rendah", status: "terkirim", handling: "belum-diassign", assign: null,
    at: "2026-07-04T15:40:00+07:00",
    narrative: "Siswa merasa sering menjadi bahan ejekan teman soal logat dan cara bicaranya." },

  { id: "seed-b11", code: "DUMMY-11", urgency: "tinggi", status: "ditinjau", handling: "investigasi", assign: SARI,
    at: "2026-07-04T09:20:00+07:00",
    narrative: "Siswa menyatakan bahwa barang-barangnya sering disembunyikan dan sengaja dirusak oleh beberapa teman." },

  // ── Selesai (Riwayat Selesai) ──
  { id: "seed-b12", code: "DUMMY-12", urgency: "sedang", status: "selesai", handling: "selesai", assign: RINA,
    at: "2026-07-02T11:00:00+07:00",
    narrative: "Cekcok antar teman yang sempat memanas; sudah dimediasi dan kedua pihak berdamai." },

  { id: "seed-b13", code: "DUMMY-13", urgency: "rendah", status: "selesai", handling: "selesai", assign: null,
    at: "2026-07-01T16:45:00+07:00",
    narrative: "Salah paham di grup chat kelas; sudah diklarifikasi dan tidak berlanjut." },

  { id: "seed-b14", code: "DUMMY-14", urgency: "tinggi", status: "selesai", handling: "selesai", assign: BIMA,
    at: "2026-06-30T10:30:00+07:00",
    narrative: "Intimidasi berulang oleh senior; sudah ditindaklanjuti dan pelaku dibina bersama wali kelas." },

  { id: "seed-b15", code: "DUMMY-15", urgency: "sedang", status: "selesai", handling: "selesai", assign: SARI,
    at: "2026-06-29T13:15:00+07:00",
    narrative: "Ejekan soal penampilan fisik; sudah dilakukan pembinaan dan pemantauan berkala." },

  // ── UJI KEAMANAN — TAK BOLEH muncul di antrean BK ──
  { id: "seed-r3", code: "SEC-GURU", destination: "satgas-eksternal", perpetratorRole: "guru-staf",
    urgency: "tinggi", status: "ditinjau", handling: "belum-diassign", assign: null, urgentVisum: true,
    violenceType: ["seksual"], at: "2026-07-07T09:00:00+07:00",
    narrative: "Siswa menyatakan bahwa seorang guru memintanya bertemu berdua lalu melakukan hal yang membuatnya sangat tidak nyaman. [PENANDA-GURU-STAF]" },

  { id: "seed-r4", code: "SEC-ORTU", destination: "sapa129", perpetratorRole: "orangtua-wali",
    urgency: "tinggi", status: "terkirim", handling: "belum-diassign", assign: null,
    violenceType: ["fisik"], at: "2026-07-06T20:00:00+07:00",
    narrative: "Siswa menyatakan bahwa ia sering dipukul di rumah oleh walinya saat nilainya turun. [PENANDA-ORTU-WALI]" },
];

for (const r of REPORTS) {
  const hash = sha256(r.narrative);
  const createdAt = D(r.at);
  const data = {
    isAnonymous: r.anon ?? true,
    identityData: r.identity ? encryptIdentity(r.identity) : null,
    narrative: r.narrative,
    urgencyLevel: r.urgency,
    perpetratorRole: r.perpetratorRole ?? "siswa",
    locationCategory: "dalam-sekolah",
    violenceType: r.violenceType ?? ["verbal"],
    urgentVisum: r.urgentVisum ?? false,
    status: r.status,
    handlingStatus: r.handling,
    assignedToId: r.assign ?? null,
    contentHash: hash,
    createdAt,
  };
  await prisma.report.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });

  const destination = r.destination ?? "dashboard-bk";
  await prisma.routingLog.upsert({
    where: { id: `${r.id}-log` },
    update: { destination, hashAtSend: hash, openedAt: null },
    create: { id: `${r.id}-log`, reportId: r.id, destination, hashAtSend: hash },
  });
  await prisma.referralCode.upsert({
    where: { id: `${r.id}-ref` },
    update: { code: r.code },
    create: { id: `${r.id}-ref`, reportId: r.id, code: r.code },
  });

  // Chat konsultasi — thread per laporan; pesan idempotent by id.
  if (r.chat?.length) {
    await prisma.chatThread.upsert({
      where: { id: `${r.id}-thread` },
      update: {},
      create: { id: `${r.id}-thread`, reportId: r.id, staffId: r.assign ?? null },
    });
    for (let i = 0; i < r.chat.length; i++) {
      const [sender, content] = r.chat[i];
      const mAt = new Date(createdAt.getTime() + i * 60_000);
      await prisma.chatMessage.upsert({
        where: { id: `${r.id}-m${i}` },
        update: { sender, content, createdAt: mAt },
        create: { id: `${r.id}-m${i}`, threadId: `${r.id}-thread`, sender, content, createdAt: mAt },
      });
    }
  }
  console.log(`Seeded report ${r.code} (${r.id}) -> ${destination}`);
}

await prisma.$disconnect();
