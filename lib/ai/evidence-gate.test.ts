import { describe, it, expect } from "vitest";
import {
  emptySlots,
  advanceSlots,
  isReadyForDraftOffer,
  isReadyToShowDraft,
  SLOT_ORDER,
} from "./classify-narrative";
import type { Slots } from "./classify-narrative";

// Semua field gathering terisi (bukti SENGAJA tak ikut — bukan slot gathering lagi).
function allFilled(): Slots {
  const s = emptySlots();
  for (const f of SLOT_ORDER) s[f] = "filled";
  return s;
}

describe("W3 evidence gate", () => {
  it("bukti bukan slot gathering — tak menghalangi 'ready'", () => {
    expect(SLOT_ORDER).not.toContain("bukti");
    const s = allFilled();
    expect(isReadyForDraftOffer(s)).toBe(true); // walau slots.bukti masih 'empty'
  });

  it("ready TIDAK cukup untuk tampil draf sampai bukti resolved", () => {
    const s = allFilled();
    expect(isReadyToShowDraft(s)).toBe(false);
    s.evidenceResolved = true;
    expect(isReadyToShowDraft(s)).toBe(true);
  });

  it("belum lengkap → belum ready walau bukti resolved", () => {
    const s = emptySlots();
    s.evidenceResolved = true;
    expect(isReadyForDraftOffer(s)).toBe(false);
    expect(isReadyToShowDraft(s)).toBe(false);
  });

  it("advanceSlots menandai ready begitu semua field gathering terisi", () => {
    const { ready, target } = advanceSlots(allFilled());
    expect(ready).toBe(true);
    expect(target).toBeNull();
  });
});
