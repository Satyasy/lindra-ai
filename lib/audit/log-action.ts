import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// HANYA INSERT — UPDATE/DELETE pada audit_log ditolak di level izin database
// (lihat prisma/migrations/20260707000001_audit_append_only)
export function logAction(
  reportId: string,
  actor: string,
  action: "created" | "sent" | "opened" | "status-changed" | "identity-opened",
  metadata?: Prisma.InputJsonValue
) {
  return prisma.auditLog.create({
    data: { reportId, actor, action, metadata: metadata ?? undefined },
  });
}
