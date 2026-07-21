import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

const SESSION_COOKIE = "lindra_session";
const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_BYTES = 25 * 1024 * 1024; // limit Groq Whisper

// Proxy STT ke Groq Whisper. Audio hidup hanya selama request ini — tak pernah ditulis
// ke disk/DB (prinsip privasi trauma-informed). Satu GROQ_API_KEY dipakai bersama chat & Tier 2.
export async function POST(request: Request) {
  // Tolak lewat Content-Length SEBELUM mem-buffer body ke memori. formData() di bawah
  // mengalokasi seluruh body dulu; tanpa guard ini, body 500MB berulang = OOM container.
  // (nginx client_max_body_size juga menolak di edge; ini pertahanan berlapis di app.)
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "rekaman terlalu besar (maks 25MB)" }, { status: 413 });
  }
  // Validasi audio dulu (murah, tanpa DB) — tolak input jelas-jelas buruk sebelum apa pun.
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "rekaman kosong atau tidak terbaca" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "rekaman terlalu besar (maks 25MB)" }, { status: 413 });
  }

  // Session-check sama seperti /api/evidence: buat report kalau belum ada (siswa boleh
  // pakai mic sebagai aksi pertama, sebelum kirim pesan). Set cookie agar chat berikutnya
  // menempel ke report yang sama. Bukan jalan abuse baru — surface-nya identik chat/evidence.
  const cookieStore = await cookies();
  let reportId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const existing = reportId
    ? await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } })
    : null;
  if (!existing) {
    const created = await prisma.report.create({ data: { rawTranscript: [] } });
    reportId = created.id;
    await logAction(reportId, "system", "created");
    // Set cookie di sini (bukan hanya di respons sukses) → retry yang gagal pakai report
    // yang sama, tak menumpuk report yatim. Berlaku ke semua jalur respons di bawah.
    cookieStore.set(SESSION_COOKIE, reportId, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("[STT] GROQ_API_KEY tidak ter-set");
    return NextResponse.json(
      { error: "fitur suara belum aktif, ketik manual dulu ya" },
      { status: 503 }
    );
  }

  const groqForm = new FormData();
  groqForm.append("file", audio, audio.name || "audio.webm");
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "id");
  groqForm.append("response_format", "json");
  groqForm.append("temperature", "0");

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: groqForm,
    });
  } catch {
    return NextResponse.json(
      { error: "fitur suara lagi bermasalah, coba ketik manual dulu ya" },
      { status: 502 }
    );
  }

  if (res.status === 429) {
    return NextResponse.json(
      { error: "fitur suara lagi sibuk, coba ketik manual dulu ya" },
      { status: 429 }
    );
  }
  if (res.status === 400 || res.status === 415 || res.status === 422) {
    // Groq menolak audio: format tak didukung / korup / tak ada suara
    return NextResponse.json({ error: "suaranya nggak kebaca — coba rekam lagi ya" }, { status: 422 });
  }
  if (!res.ok) {
    console.error(`[STT] Groq gagal status ${res.status}: ${await res.text().catch(() => "")}`);
    return NextResponse.json(
      { error: "fitur suara lagi bermasalah, coba ketik manual dulu ya" },
      { status: 502 }
    );
  }

  const data = (await res.json().catch(() => null)) as { text?: string } | null;
  const text = data?.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "nggak ada suara yang kedengeran, coba lagi ya" }, { status: 422 });
  }

  return NextResponse.json({ text });
}
