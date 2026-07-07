// Test integrasi — butuh `docker compose up -d db` + migrasi terpasang.
// Membuktikan audit_log append-only DITEGAKKAN database, bukan logika aplikasi.
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // konek sebagai lindra_app (DATABASE_URL)

describe("audit_log append-only (izin database)", () => {
  it("UPDATE ditolak dengan permission denied", async () => {
    await expect(
      prisma.$executeRawUnsafe(`UPDATE audit_log SET action = 'diubah'`)
    ).rejects.toThrow(/permission denied|denied/i);
  });

  it("DELETE ditolak dengan permission denied", async () => {
    await expect(prisma.$executeRawUnsafe(`DELETE FROM audit_log`)).rejects.toThrow(
      /permission denied|denied/i
    );
  });
});
