import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

// Sesi follow-up selesai: kalau siswa TIDAK mengonfirmasi progres → noProgressCount++.
// Saat mencapai 3, klien menawarkan OPSI SAPA 129 ke siswa (tak ada kiriman otomatis).
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const followupId = cookieStore.get("lindra_followup")?.value;
  if (!followupId) return Response.json({ error: "sesi tidak ada" }, { status: 401 });

  const followup = await prisma.followup.findUnique({ where: { id: followupId } });
  if (!followup) return Response.json({ error: "tidak ditemukan" }, { status: 404 });

  const { progress } = await request.json().catch(() => ({}));

  if (progress === true) {
    await prisma.followup.update({ where: { id: followupId }, data: { lastCheckinAt: new Date() } });
    await logAction(followup.reportId, "student", "followup-checkin", { progress: true });
    return Response.json({ noProgressCount: followup.noProgressCount });
  }

  const updated = await prisma.followup.update({
    where: { id: followupId },
    data: { noProgressCount: { increment: 1 }, lastCheckinAt: new Date() },
  });
  await logAction(followup.reportId, "student", "followup-checkin", {
    progress: false,
    count: updated.noProgressCount,
  });
  return Response.json({ noProgressCount: updated.noProgressCount });
}
