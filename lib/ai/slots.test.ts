import { describe, it, expect } from "vitest";
import {
  emptySlots,
  updateSlots,
  advanceSlots,
  nextEmptyField,
  identifyMissingBlocks,
  isReadyForDraftOffer,
  DECLINED_SENTINEL,
  SLOT_ORDER,
  REQUIRED_BLOCKS,
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
  it("target = field kosong pertama sesuai urutan (keamanan dulu, W2 §5)", () => {
    const s: Slots = { ...emptySlots(), gambaran_kejadian: "filled" };
    expect(advanceSlots(s).target).toBe("keamanan");
  });

  it("field sama gagal terisi 2x → di-skip, pindah ke berikutnya", () => {
    // keamanan & gambaran sudah resolved → field kosong pertama = waktu.
    let s: Slots = { ...emptySlots(), keamanan: "filled", gambaran_kejadian: "filled" };
    s = advanceSlots(s).slots; // ask #1 waktu
    expect(s.target).toBe("waktu");
    expect(s.targetCount).toBe(1);
    s = advanceSlots(s).slots; // ask #2 waktu (masih kosong)
    expect(s.target).toBe("waktu");
    expect(s.targetCount).toBe(2);
    const r = advanceSlots(s); // giliran ke-3 → skip waktu, target lokasi
    expect(r.slots.waktu).toBe("skipped");
    expect(r.target).toBe("lokasi");
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

  it("field yang di-decline (sentinel) → status 'declined', dihitung tersentuh", () => {
    // Siswa menolak sebut pelaku & dampak → Tier 2 tulis sentinel ke field teks tsb.
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: "dalam-sekolah", waktu: "kemarin", deskripsi: "didorong" },
      terlapor: { perpetratorRole: null, deskripsi: DECLINED_SENTINEL },
      dampak: { deskripsi: DECLINED_SENTINEL },
      keamanan: { adaBahayaLangsung: null, deskripsi: DECLINED_SENTINEL },
      violenceType: ["kekerasan-fisik"],
    }));
    expect(s.pelaku).toBe("declined"); // sentinel = declined, bukan filled
    expect(s.dampak).toBe("declined");
    expect(s.keamanan).toBe("declined");
  });

  it("campuran dijawab-decline-belum ditanya: hanya yang belum tersentuh jadi target", () => {
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: null, waktu: null, deskripsi: "didorong" }, // gambaran dijawab
      terlapor: { perpetratorRole: null, deskripsi: DECLINED_SENTINEL }, // pelaku decline
      violenceType: ["kekerasan-fisik"], // klasifikasi auto-fill via gambaran
    }));
    expect(s.gambaran_kejadian).toBe("filled");
    expect(s.pelaku).toBe("declined");
    expect(s.klasifikasi).toBe("filled");
    // target berikutnya = field kosong pertama sesuai urutan baru (keamanan), bukan pelaku yang sudah decline
    expect(nextEmptyField(s)).toBe("keamanan");
  });

  it("klasifikasi ter-fill bareng gambaran_kejadian, tak pernah jadi target sendirian", () => {
    const s = updateSlots(emptySlots(), draftWith({
      kejadian: { locationCategory: null, waktu: null, deskripsi: "dipukul" },
      violenceType: [], // tipe belum ke-derive, tapi narasi kejadian ada
    }));
    expect(s.klasifikasi).toBe("filled"); // cukup ada narasi kejadian
  });

  it("transkrip menghindar berulang dari satu topik → anti-stall skip, lanjut", () => {
    // keamanan/gambaran/waktu/lokasi/korban resolved; pelaku terus dihindari → skip setelah 2x.
    let s: Slots = {
      ...emptySlots(),
      keamanan: "filled",
      gambaran_kejadian: "filled",
      waktu: "filled",
      lokasi: "filled",
      korban: "filled",
    };
    s = advanceSlots(s).slots; // ask #1 pelaku
    s = advanceSlots(s).slots; // ask #2 pelaku
    const r = advanceSlots(s); // giliran ke-3 → skip pelaku, target dampak
    expect(r.slots.pelaku).toBe("skipped");
    expect(r.target).toBe("dampak");
  });
});

describe("identifyMissingBlocks + required/optional gate (W2 §3/§10)", () => {
  it("identifyMissingBlocks = blok WAJIB yang masih empty; dampak opsional tak dihitung", () => {
    const s = emptySlots();
    expect(identifyMissingBlocks(s)).toEqual(REQUIRED_BLOCKS);
    expect(identifyMissingBlocks(s)).not.toContain("dampak");
  });

  it("semua wajib resolved (dampak dibiarkan empty) → gate lolos", () => {
    const s = emptySlots();
    for (const f of REQUIRED_BLOCKS) s[f] = "filled";
    expect(s.dampak).toBe("empty");
    expect(identifyMissingBlocks(s)).toEqual([]);
    expect(isReadyForDraftOffer(s)).toBe(true);
  });

  it("blok wajib di-decline semua → gate tetap lolos (tak infinite loop)", () => {
    const s = emptySlots();
    for (const f of REQUIRED_BLOCKS) s[f] = "declined";
    expect(isReadyForDraftOffer(s)).toBe(true);
  });
});
