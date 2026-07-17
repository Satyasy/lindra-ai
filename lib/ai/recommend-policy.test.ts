import { describe, expect, it } from "vitest";
import { fuse, MAX_DISTANCE, type PolicyChunk } from "./recommend-policy";

const chunk = (id: string): PolicyChunk => ({
  id,
  documentTitle: "Tata Tertib Sekolah",
  content: `isi pasal ${id}`,
});

describe("fuse — Reciprocal Rank Fusion dua jalur retrieval", () => {
  it("chunk yang muncul di KEDUA jalur menang atas peringkat-1 satu jalur", () => {
    // "b" tak pernah juara di jalur mana pun (peringkat 2 dan 2), tapi muncul di
    // keduanya. "a" juara keyword, "x" juara vector — masing-masing cuma sekali.
    // Inilah alasan hybrid ada: kesepakatan dua jalur > dominasi satu jalur.
    const keyword = [chunk("a"), chunk("b")];
    const vector = [chunk("x"), chunk("b")];

    expect(fuse(keyword, vector).map((c) => c.id)[0]).toBe("b");
  });

  it("satu jalur kosong -> hasil = jalur lain, urutan utuh (degradasi vendor down)", () => {
    const keyword = [chunk("a"), chunk("b"), chunk("c")];

    expect(fuse(keyword, []).map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(fuse([], keyword).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("kedua jalur kosong -> kosong, JANGAN mengarang", () => {
    expect(fuse([], [])).toEqual([]);
  });

  it("tidak pernah mengembalikan duplikat walau chunk ada di dua jalur", () => {
    const both = [chunk("a"), chunk("b")];
    const out = fuse(both, both);

    expect(out.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("dibatasi MAX_RESULTS (5) walau masukan jauh lebih banyak", () => {
    const many = Array.from({ length: 10 }, (_, i) => chunk(`k${i}`));
    const other = Array.from({ length: 10 }, (_, i) => chunk(`v${i}`));

    expect(fuse(many, other)).toHaveLength(5);
  });
});

describe("MAX_DISTANCE — lantai relevansi jalur vector", () => {
  // Lantai ini yang mencegah pgvector menyodorkan 5 pasal "paling tidak jauh"
  // untuk narasi yang tidak melanggar apa pun. Filternya ada di vectorSearch
  // (butuh DB); di sini dijaga cuma nilainya supaya tak diam-diam dilonggarkan
  // sampai tak bermakna. Cosine distance: 0 = identik, 1 = ortogonal.
  it("berada di rentang yang masih selektif", () => {
    expect(MAX_DISTANCE).toBeGreaterThan(0);
    expect(MAX_DISTANCE).toBeLessThan(1);
  });
});
