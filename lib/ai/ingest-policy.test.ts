import { describe, expect, it } from "vitest";
import { chunkText, isAcceptedFilename } from "./ingest-policy";

describe("chunkText — 1 paragraf = 1 chunk", () => {
  it("memisah per baris kosong, bukan per baris", () => {
    const raw = "Pasal 1\nSiswa dilarang memukul siswa lain.\n\nPasal 2\nSiswa wajib hadir tepat waktu.";

    const chunks = chunkText(raw);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe("Pasal 1 Siswa dilarang memukul siswa lain.");
    expect(chunks[1]).toBe("Pasal 2 Siswa wajib hadir tepat waktu.");
  });

  it("membuang baris pendek (judul, nomor halaman)", () => {
    const raw = "BAB I\n\nSiswa dilarang melakukan perundungan dalam bentuk apa pun.\n\n1";

    expect(chunkText(raw)).toEqual([
      "Siswa dilarang melakukan perundungan dalam bentuk apa pun.",
    ]);
  });

  it("menormalkan spasi/newline di dalam paragraf jadi satu spasi", () => {
    expect(chunkText("Siswa   dilarang\n  memukul    siswa lain.")).toEqual([
      "Siswa dilarang memukul siswa lain.",
    ]);
  });

  it("dokumen tanpa baris kosong jadi SATU chunk — inilah kenapa PDF/DOCX ditolak", () => {
    // Ekstraksi PDF khasnya menghasilkan blob tanpa batas paragraf. Hasilnya satu
    // chunk raksasa: retrieval selalu mengembalikan "seluruh dokumen", jadi tak
    // ada gunanya sebagai kutipan. Test ini merekam alasan penolakan itu.
    const blob = "Pasal 1 siswa dilarang memukul. Pasal 2 siswa wajib hadir. Pasal 3 dilarang merokok.";

    expect(chunkText(blob)).toHaveLength(1);
  });

  it("file kosong / hanya spasi -> tanpa chunk (bukan crash)", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  \n ")).toEqual([]);
  });
});

describe("isAcceptedFilename", () => {
  it("menerima .txt dan .md, apa pun kapitalisasinya", () => {
    expect(isAcceptedFilename("tata-tertib.txt")).toBe(true);
    expect(isAcceptedFilename("TATA-TERTIB.TXT")).toBe(true);
    expect(isAcceptedFilename("uu-23-2002.md")).toBe(true);
  });

  it("menolak format yang merusak chunking", () => {
    expect(isAcceptedFilename("tata-tertib.pdf")).toBe(false);
    expect(isAcceptedFilename("tata-tertib.docx")).toBe(false);
    // Ekstensi ganda: yang menentukan adalah yang terakhir.
    expect(isAcceptedFilename("tata-tertib.txt.pdf")).toBe(false);
  });
});
