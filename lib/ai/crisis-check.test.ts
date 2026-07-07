import { describe, expect, it } from "vitest";
import { detectCrisisSignal } from "./crisis-check";

// 15 kalimat krisis (dengan kategori yang diharapkan) — campur bahasa gaul remaja.
const crisisCases: { msg: string; category: string }[] = [
  { msg: "aku pengen mati aja rasanya", category: "ide-bunuh-diri" },
  { msg: "pgn mati aja capek banget", category: "ide-bunuh-diri" },
  { msg: "gue mau bunuh diri serius", category: "ide-bunuh-diri" },
  { msg: "kayaknya mending bundir aja deh", category: "ide-bunuh-diri" },
  { msg: "gak mau hidup lagi aku", category: "ide-bunuh-diri" },
  { msg: "capek hidup terus terusan gini", category: "ide-bunuh-diri" },
  { msg: "tadi aku nyilet tangan lagi", category: "self-harm-aktif" },
  { msg: "aku nyakitin diri sendiri terus akhir akhir ini", category: "self-harm-aktif" },
  { msg: "abis self harm lagi barusan", category: "self-harm-aktif" },
  { msg: "aku gores tangan pake silet tadi", category: "self-harm-aktif" },
  { msg: "tolong aku lagi dipukulin sekarang", category: "kekerasan-fisik-berlangsung" },
  { msg: "dia lagi ngeroyok aku nih", category: "kekerasan-fisik-berlangsung" },
  { msg: "skrg lagi dihajar kakak kelas", category: "kekerasan-fisik-berlangsung" },
  { msg: "dia bilang mau ngabisin aku", category: "ancaman-nyawa" },
  { msg: "aku mau dibunuh sama dia", category: "ancaman-nyawa" },
];

// 15 kalimat BUKAN krisis — termasuk kasus "dekat tapi bukan krisis".
const nonCrisisCases: string[] = [
  "aku takut sama guru matematika", // dekat-tapi-bukan: takut, tanpa ancaman nyawa
  "kemarin aku dipukul kakak kelas", // dekat-tapi-bukan: kekerasan LAMPAU, bukan berlangsung
  "dia ngancem mau lapor guru", // dekat-tapi-bukan: ada ancaman tapi bukan nyawa
  "dia mukul meja pas marah", // dekat-tapi-bukan: mukul benda, bukan orang, bukan sekarang
  "hari ini capek banget di sekolah",
  "aku gak suka pelajaran olahraga",
  "temen aku sering ngatain aku bego",
  "aku dikucilin di kelas terus",
  "bosen banget hidup gini gini aja",
  "aku mau cerita soal kejadian kemarin",
  "pengen curhat aja sih sama kamu",
  "kakak kelas suka malakin aku",
  "aku sedih terus akhir akhir ini",
  "gue mau tidur aja capek",
  "takut banget mau ujian besok",
];

describe("detectCrisisSignal — krisis terdeteksi dengan kategori benar", () => {
  for (const { msg, category } of crisisCases) {
    it(`krisis: "${msg}" -> ${category}`, () => {
      const r = detectCrisisSignal(msg);
      expect(r.isCrisis).toBe(true);
      expect(r.matchedCategory).toBe(category);
    });
  }
});

describe("detectCrisisSignal — bukan krisis, mengalir ke Lapis 2", () => {
  for (const msg of nonCrisisCases) {
    it(`bukan krisis: "${msg}"`, () => {
      expect(detectCrisisSignal(msg).isCrisis).toBe(false);
    });
  }
});

describe("detectCrisisSignal — properti dasar", () => {
  it("case-insensitive", () => {
    expect(detectCrisisSignal("AKU PENGEN MATI AJA").isCrisis).toBe(true);
  });
  it("string kosong bukan krisis", () => {
    expect(detectCrisisSignal("").isCrisis).toBe(false);
  });
});
