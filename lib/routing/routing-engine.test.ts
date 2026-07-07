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

  it("aturan 5: kekerasan seksual -> flag urgentVisum di rute mana pun", () => {
    expect(determineRoute({ ...base, violenceType: ["seksual"] }).urgentVisum).toBe(true);
    expect(
      determineRoute({ ...base, perpetratorRole: "guru-staf", violenceType: ["seksual"] })
        .urgentVisum
    ).toBe(true);
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
