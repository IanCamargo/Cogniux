import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("mescla classes sem duplicatas", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
