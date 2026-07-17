// Ingest dokumen tata tertib / UU ke SchoolPolicyChunk (retrieval rekomendasi kasus).
//
// Pakai:
//   node --env-file=.env scripts/ingest-policy.mjs <file.txt> "Judul Dokumen"
//
// - File HARUS teks polos (.txt/.md). Word/PDF: simpan/копi dulu sebagai .txt.
// - 1 paragraf (dipisah baris kosong) = 1 chunk. Idealnya 1 pasal per paragraf,
//   biar kutipan yang muncul di BK pas.
// - Judul diawali "UU " => masuk section perundang-undangan; selain itu tata tertib.
// - Idempoten: baris lama dengan Judul yang SAMA dihapus dulu, lalu diisi ulang.
//   (Jadi untuk mengganti contoh bawaan, pakai judul "Tata Tertib Sekolah".)

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
// Dimuat langsung sebagai .ts lewat type-stripping Node 22+. embed.ts sengaja
// tanpa impor supaya ini jalan — Node tak paham alias "@/" dari tsconfig.
import { embed, toVectorLiteral } from "../lib/ai/embed.ts";

const [file, title] = process.argv.slice(2);
if (!file || !title) {
  console.error('Usage: node --env-file=.env scripts/ingest-policy.mjs <file.txt> "Judul Dokumen"');
  process.exit(1);
}

const raw = readFileSync(file, "utf8");
const chunks = raw
  .split(/\n\s*\n/) // pisah per paragraf (baris kosong)
  .map((c) => c.replace(/\s+/g, " ").trim())
  .filter((c) => c.length >= 15); // buang baris sangat pendek (judul/nomor halaman)

if (chunks.length === 0) {
  console.error("Tidak ada paragraf yang bisa diambil dari file. Pastikan antar-pasal dipisah baris kosong.");
  process.exit(1);
}

const prisma = new PrismaClient();
const removed = await prisma.schoolPolicyChunk.deleteMany({ where: { documentTitle: title } });

let embedded = 0;
// ponytail: embed satu per satu, berurutan. Korpus tata tertib cuma puluhan
// paragraf jadi ini hitungan detik; pakai input array (batch) kalau sudah ribuan.
for (const content of chunks) {
  // id deterministik dari judul+isi → aman kalau di-run ulang.
  const id = "pol-" + createHash("sha1").update(title + "|" + content).digest("hex").slice(0, 16);
  await prisma.schoolPolicyChunk.upsert({
    where: { id },
    update: { documentTitle: title, content },
    create: { id, documentTitle: title, content },
  });

  // Prisma Client tidak bisa menulis kolom Unsupported("vector") — ia tak akan
  // pernah muncul di `data` upsert di atas. Harus raw, terpisah.
  const vec = await embed(content);
  if (vec) {
    await prisma.$executeRaw`
      UPDATE "SchoolPolicyChunk" SET embedding = ${toVectorLiteral(vec)}::vector WHERE id = ${id}
    `;
    embedded++;
  }
}

console.log(`Hapus ${removed.count} chunk lama "${title}", masukkan ${chunks.length} chunk baru.`);
if (embedded === chunks.length) {
  console.log(`Embedding: ${embedded}/${chunks.length} terisi.`);
} else {
  // Jangan diam. Chunk tanpa embedding tetap bisa dicari lewat keyword, tapi ia
  // tak akan pernah muncul dari jalur vector — kegagalan senyap di sini terbaca
  // sebagai "retrieval-nya jelek", bukan "EMBEDDING_API_KEY-nya kosong".
  console.warn(
    `Embedding: ${embedded}/${chunks.length} terisi — ${chunks.length - embedded} chunk hanya bisa ` +
      `dicari lewat kata kunci. Cek EMBEDDING_API_KEY (kosong = semua dilewati) atau kuota vendor.`
  );
}
await prisma.$disconnect();
