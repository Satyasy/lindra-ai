import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth, staffRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HANDLING_LABEL } from "@/components/bk/handling";

// Export CSV antrean terfilter. ponytail: rakit CSV manual (tanpa library berat).
// Filter keamanan (destination) TETAP ditegakkan — export tak melewati bypass.
const RISK_LABEL: Record<string, string> = { kritis: "Kritis", tinggi: "Tinggi", sedang: "Sedang", rendah: "Rendah" };
const WORRY_LABEL: Record<string, string> = {
  kritis: "Sangat Khawatir",
  tinggi: "Khawatir",
  sedang: "Cukup Khawatir",
  rendah: "Ringan",
};
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const ORDER: Record<string, number> = { kritis: 0, tinggi: 1, sedang: 2, rendah: 3 };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });
  const role = staffRole(session);
  const destination = role === "satgas" ? "satgas-eksternal" : "dashboard-bk";

  const sp = req.nextUrl.searchParams;
  const showDone = sp.get("tab") === "selesai";
  const where: Prisma.ReportWhereInput = {
    routingLogs: { some: { destination } },
    status: showDone ? "selesai" : { not: "selesai" },
  };
  const risiko = sp.get("risiko");
  if (risiko) where.urgencyLevel = risiko;
  const penanganan = sp.get("penanganan");
  if (penanganan) where.handlingStatus = penanganan;
  const petugas = sp.get("petugas");
  if (petugas) where.assignedToId = petugas === "unassigned" ? null : petugas;
  const q = sp.get("q");
  if (q)
    where.OR = [
      { narrative: { contains: q, mode: "insensitive" } },
      { referralCode: { code: { contains: q, mode: "insensitive" } } },
    ];

  const reports = await prisma.report.findMany({ where, include: { referralCode: true, assignedTo: true } });
  reports.sort((a, b) => (ORDER[a.urgencyLevel ?? ""] ?? 9) - (ORDER[b.urgencyLevel ?? ""] ?? 9));

  const header = ["ID Pelapor", "Risiko", "Tingkat Kekhawatiran", "Ringkasan Laporan", "Tanggal (WIB)", "Penanganan", "Petugas", "Status"];
  const body = reports.map((r) => [
    r.referralCode?.code ?? r.id.slice(-6),
    RISK_LABEL[r.urgencyLevel ?? "rendah"] ?? "-",
    WORRY_LABEL[r.urgencyLevel ?? "rendah"] ?? "-",
    r.narrative ?? "",
    r.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }),
    HANDLING_LABEL[r.handlingStatus] ?? r.handlingStatus,
    r.assignedTo?.name ?? "Belum diassign",
    r.status,
  ]);
  const csv = [header, ...body].map((row) => row.map(cell).join(",")).join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="antrean-${showDone ? "selesai" : "aktif"}.csv"`,
    },
  });
}
