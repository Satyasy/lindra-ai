import { describe, it, expect } from "vitest";
import { computeActionSignals, type ActionSignals } from "./recommend-action";

// Sinyal netral — override per-kasus. Semua null = "belum diketahui".
function signals(over: Partial<ActionSignals>): ActionSignals {
  return {
    urgencyLevel: "sedang",
    violenceType: [],
    cederaFisik: null,
    sudahBerulang: null,
    relasiKuasaTimpang: null,
    adaBukti: null,
    adaBahayaLangsung: null,
    adaDampak: null,
    ...over,
  };
}

describe("computeActionSignals", () => {
  it("cedera fisik + urgensi tinggi → korban ranahHukum+psikolog, pelaku ranahHukum (DoD#1)", () => {
    const r = computeActionSignals(signals({ cederaFisik: true, urgencyLevel: "tinggi" }));
    expect(r.korban.ranahHukum).toBe(true);
    expect(r.korban.psikolog).toBe(true);
    expect(r.pelaku.ranahHukum).toBe(true);
    expect(r.cukupData).toBe(true);
  });

  it("semua sinyal inti null → HANYA mediasiBk kedua sisi + cukupData false (DoD#2)", () => {
    const r = computeActionSignals(signals({ urgencyLevel: "tinggi", adaBahayaLangsung: true }));
    // walau ada bahaya langsung & urgensi tinggi, data inti kosong → tetap konservatif
    expect(r.cukupData).toBe(false);
    expect(r.korban).toEqual({ mediasiBk: true, psikolog: false, ranahHukum: false });
    expect(r.pelaku).toEqual({ mediasiBk: true, psikolog: false, ranahHukum: false });
  });

  it("berulang + relasi kuasa timpang → korban ranahHukum, pelaku psikolog", () => {
    const r = computeActionSignals(signals({ sudahBerulang: true, relasiKuasaTimpang: true }));
    expect(r.korban.ranahHukum).toBe(true);
    expect(r.pelaku.psikolog).toBe(true);
    // berulang → bukan kandidat mediasi umum
    expect(r.korban.mediasiBk).toBe(false);
    expect(r.pelaku.mediasiBk).toBe(false);
  });

  it("urgensi kritis → ranahHukum kedua sisi", () => {
    const r = computeActionSignals(signals({ urgencyLevel: "kritis", cederaFisik: false }));
    expect(r.korban.ranahHukum).toBe(true);
    expect(r.pelaku.ranahHukum).toBe(true);
  });

  it("kekerasan seksual → pelaku ranahHukum walau sinyal lain tenang", () => {
    const r = computeActionSignals(
      signals({ violenceType: ["kekerasan-seksual"], cederaFisik: false, sudahBerulang: false, relasiKuasaTimpang: false })
    );
    expect(r.pelaku.ranahHukum).toBe(true);
  });

  it("urgensi rendah, tanpa cedera/berulang → mediasiBk menyala kedua sisi", () => {
    const r = computeActionSignals(
      signals({ urgencyLevel: "rendah", cederaFisik: false, sudahBerulang: false, relasiKuasaTimpang: false })
    );
    expect(r.korban.mediasiBk).toBe(true);
    expect(r.pelaku.mediasiBk).toBe(true);
  });
});
