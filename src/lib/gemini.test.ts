import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "./gemini";

describe("parseJsonResponse", () => {
  it("parseia JSON puro", () => {
    expect(parseJsonResponse<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("extrai JSON de markdown", () => {
    const text = '```json\n{"name": "test"}\n```';
    expect(parseJsonResponse<{ name: string }>(text)).toEqual({ name: "test" });
  });

  it("lança erro para texto inválido", () => {
    expect(() => parseJsonResponse("not json")).toThrow("JSON válido");
  });
});
