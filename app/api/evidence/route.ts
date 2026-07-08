import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

const SESSION_COOKIE = "lindra_session";

// Batas kepercayaan: hanya foto/PDF, maksimal 5MB. Bukti bisa berisi wajah minor —
// jangan longgar soal tipe/ukuran.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file wajib diisi" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "tipe file tidak didukung (hanya JPG/PNG/WebP/PDF)" },
      { status: 415 }
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "ukuran file maksimal 5MB" }, { status: 413 });
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

  const data = Buffer.from(await file.arrayBuffer());
  const evidence = await prisma.evidence.create({
    data: { reportId: reportId!, filename: file.name, mimeType: file.type, size: file.size, data },
    select: { id: true },
  });
  await logAction(reportId!, "system", "evidence-added", {
    evidenceId: evidence.id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });

  const res = NextResponse.json({ id: evidence.id, name: file.name });
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
