import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  Type: {
    STRING: "STRING",
    NUMBER: "NUMBER",
    ARRAY: "ARRAY",
    OBJECT: "OBJECT",
  },
}));

import { generatePedagogicalPlan } from "./geminiService";

describe("geminiService", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("generatePedagogicalPlan retorna analysis e recommendations", async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"analysis":"Turma com dificuldade","recommendations":["Revisar cap 1"]}',
    });

    const plan = await generatePedagogicalPlan(
      "Matemática",
      { average: 6, maxScore: 9, minScore: 3, count: 5 },
      5
    );
    expect(plan.analysis).toBe("Turma com dificuldade");
    expect(plan.recommendations).toEqual(["Revisar cap 1"]);
  });
});
