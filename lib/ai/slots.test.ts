import { describe, it, expect } from "vitest";
import {
  emptySlots,
  updateSlots,
  advanceSlots,
  nextEmptyField,
  DECLINED_SENTINEL,
  SLOT_ORDER,
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

  it("semua 8 blok terisi/skip → ready, tanpa target", () => {
    // Tiap slot di SLOT_ORDER harus filled/skipped agar ready — buktikan gate mencakup 8 blok.
    const s: Slots = { ...emptySlots(), phase: "gathering" };
    for (const f of SLOT_ORDER) s[f] = "filled";
    const r = advanceSlots(s);
    expect(r.ready).toBe(true);
    expect(r.target).toBeNull();
    expect(r.slots.phase).toBe("ready");
  });

  it("BELUM ready kalau satu blok baru (mis. keamanan) masih empty", () => {
    const s: Slots = { ...emptySlots() };
    for (const f of SLOT_ORDER) s[f] = "filled";
    s.keamanan = "empty";
    const r = advanceSlots(s);
    expect(r.ready).toBe(false);
    expect(r.target).toBe("keamanan");
  });
});

// Draft lengkap semua blok — dipakai skenario "semua dijawab".
function fullDraft(): ReportDraft {
  return draftWith({
    pelapor: { relasiDenganKorban: "korban sendiri" },
    korban: { kelas: "8", jenisKelamin: "perempuan" },
    terlapor: { perpetratorRole: "siswa", deskripsi: "kakak kelas" },
    kejadian: { locationCategory: "dalam-sekolah", waktu: "kemarin", deskripsi: "didorong" },
    klasifikasi: { violenceType: ["kekerasan-fisik"] },
    bukti: { adaBukti: true, deskripsi: "ada chat" },
    dampak: { deskripsi: "jadi takut sekolah" },
    keamanan: { adaBahayaLangsung: false, deskripsi: "aman sekarang" },
    violenceType: ["kekerasan-fisik"],
  });
}

describe("8-blok coverage — updateSlots mengunci semua blok", () => {
  it("semua field dijawab → semua slot filled → ready", () => {
    const advanced = advanceSlots(updateSlots(emptySlots(), fullDraft()));
    expect(advanced.ready).toBe(true);
    for (const f of SLOT_ORDER) expect(advanced.slots[f]).toBe("filled");
  });

  it("field yang di-decline (sentinel) dihitung tersentuh, bukan missing", () => {
    // Siswa menolak sebut pelaku & dampak → Tier 2 tulis sentinel ke field teks tsb.
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: "dalam-sekolah", waktu: "kemarin", deskripsi: "didorong" },
      terlapor: { perpetratorRole: null, deskripsi: DECLINED_SENTINEL },
      dampak: { deskripsi: DECLINED_SENTINEL },
      keamanan: { adaBahayaLangsung: null, deskripsi: DECLINED_SENTINEL },
      violenceType: ["kekerasan-fisik"],
    }));
    expect(s.pelaku).toBe("filled"); // sentinel = tersentuh
    expect(s.dampak).toBe("filled");
    expect(s.keamanan).toBe("filled");
  });

  it("campuran dijawab-decline-belum ditanya: hanya yang belum tersentuh jadi target", () => {
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: null, waktu: null, deskripsi: "didorong" }, // gambaran dijawab
      terlapor: { perpetratorRole: null, deskripsi: DECLINED_SENTINEL }, // pelaku decline
      violenceType: ["kekerasan-fisik"], // klasifikasi auto-fill via gambaran
    }));
    expect(s.gambaran_kejadian).toBe("filled");
    expect(s.pelaku).toBe("filled");
    expect(s.klasifikasi).toBe("filled");
    // target berikutnya = field kosong pertama sesuai urutan (waktu), bukan pelaku yang sudah decline
    expect(nextEmptyField(s)).toBe("waktu");
  });

  it("klasifikasi ter-fill bareng gambaran_kejadian, tak pernah jadi target sendirian", () => {
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: null, waktu: null, deskripsi: "dipukul" },
      violenceType: [], // tipe belum ke-derive, tapi narasi kejadian ada
    }));
    expect(s.klasifikasi).toBe("filled"); // cukup ada narasi kejadian
  });

  it("transkrip menghindar berulang dari satu topik → anti-stall skip, lanjut", () => {
    // gambaran terisi, pelaku terus dihindari (extraction tak pernah mengisi) → skip setelah 2x.
    let s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: null, waktu: null, deskripsi: "diejek" },
    }));
    s = advanceSlots(s).slots; // ask #1 pelaku
    s = advanceSlots(s).slots; // ask #2 pelaku
    const r = advanceSlots(s); // giliran ke-3 → skip pelaku
    expect(r.slots.pelaku).toBe("skipped");
    expect(r.target).toBe("waktu");
  });
});
