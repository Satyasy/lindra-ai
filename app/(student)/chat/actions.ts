"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

// Siswa membalas di thread pendampingan (ConsultThread) laporannya. Scoped ke
// cookie sesi (reportId) — siswa hanya bisa pesan ke thread laporannya sendiri.
export async function sendStudentConsult(content: string) {
  const store = await cookies();
  const reportId = store.get(SESSION_COOKIE)?.value;
  if (!reportId) throw new Error("sesi tidak ditemukan");
  const text = content.trim();
  if (!text) return;

  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
  if (!report) throw new Error("laporan tidak ditemukan");

  let thread = await prisma.chatThread.findFirst({ where: { reportId } });
  if (!thread) thread = await prisma.chatThread.create({ data: { reportId } });
  await prisma.chatMessage.create({ data: { threadId: thread.id, sender: "student", content: text } });
  revalidatePath("/chat");
}
