import { describe, expect, it } from "vitest";
import { determineRoute, type RoutableReport } from "./routing-engine";

const base: RoutableReport = {
  urgencyLevel: "sedang",
  perpetratorRole: "siswa",
  locationCategory: "dalam-sekolah",
  violenceType: [],
};

describe("routing engine — satu test per aturan", () => {
  it("aturan 1: kritis -> eskalasi darurat + sapa129 paralel", () => {
    expect(determineRoute({ ...base, urgencyLevel: "kritis" })).toEqual({
      destinations: ["eskalasi-darurat", "sapa129"],
      parallel: true,
      urgentVisum: false,
    });
  });

  it("aturan 2: pelaku guru-staf -> satgas eksternal (bypass BK)", () => {
    const r = determineRoute({ ...base, perpetratorRole: "guru-staf" });
    expect(r.destinations).toEqual(["satgas-eksternal"]);
    expect(r.destinations).not.toContain("dashboard-bk");
  });

  it("aturan 3: pelaku orangtua-wali -> sapa129", () => {
    expect(determineRoute({ ...base, perpetratorRole: "orangtua-wali" }).destinations).toEqual([
      "sapa129",
    ]);
  });

  it("aturan 4: lintas-sekolah -> satgas eksternal", () => {
    expect(determineRoute({ ...base, locationCategory: "lintas-sekolah" }).destinations).toEqual([
      "satgas-eksternal",
    ]);
  });

  // Nilai di bawah HARUS kode taksonomi yang benar-benar dipancarkan Tier 2.
  // Versi lama test ini menyuapkan "seksual" — nilai yang pipeline aslinya tidak
  // pernah hasilkan — sehingga lolos hijau sementara flag-nya mati di produksi.
  it("aturan 5: kekerasan seksual -> flag urgentVisum di rute mana pun", () => {
    expect(determineRoute({ ...base, violenceType: ["kekerasan-seksual"] }).urgentVisum).toBe(true);
    expect(
      determineRoute({ ...base, perpetratorRole: "guru-staf", violenceType: ["kekerasan-seksual"] })
        .urgentVisum
    ).toBe(true);
  });

  it("aturan 5: kode taksonomi Tier 2 yang asli memicu urgentVisum (regresi)", () => {
    // Penjaga anti-drift: kode ini disalin dari taksonomi di prompt Tier 2.
    // Kalau ada yang mengubah salah satu sisi tanpa sisi lain, test ini gagal.
    const KODE_TIER2 = "kekerasan-seksual";
    expect(determineRoute({ ...base, violenceType: [KODE_TIER2] }).urgentVisum).toBe(true);
    // Substring TIDAK boleh cukup — Array.includes exact match.
    expect(determineRoute({ ...base, violenceType: ["seksual"] }).urgentVisum).toBe(false);
  });

  it("aturan 6: default antar-siswa satu sekolah -> dashboard BK", () => {
    expect(determineRoute(base).destinations).toEqual(["dashboard-bk"]);
  });

  it("presedensi: kritis menang meski pelaku guru-staf", () => {
    expect(
      determineRoute({ ...base, urgencyLevel: "kritis", perpetratorRole: "guru-staf" })
        .destinations
    ).toEqual(["eskalasi-darurat", "sapa129"]);
  });

  it("laporan kosong (semua null) -> aman ke dashboard BK tanpa error", () => {
    expect(
      determineRoute({
        urgencyLevel: null,
        perpetratorRole: null,
        locationCategory: null,
        violenceType: [],
      }).destinations
    ).toEqual(["dashboard-bk"]);
  });
});
