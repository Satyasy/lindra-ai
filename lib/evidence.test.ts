import { describe, expect, it } from "vitest";
import { NO_EVIDENCE_SENTINEL, evidenceKind, evidenceLabel } from "./evidence";

describe("evidence display helper", () => {
  it("mime → kind: gambar = foto, sisanya (pdf) = dokumen", () => {
    expect(evidenceKind("image/jpeg")).toBe("foto");
    expect(evidenceKind("image/png")).toBe("foto");
    expect(evidenceKind("application/pdf")).toBe("dokumen");
  });

  it("label generik 1-based + tipe, tanpa nama file asli", () => {
    expect(evidenceLabel("image/webp", 0)).toBe("Bukti 1 (foto)");
    expect(evidenceLabel("application/pdf", 1)).toBe("Bukti 2 (dokumen)");
  });

  it("sentinel kosong konsisten (bukan null)", () => {
    expect(NO_EVIDENCE_SENTINEL).toBe("Tidak ada bukti dilampirkan");
  });
});
