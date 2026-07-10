import { describe, expect, it } from "vitest";
import { cekKasusQuestion } from "./followup-context-injection";

describe("cekKasusQuestion (template CEK_KASUS, framing lunak)", () => {
  it("kategori tunggal dikenal → disebut lunak + kategori terpetakan", () => {
    const r = cekKasusQuestion(["perundungan"]);
    expect(r.category).toBe("perundungan");
    expect(r.question).toContain("perundungan yang kamu ceritakan kemarin");
  });

  it("kosong → frasa umum, tak menyebut label apa pun", () => {
    const r = cekKasusQuestion([]);
    expect(r.category).toBe("umum");
    expect(r.question).toContain("hal yang kamu ceritakan kemarin");
  });

  it("multi-kategori → umum (tak memvonis satu label sebagai fakta)", () => {
    expect(cekKasusQuestion(["kekerasan-fisik", "kekerasan-psikis"]).category).toBe("umum");
  });

  it("kategori sensitif tak disebut eksplisit → jatuh ke umum", () => {
    const r = cekKasusQuestion(["kekerasan-seksual"]);
    expect(r.category).toBe("umum");
    expect(r.question).not.toContain("seksual");
  });

  it("selalu menyediakan jalan 'tidak mau menjawab'", () => {
    expect(cekKasusQuestion(["perundungan"]).question).toContain("nggak mau jawab");
  });
});
