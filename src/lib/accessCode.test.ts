import { describe, it, expect } from "vitest";
import { normalizeAccessCode } from "./accessCode";

describe("normalizeAccessCode", () => {
  it("normaliza trim e uppercase", () => {
    expect(normalizeAccessCode(" abc123 ")).toBe("ABC123");
  });

  it("lança erro para código vazio", () => {
    expect(() => normalizeAccessCode("  ")).toThrow("vazio");
  });
});
