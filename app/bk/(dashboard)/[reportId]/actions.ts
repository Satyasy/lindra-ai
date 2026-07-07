"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit/log-action";

const VALID_STATUS = ["terkirim", "ditinjau", "selesai"];

export async function updateReportStatus(reportId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  if (!VALID_STATUS.includes(status)) throw new Error("status tidak valid");

  await prisma.report.update({ where: { id: reportId }, data: { status } });
  await logAction(reportId, session.user.email ?? "staff", "status-changed", { status });
  revalidatePath(`/bk/${reportId}`);
  revalidatePath("/bk");
}
