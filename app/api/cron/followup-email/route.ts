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
// HANYA Bearer CRON_SECRET. Cabang x-vercel-cron dibuang: di EC2 header itu tak
// dijamin platform, siapa pun bisa memalsukannya (curl -H "x-vercel-cron: 1") →
// memicu email massal + escalate. systemd timer EC2 memakai Bearer (lihat user_data.sh);
// bila kembali ke Vercel, set CRON_SECRET di project & pakai header Authorization.
function authorized(req: Request): boolean {
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

    // KEMANDEKAN ADMIN — kasus sudah ditandai user ("Iya", followUpFlaggedAt) TAPI admin
    // tetap belum membuka (tak ada AuditLog 'opened') → noProgressCount++ tiap siklus.
    // Ini SATU-SATUNYA penambah noProgressCount (BUKAN jawaban user). Begitu admin buka
    // kasus (log 'opened'), kondisi gugur → increment berhenti & tawaran SAPA 129 berhenti
    // (offer dihitung dari counter di sesi follow-up, lihat app/api/followup/chat).
    const stalled = f.followUpFlaggedAt != null && !opened; // 'done' sudah di-continue di atas

    // EMAIL NETRAL — sapa kabar siswa. Dikirim saat laporan BELUM diproses ("belum
    // diterima" = tak ada AuditLog 'opened') maupun sudah diproses tapi belum selesai.
    // Template TANPA kode/link auto-login (lib/email). Reschedule check-in berikutnya.
    if (f.contactEmail) {
      const res = await sendFollowupEmail(decryptFromBase64(f.contactEmail)); // dekripsi hanya in-memory
      await prisma.followup.update({
        where: { id: f.id },
        data: {
          lastCheckinAt: now,
          scheduledAt: new Date(now.getTime() + SLA_THRESHOLD_HOURS * 3600_000),
          ...(stalled ? { noProgressCount: { increment: 1 } } : {}),
        },
      });
      if (res.sent) await logAction(f.reportId, "system", "followup-email-sent");
      if (stalled) {
        await logAction(f.reportId, "system", "noprogress-incremented", {
          count: f.noProgressCount + 1,
        });
      }
      emailed++;
    }
  }

  return Response.json({ processed: due.length, escalated, emailed, skipped });
}
