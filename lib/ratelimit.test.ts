import { describe, expect, it } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit (in-memory, per-key)", () => {
  it("mengizinkan sampai batas, memblok setelahnya", () => {
    const k = "t-limit";
    expect(rateLimit(k, 2, 10_000)).toBe(true);
    expect(rateLimit(k, 2, 10_000)).toBe(true);
    expect(rateLimit(k, 2, 10_000)).toBe(false); // ke-3 lewat batas
  });

  it("reset setelah window kadaluarsa", async () => {
    const k = "t-reset";
    expect(rateLimit(k, 1, 10)).toBe(true);
    expect(rateLimit(k, 1, 10)).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(rateLimit(k, 1, 10)).toBe(true); // window baru
  });

  it("key berbeda punya bucket terpisah", () => {
    expect(rateLimit("t-a", 1, 10_000)).toBe(true);
    expect(rateLimit("t-b", 1, 10_000)).toBe(true);
  });
});
