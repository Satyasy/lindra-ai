import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

import { SESSION_MAX_AGE } from "@/lib/session";

const SESSION_COOKIE = "lindra_session";

// Batas kepercayaan: foto/PDF 10MB, video 25MB (pas di bawah nginx client_max_body_size
// 26m — jangan naikkan tanpa menaikkan nginx). Bukti bisa berisi wajah minor —
// jangan longgar soal tipe/ukuran. Validasi ini WAJIB di server; validasi klien cuma UX.
// Video disimpan APA ADANYA (tanpa transcode/kompresi): re-encode mengubah barang bukti
// (bisa berujung visum/hukum) dan ffmpeg membekukan t4g.medium yang dipakai bareng app+db.
// ponytail: bytea di Postgres — pindah ke disk/S3 bila total evidence > beberapa GB.
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
// mime → ekstensi untuk identifier internal yang disanitize (nama asli siswa dibuang).
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov", // iPhone merekam .mov — wajib didukung
};

// Cocokkan beberapa byte awal dengan MIME yang diklaim (whitelist di ALLOWED).
function magicBytesMatch(buf: Buffer, mime: string): boolean {
  const b = buf;
  switch (mime) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/webp": // "RIFF"...."WEBP"
      return b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    case "application/pdf":
      return b.toString("ascii", 0, 4) === "%PDF";
    case "video/mp4":
    case "video/quicktime": // container ISO-BMFF: [4-byte size]"ftyp" di offset 4
      return b.toString("ascii", 4, 8) === "ftyp";
    case "video/webm": // header EBML
      return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file wajib diisi" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "tipe file tidak didukung (hanya JPG/PNG/WebP/PDF)" },
      { status: 415 }
    );
  }
  const maxBytes = file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_BYTES;
  if (file.size === 0 || file.size > maxBytes) {
    return NextResponse.json(
      { error: `ukuran file maksimal ${maxBytes / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  // Sesi = cookie httpOnly, sama seperti /api/chat. Buat report kalau bukti dilampirkan
  // sebelum pesan pertama, lalu set cookie agar chat berikutnya menempel ke report yang sama.
  const cookieStore = await cookies();
  let reportId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const existing = reportId
    ? await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } })
    : null;
  let isNew = false;
  if (!existing) {
    const report = await prisma.report.create({ data: { rawTranscript: [] } });
    reportId = report.id;
    isNew = true;
    await logAction(reportId, "system", "created");
  }

  // Identifier internal disanitize — nama file asli siswa TIDAK disimpan/dilog
  // (bisa bocorkan identitas). Evidence.reportId = laporan sesi ini sejak upload;
  // submit hanya ubah status, jadi lampiran otomatis ikut record yang benar dan
  // tak bisa nyebrang ke laporan lain (cookie sesi dihapus saat kirim).
  // ponytail: TODO lampiran yatim (upload lalu batal, laporan tak pernah dikirim)
  // menumpuk di status draft — butuh job/cron pembersih terpisah, di luar scope W4.
  const storedAs = `bukti-${randomUUID()}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  // file.type dikendalikan klien — verifikasi magic bytes agar "png" yang sebenarnya
  // HTML/SVG/exe tak lolos. Cocokkan signature dengan MIME yang diklaim.
  if (!magicBytesMatch(data, file.type)) {
    return NextResponse.json({ error: "isi file tidak cocok dengan tipenya" }, { status: 415 });
  }
  const evidence = await prisma.evidence.create({
    data: { reportId: reportId!, filename: storedAs, mimeType: file.type, size: file.size, data },
    select: { id: true },
  });
  await logAction(reportId!, "system", "evidence-added", {
    evidenceId: evidence.id,
    storedAs,
    mimeType: file.type,
    size: file.size,
  });

  const res = NextResponse.json({ id: evidence.id });
  if (isNew) {
    res.cookies.set(SESSION_COOKIE, reportId!, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
