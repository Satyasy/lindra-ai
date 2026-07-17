// Ingest dokumen tata tertib / UU ke SchoolPolicyChunk — sumber data retrieval
// pasal (lib/ai/recommend-policy.ts). Dipakai halaman /bk/dokumen.
//
// Chunking sengaja naif: 1 paragraf (dipisah baris kosong) = 1 chunk, idealnya
// 1 pasal per paragraf. Itu bukan detail sepele — kualitas retrieval BERDIRI di
// atasnya. Satu chunk = satu unit yang bisa dikutip ke petugas BK dan satu
// embedding. Dokumen tanpa batas paragraf yang jelas akan jadi satu chunk raksasa
// (retrieval selalu mengembalikan "seluruh dokumen" = tak berguna), dan yang
// terpecah per-baris jadi remah kalimat yang tak bermakna sebagai kutipan.
// Itulah alasan hanya teks polos yang diterima — lihat ACCEPTED_EXTENSIONS.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { embed, toVectorLiteral } from "./embed";

// Hanya teks polos. PDF/DOCX sengaja TIDAK didukung: ekstraksi teks dari keduanya
// menghancurkan batas paragraf yang jadi tumpuan chunker di atas, jadi hasilnya
// bukan "RAG yang jalan" tapi "RAG yang diam-diam buruk" — kutipan ngawur ke
// petugas BK di produk keselamatan. Simpan sebagai .txt/.md dulu.
export const ACCEPTED_EXTENSIONS = [".txt", ".md"] as const;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // dokumen aturan itu teks; 2MB sudah sangat longgar

// Panjang minimum sebuah paragraf untuk dianggap chunk — membuang judul, nomor
// halaman, dan baris hiasan.
const MIN_CHUNK_CHARS = 15;

export interface DocumentSummary {
  title: string;
  chunks: number;
  embedded: number;
  createdAt: Date;
}

// Murni & tanpa I/O — inti kualitas retrieval, jadi diuji terpisah.
export function chunkText(raw: string): string[] {
  return raw
    .split(/\n\s*\n/) // paragraf = dipisah baris kosong
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c) => c.length >= MIN_CHUNK_CHARS);
}

// id deterministik dari judul+isi → re-upload dokumen yang sama tak menggandakan baris.
function chunkId(title: string, content: string): string {
  return "pol-" + createHash("sha1").update(title + "|" + content).digest("hex").slice(0, 16);
}

export function isAcceptedFilename(name: string): boolean {
  return ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

// Idempoten: chunk lama dengan judul SAMA dihapus dulu, lalu diisi ulang. Jadi
// upload ulang = mengganti dokumen, bukan menumpuk versi.
export async function ingestDocument(
  title: string,
  raw: string
): Promise<{ chunks: number; embedded: number }> {
  const chunks = chunkText(raw);
  if (chunks.length === 0) {
    throw new Error(
      "Tidak ada paragraf yang bisa diambil dari file. Pastikan antar-pasal dipisah baris kosong."
    );
  }

  await prisma.schoolPolicyChunk.deleteMany({ where: { documentTitle: title } });

  let embedded = 0;
  // ponytail: embed berurutan. Korpus aturan sekolah cuma puluhan paragraf jadi
  // ini hitungan detik; pakai input array (batch) kalau sudah ribuan.
  for (const content of chunks) {
    const id = chunkId(title, content);
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

  return { chunks: chunks.length, embedded };
}

// Daftar dokumen = chunk yang dikelompokkan per judul; tak ada tabel dokumen
// terpisah. `embedded` sengaja ditampilkan ke petugas: itu satu-satunya sinyal
// bahwa jalur vector benar-benar hidup untuk dokumen ini. 0/N = dokumen hanya
// bisa ditemukan lewat kata kunci (biasanya EMBEDDING_API_KEY kosong).
// COUNT(embedding) hanya menghitung yang non-NULL. Raw karena Prisma tak bisa
// menyentuh kolom Unsupported("vector").
export async function listDocuments(): Promise<DocumentSummary[]> {
  return prisma.$queryRaw<DocumentSummary[]>`
    SELECT "documentTitle" AS title,
           COUNT(*)::int AS chunks,
           COUNT(embedding)::int AS embedded,
           MIN("createdAt") AS "createdAt"
    FROM "SchoolPolicyChunk"
    GROUP BY "documentTitle"
    ORDER BY MIN("createdAt") DESC
  `;
}

export async function deleteDocument(title: string): Promise<number> {
  const { count } = await prisma.schoolPolicyChunk.deleteMany({
    where: { documentTitle: title },
  });
  return count;
}
