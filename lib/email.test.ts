import { describe, it, expect } from "vitest";
import { FOLLOWUP_BODY, FOLLOWUP_SUBJECT, FOLLOWUP_MENU_URL } from "./email";

// Aturan keras (Panduan §3): email follow-up netral & aman untuk perangkat yang
// mungkin diawasi pelaku. Guard permanen — email TAK boleh bocorkan kode/kata sensitif.
describe("follow-up email — netral & aman", () => {
  const text = `${FOLLOWUP_SUBJECT}\n${FOLLOWUP_BODY}`.toLowerCase();

  it("tak memuat kata sensitif (kekerasan/laporan)", () => {
    expect(text).not.toContain("kekerasan");
    expect(text).not.toContain("laporan");
  });

  it("tak memuat token/auto-login/kode nyata di URL", () => {
    expect(FOLLOWUP_MENU_URL).toMatch(/\/masuk$/); // link hanya ke menu input kode
    expect(FOLLOWUP_BODY).not.toMatch(/[?&](code|token|kode|auth|login)=/i);
    expect(text).not.toContain("auto-login");
  });

  it("mengarahkan ke menu input kode manual (link ada, kode tidak)", () => {
    expect(FOLLOWUP_BODY).toContain(FOLLOWUP_MENU_URL);
  });
});
