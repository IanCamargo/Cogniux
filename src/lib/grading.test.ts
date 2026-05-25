import { describe, it, expect } from "vitest";
import { calculateScore, getScoreColorClass, getAlternatives } from "./grading";

describe("calculateScore", () => {
  it("calcula nota proporcional aos acertos", () => {
    expect(calculateScore(["A", "B", "C", "D", "E", "A", "B", "C"], ["A", "B", "C", "D", "E", "A", "B", "X"])).toBe(8.75);
  });

  it("retorna 0 quando nenhuma resposta está correta", () => {
    expect(calculateScore(["X", "X"], ["A", "B"])).toBe(0);
  });

  it("retorna 0 quando gabarito está vazio", () => {
    expect(calculateScore(["A"], [])).toBe(0);
  });
});

describe("getScoreColorClass", () => {
  it("retorna classes por faixa de nota", () => {
    expect(getScoreColorClass(8)).toContain("emerald");
    expect(getScoreColorClass(6)).toContain("amber");
    expect(getScoreColorClass(3)).toContain("destructive");
  });
});

describe("getAlternatives", () => {
  it("retorna letras corretas", () => {
    expect(getAlternatives(4)).toEqual(["A", "B", "C", "D"]);
  });
});
