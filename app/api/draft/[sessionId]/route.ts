import { prisma } from "@/lib/prisma";
import { guardSession } from "@/lib/session";
import { composeReport, toStructuredDraft, type StructuredDraft } from "@/lib/ai/classify-narrative";
import { readTranscript } from "@/lib/transcript";

const FIELDS: (keyof StructuredDraft)[] = [
  "gambaran_kejadian",
  "pelaku",
  "waktu",
  "dampak",
  "lokasi",
  "narasi",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await guardSession(sessionId))) {
    return Response.json({ error: "sesi tidak cocok" }, { status: 403 });
  }

  const report = await prisma.report.findUnique({ where: { id: sessionId } });
  if (!report) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  let { narrative, urgencyLevel, draft } = report;

  // Fallback: siswa buka draf sebelum kode sempat compose (mis. lewat banner "Lihat draf").
  if (!narrative) {
    const composed = await composeReport(readTranscript(report.rawTranscript));
    narrative = composed.narrativeSummary;
    urgencyLevel = urgencyLevel ?? composed.urgencyLevel; // krisis Tier 1 tidak boleh tertimpa
    draft = toStructuredDraft(composed);
    await prisma.report.update({
      where: { id: sessionId },
      data: {
        narrative,
        urgencyLevel,
        draft,
        perpetratorRole: composed.perpetratorRole,
        locationCategory: composed.locationCategory,
        violenceType: composed.violenceType,
        actionSignals: {
          cederaFisik: composed.cederaFisik,
          sudahBerulang: composed.sudahBerulang,
          relasiKuasaTimpang: composed.relasiKuasaTimpang,
          adaBukti: composed.bukti?.adaBukti ?? null,
          adaBahayaLangsung: composed.keamanan?.adaBahayaLangsung ?? null,
        },
      },
    });
  }

  return Response.json(
    { narrative, urgencyLevel, status: report.status, draft },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Simpan koreksi siswa atas draf terstruktur (E). narasi = teks yang dikirim ke BK.
// Kolom routing (perpetratorRole/locationCategory/violenceType) TIDAK diubah dari
// input bebas siswa — routing tetap dari ekstraksi AI yang auditable (CLAUDE.md).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await guardSession(sessionId))) {
    return Response.json({ error: "sesi tidak cocok" }, { status: 403 });
  }

  const report = await prisma.report.findUnique({ where: { id: sessionId } });
  if (!report) return Response.json({ error: "tidak ditemukan" }, { status: 404 });
  if (report.status !== "draft") {
    return Response.json({ error: "laporan sudah terkirim" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const incoming = body?.draft;
  if (!incoming || typeof incoming !== "object") {
    return Response.json({ error: "draft wajib objek" }, { status: 400 });
  }

  // Terima hanya field yang dikenal & bertipe string (trust boundary).
  const draft = {} as StructuredDraft;
  for (const f of FIELDS) draft[f] = typeof incoming[f] === "string" ? incoming[f] : "";
  if (!draft.narasi.trim()) {
    return Response.json({ error: "narasi tidak boleh kosong" }, { status: 400 });
  }

  await prisma.report.update({
    where: { id: sessionId },
    data: { draft, narrative: draft.narasi },
  });

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
