// Integrasi (butuh DB up + migrasi). Konek sebagai lindra_app (DATABASE_URL).
// FASE 1 #1 (crown jewel): laporan pelaku guru-staf & orangtua-wali TIDAK PERNAH
// masuk antrean BK — dibuktikan lewat QUERY antrean nyata (bukan cuma engine).
// FASE 1 #11: kode referensi unik & bisa diverifikasi.
import { afterAll, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { determineRoute, type RoutableReport } from "./routing-engine";

const prisma = new PrismaClient();
const TAG = "__qa_bkqueue__"; // penanda unik untuk isolasi + cleanup
const createdReportIds: string[] = [];

// Mirror alur send route: buat Report + RoutingLog sesuai determineRoute.
async function seedReport(r: RoutableReport, narrative: string) {
  const report = await prisma.report.create({
    data: {
      narrative,
      urgencyLevel: r.urgencyLevel,
      perpetratorRole: r.perpetratorRole,
      locationCategory: r.locationCategory,
      violenceType: r.violenceType,
      status: "terkirim",
    },
  });
  createdReportIds.push(report.id);
  const routing = determineRoute(r);
  await prisma.routingLog.createMany({
    data: routing.destinations.map((destination) => ({
      reportId: report.id,
      destination,
      hashAtSend: "test",
    })),
  });
  return report.id;
}

afterAll(async () => {
  // Cleanup: hormati FK (referralCode & routingLog dulu, lalu report).
  await prisma.referralCode.deleteMany({ where: { reportId: { in: createdReportIds } } });
  await prisma.routingLog.deleteMany({ where: { reportId: { in: createdReportIds } } });
  await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
  await prisma.$disconnect();
});

describe("antrean BK — filter keamanan (query nyata)", () => {
  it("guru-staf & orangtua-wali TIDAK muncul; antar-siswa muncul", async () => {
    const base: RoutableReport = {
      urgencyLevel: "sedang",
      perpetratorRole: "siswa",
      locationCategory: "dalam-sekolah",
      violenceType: [],
    };
    const siswaId = await seedReport({ ...base }, `${TAG} antar-siswa`);
    const guruId = await seedReport(
      { ...base, perpetratorRole: "guru-staf" },
      `${TAG} guru-staf`
    );
    const waliId = await seedReport(
      { ...base, perpetratorRole: "orangtua-wali" },
      `${TAG} orangtua-wali`
    );

    // Persis where-clause antrean BK (app/bk/(dashboard)/page.tsx)
    const where: Prisma.ReportWhereInput = {
      routingLogs: { some: { destination: "dashboard-bk" } },
      status: { not: "selesai" },
      narrative: { contains: TAG },
    };
    const ids = (await prisma.report.findMany({ where, select: { id: true } })).map((r) => r.id);

    expect(ids).toContain(siswaId); // antar-siswa → BK
    expect(ids).not.toContain(guruId); // guru-staf → Satgas, BUKAN BK
    expect(ids).not.toContain(waliId); // orangtua-wali → SAPA, BUKAN BK
  });
});

describe("kode referensi — unik & valid (FASE 1 #11)", () => {
  it("kode unik dibuat & lookup mengembalikan laporan; duplikat DITOLAK", async () => {
    const rid = await seedReport(
      {
        urgencyLevel: "sedang",
        perpetratorRole: "siswa",
        locationCategory: "dalam-sekolah",
        violenceType: [],
      },
      `${TAG} referral`
    );
    const code = `lin-${TAG.slice(2, 10)}`;
    await prisma.referralCode.create({ data: { reportId: rid, code } });

    // Lookup valid → ketemu laporan
    const found = await prisma.referralCode.findUnique({ where: { code }, include: { report: true } });
    expect(found?.report.id).toBe(rid);

    // Kode ngasal → null (invalid)
    expect(await prisma.referralCode.findUnique({ where: { code: "lin-tidakada" } })).toBeNull();

    // Duplikat kode → ditolak unique constraint
    const rid2 = await seedReport(
      {
        urgencyLevel: "sedang",
        perpetratorRole: "siswa",
        locationCategory: "dalam-sekolah",
        violenceType: [],
      },
      `${TAG} referral-dup`
    );
    await expect(
      prisma.referralCode.create({ data: { reportId: rid2, code } })
    ).rejects.toThrow();
  });
});
