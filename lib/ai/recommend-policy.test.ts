import { describe, expect, it } from "vitest";
import { mergeVectorFirst, MAX_DISTANCE, type PolicyChunk } from "./recommend-policy";

const chunk = (id: string): PolicyChunk => ({
  id,
  documentTitle: "Tata Tertib Sekolah",
  content: `isi pasal ${id}`,
});

describe("mergeVectorFirst — vektor-dulu, keyword menambah recall", () => {
  it("urutan VEKTOR menentukan; chunk keyword-only ditambah di bawahnya", () => {
    const vector = [chunk("v1"), chunk("v2")];
    const keyword = [chunk("k1"), chunk("v2")]; // v2 juga muncul di keyword

    expect(mergeVectorFirst(vector, keyword).map((c) => c.id)).toEqual(["v1", "v2", "k1"]);
  });

  it("chunk di DUA jalur → posisi vektornya yang menang (BUKAN promosi 'agreement' RRF)", () => {
    // "b" peringkat-1 di keyword tapi peringkat-2 di vektor. RRF lama mengangkatnya
    // ke puncak; vektor-dulu menahannya di posisi vektor (indeks 1), di bawah "x".
    const vector = [chunk("x"), chunk("b")];
    const keyword = [chunk("b"), chunk("a")];

    expect(mergeVectorFirst(vector, keyword).map((c) => c.id)).toEqual(["x", "b", "a"]);
  });

  it("vektor kosong → keyword murni, urutan utuh (degradasi vendor down)", () => {
    const keyword = [chunk("a"), chunk("b"), chunk("c")];

    expect(mergeVectorFirst([], keyword).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("kedua jalur kosong → kosong, JANGAN mengarang", () => {
    expect(mergeVectorFirst([], [])).toEqual([]);
  });

  it("tidak pernah mengembalikan duplikat walau chunk ada di dua jalur", () => {
    const both = [chunk("a"), chunk("b")];

    expect(mergeVectorFirst(both, both).map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("dibatasi MAX_RESULTS (5) walau masukan jauh lebih banyak", () => {
    const v = Array.from({ length: 10 }, (_, i) => chunk(`v${i}`));
    const k = Array.from({ length: 10 }, (_, i) => chunk(`k${i}`));

    expect(mergeVectorFirst(v, k)).toHaveLength(5);
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
