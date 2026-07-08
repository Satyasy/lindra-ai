import { prisma } from "@/lib/prisma";
import { guardSession } from "@/lib/session";
import { composeReport } from "@/lib/ai/classify-narrative";
import { readTranscript } from "@/lib/transcript";

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

  let { narrative, urgencyLevel } = report;

  // Susun narasi bila belum ada (panggilan Tier 2 — modul Nabil)
  if (!narrative) {
    const draft = await composeReport(readTranscript(report.rawTranscript));
    narrative = draft.narrative;
    urgencyLevel = urgencyLevel ?? draft.urgencyLevel; // krisis Tier 1 tidak boleh tertimpa
    await prisma.report.update({
      where: { id: sessionId },
      data: {
        narrative,
        urgencyLevel,
        perpetratorRole: draft.perpetratorRole,
        locationCategory: draft.locationCategory,
        violenceType: draft.violenceType,
      },
    });
  }

  return Response.json(
    { narrative, urgencyLevel, status: report.status },
    { headers: { "Cache-Control": "no-store" } }
  );
}
