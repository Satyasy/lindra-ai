import { prisma } from "@/lib/prisma";
import { decryptFromBase64 } from "@/lib/identity-crypto";
import { logAction } from "@/lib/audit/log-action";
import { sendFollowupEmail } from "@/lib/email";
import { SLA_THRESHOLD_HOURS } from "@/lib/config";

// Cron follow-up proaktif. Jadwal dikonfigurasi via FOLLOWUP_CRON_SCHEDULE (vercel.json).
// Percabangan Diagram A per Followup (proactiveEnabled & scheduledAt lewat):
//   • Report BELUM pernah dibuka (tak ada AuditLog 'opened') & SLA breached →
//     AUTO-ESCALATE SEKALI ke jalur SAPA 129 (routingLog), set escalated=true. BUKAN email.
//   • Report sudah dibuka (proses jalan, belum selesai) → kirim email follow-up netral.
function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true; // Vercel cron
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  const now = new Date();
  const due = await prisma.followup.findMany({
    where: { proactiveEnabled: true, scheduledAt: { lte: now } },
    include: { report: { include: { auditLogs: true, routingLogs: true } } },
  });

  let escalated = 0;
  let emailed = 0;
  let skipped = 0;

  for (const f of due) {
    const opened = f.report.auditLogs.some((a) => a.action === "opened");
    const slaBreached =
      f.report.createdAt.getTime() + SLA_THRESHOLD_HOURS * 3600_000 < now.getTime();
    const done = f.report.status === "selesai";
    if (done) {
      skipped++;
      continue;
    }

    // SAFETY NET — laporan diabaikan (belum dibuka BK/Satgas) & SLA breached →
    // auto-escalate SEKALI ke SAPA 129, DI SAMPING email (email saja tak cukup untuk
    // anak yang diabaikan). Cakupan luas (semua urgensi) sengaja dipertahankan dari
    // dokumen — tidak dipersempit ke kritis saja agar tak mengurangi jaring pengaman.
    if (!opened && slaBreached && !f.escalated) {
      const alreadyRouted = f.report.routingLogs.some((l) => l.destination === "sapa129");
      await prisma.$transaction([
        ...(alreadyRouted
          ? []
          : [
              prisma.routingLog.create({
                data: {
                  reportId: f.reportId,
                  destination: "sapa129",
                  hashAtSend: f.report.contentHash ?? "",
                },
              }),
            ]),
        prisma.followup.update({
          where: { id: f.id },
          data: { escalated: true, slaStatus: "breached" },
        }),
      ]);
      await logAction(f.reportId, "system", "auto-escalated", { to: "sapa129" });
      escalated++;
    }

    // EMAIL NETRAL — sapa kabar siswa. Dikirim saat laporan BELUM diproses ("belum
    // diterima" = tak ada AuditLog 'opened') maupun sudah diproses tapi belum selesai.
    // Template TANPA kode/link auto-login (lib/email). Reschedule check-in berikutnya.
    if (f.contactEmail) {
      await sendFollowupEmail(decryptFromBase64(f.contactEmail)); // dekripsi hanya in-memory
      await prisma.followup.update({
        where: { id: f.id },
        data: {
          lastCheckinAt: now,
          scheduledAt: new Date(now.getTime() + SLA_THRESHOLD_HOURS * 3600_000),
        },
      });
      emailed++;
    }
  }

  return Response.json({ processed: due.length, escalated, emailed, skipped });
}
