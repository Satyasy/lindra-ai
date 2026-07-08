"use server";

import { revalidatePath } from "next/cache";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";
import { HANDLING_STATUS } from "@/components/bk/handling";

// Guard mutasi: staf HANYA boleh menyentuh laporan yang dirutekan ke antreannya.
// Filter keamanan bypass (guru-staf/orangtua-wali) ditegakkan di sini juga, bukan
// cuma di UI — jangan longgarkan (CLAUDE.md §keamanan).
async function assertInQueue(reportId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const dest = staffRole(session) === "satgas" ? "satgas-eksternal" : "dashboard-bk";
  const log = await prisma.routingLog.findFirst({ where: { reportId, destination: dest } });
  if (!log) throw new Error("forbidden");
  const email = session.user.email ?? "";
  const me = email ? await prisma.staffAccount.findUnique({ where: { email } }) : null;
  return { session, role: staffRole(session), me, actor: email || "staff" };
}

export async function assignReport(reportId: string, staffId: string) {
  const { role, actor } = await assertInQueue(reportId);
  const assignedToId = staffId || null;
  // PIC harus staf dengan role yang sama dengan antrean ini
  if (assignedToId) {
    const staff = await prisma.staffAccount.findUnique({ where: { id: assignedToId } });
    if (!staff || staff.role !== role) throw new Error("petugas tidak valid");
  }
  await prisma.report.update({ where: { id: reportId }, data: { assignedToId } });
  await logAction(reportId, actor, "assigned", { assignedToId });
  revalidatePath("/bk");
}

export async function updateHandlingStatus(reportId: string, handlingStatus: string) {
  const { actor } = await assertInQueue(reportId);
  if (!(HANDLING_STATUS as readonly string[]).includes(handlingStatus))
    throw new Error("status penanganan tidak valid");
  await prisma.report.update({ where: { id: reportId }, data: { handlingStatus } });
  await logAction(reportId, actor, "status-changed", { handlingStatus });
  revalidatePath("/bk");
}

// ConsultPanel — balasan staf ke thread pendampingan. ponytail: satu thread per
// laporan; dibuat saat balasan pertama. "belum dibaca" = pesan siswa setelah balasan
// staf terakhir, jadi membalas otomatis mengosongkan badge (tanpa kolom readAt).
export async function sendConsultMessage(reportId: string, content: string) {
  const { me } = await assertInQueue(reportId);
  const text = content.trim();
  if (!text) return;
  let thread = await prisma.chatThread.findFirst({ where: { reportId } });
  if (!thread) thread = await prisma.chatThread.create({ data: { reportId, staffId: me?.id ?? null } });
  await prisma.chatMessage.create({ data: { threadId: thread.id, sender: "staff", content: text } });
  revalidatePath("/bk");
}
