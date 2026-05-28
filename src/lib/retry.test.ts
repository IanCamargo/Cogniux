import { describe, it, expect } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("retorna na primeira tentativa bem-sucedida", async () => {
    const result = await withRetry(async () => "ok");
    expect(result).toBe("ok");
  });

  it("tenta novamente após falha", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) throw new Error("fail");
      return "ok";
    }, { maxAttempts: 3, backoffMs: 10 });
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("lança após esgotar tentativas", async () => {
    await expect(
      withRetry(async () => { throw new Error("always fail"); }, { maxAttempts: 2, backoffMs: 10 })
    ).rejects.toThrow("always fail");
  });
});
