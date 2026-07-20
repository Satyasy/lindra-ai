import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// HANYA INSERT — UPDATE/DELETE pada audit_log ditolak di level izin database
// (lihat prisma/migrations/20260707000001_audit_append_only)
export function logAction(
  reportId: string,
  actor: string,
  action:
    | "created"
    | "sent"
    | "opened"
    | "status-changed"
    | "assigned"
    | "identity-opened"
    | "followup-enabled"
    | "auto-escalated"
    | "evidence-added"
    | "evidence-opened"
    | "evidence-removed"
    // W5 follow-up proaktif (append-only, tak memuat email/kode/token di metadata)
    | "followup-session-started"
    | "followup-email-sent"
    | "followup-case-flagged"
    | "followup-session-closed"
    | "followup-crisis-override"
    | "followup-sapa129-offered"
    | "noprogress-incremented",
  metadata?: Prisma.InputJsonValue
) {
  return prisma.auditLog.create({
    data: { reportId, actor, action, metadata: metadata ?? undefined },
  });
}
