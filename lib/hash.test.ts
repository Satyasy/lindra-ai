import { expect, it } from "vitest";
import { sha256 } from "./hash";

it("sha256 deterministik dan membedakan input", () => {
  expect(sha256("laporan A")).toBe(sha256("laporan A"));
  expect(sha256("laporan A")).not.toBe(sha256("laporan B"));
  // vektor uji dikenal: sha256("") = e3b0...
  expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});
