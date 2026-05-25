import { describe, it, expect } from "vitest";
import { calculateExamStats, calculateDashboardStats } from "./examStats";

describe("calculateExamStats", () => {
  it("calcula média, min e max", () => {
    const stats = calculateExamStats([{ score: 7 }, { score: 5 }, { score: 9 }]);
    expect(stats.average).toBeCloseTo(7);
    expect(stats.minScore).toBe(5);
    expect(stats.maxScore).toBe(9);
    expect(stats.count).toBe(3);
  });

  it("retorna zeros para array vazio", () => {
    expect(calculateExamStats([])).toEqual({ average: 0, maxScore: 0, minScore: 0, count: 0 });
  });
});

describe("calculateDashboardStats", () => {
  it("agrega métricas do dashboard", () => {
    const now = new Date();
    const stats = calculateDashboardStats(
      [{ createdAt: { toDate: () => now } }],
      [{ score: 8 }, { score: 6 }]
    );
    expect(stats.totalExams).toBe(1);
    expect(stats.examsThisMonth).toBe(1);
    expect(stats.totalSubmissions).toBe(2);
    expect(stats.averageScore).toBe(7);
  });
});
