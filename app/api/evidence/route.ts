import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

const SESSION_COOKIE = "lindra_session";

// Batas kepercayaan: hanya foto/PDF, maksimal 10MB. Bukti bisa berisi wajah minor —
// jangan longgar soal tipe/ukuran. Validasi ini WAJIB di server; validasi klien cuma UX.
const MAX_BYTES = 10 * 1024 * 1024;
// mime → ekstensi untuk identifier internal yang disanitize (nama asli siswa dibuang).
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

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
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ukuran file maksimal 10MB" }, { status: 413 });
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
  // (bisa bocorkan identitas). Linkage permanen & tampilan di draf → W4.
  const storedAs = `bukti-${randomUUID()}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
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
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
