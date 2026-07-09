import { describe, it, expect } from "vitest";
import {
  emptySlots,
  updateSlots,
  advanceSlots,
  type ReportDraft,
  type Slots,
} from "./classify-narrative";

// Draft ekstraksi minimal — hanya field yang relevan buat slot presence.
function draftWith(over: Partial<ReportDraft>): ReportDraft {
  return {
    pelapor: null,
    korban: null,
    terlapor: { perpetratorRole: null, deskripsi: null },
    kejadian: { locationCategory: null, waktu: null, deskripsi: null },
    klasifikasi: { violenceType: [] },
    bukti: { adaBukti: null, deskripsi: null },
    dampak: { deskripsi: null },
    keamanan: { adaBahayaLangsung: null, deskripsi: null },
    cederaFisik: null,
    sudahBerulang: null,
    relasiKuasaTimpang: null,
    urgencyLevel: "sedang",
    perpetratorRole: null,
    locationCategory: null,
    violenceType: [],
    narrativeSummary: "x",
    ...over,
  };
}

describe("updateSlots — sticky lock", () => {
  it("mengunci empty→filled dan tak pernah balik walau ekstraksi berikutnya kosong", () => {
    let s = emptySlots();
    s = updateSlots(s, draftWith({ kejadian: { deskripsi: "didorong", waktu: null, locationCategory: null } }));
    expect(s.gambaran_kejadian).toBe("filled");
    // ekstraksi giliran lain tak menyebut kejadian → tetap terkunci filled
    s = updateSlots(s, draftWith({}));
    expect(s.gambaran_kejadian).toBe("filled");
  });
});

describe("advanceSlots — target order + anti-stall + ready", () => {
  it("target = field kosong pertama sesuai urutan", () => {
    const s: Slots = { ...emptySlots(), gambaran_kejadian: "filled" };
    expect(advanceSlots(s).target).toBe("pelaku");
  });

  it("field sama gagal terisi 2x → di-skip, pindah ke berikutnya", () => {
    let s: Slots = { ...emptySlots(), gambaran_kejadian: "filled" };
    s = advanceSlots(s).slots; // ask #1 pelaku
    expect(s.target).toBe("pelaku");
    expect(s.targetCount).toBe(1);
    s = advanceSlots(s).slots; // ask #2 pelaku (masih kosong)
    expect(s.target).toBe("pelaku");
    expect(s.targetCount).toBe(2);
    const r = advanceSlots(s); // giliran ke-3 → skip pelaku, target waktu
    expect(r.slots.pelaku).toBe("skipped");
    expect(r.target).toBe("waktu");
  });

  it("semua terisi/skip → ready, tanpa target", () => {
    const s: Slots = {
      ...emptySlots(),
      gambaran_kejadian: "filled",
      pelaku: "skipped",
      waktu: "filled",
      dampak: "filled",
      lokasi: "skipped",
    };
    const r = advanceSlots(s);
    expect(r.ready).toBe(true);
    expect(r.target).toBeNull();
    expect(r.slots.phase).toBe("ready");
  });
});
