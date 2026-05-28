import { describe, it, expect } from "vitest";
import { submissionsToCsv } from "./export";

describe("submissionsToCsv", () => {
  it("gera CSV com BOM e colunas corretas", () => {
    const csv = submissionsToCsv(
      [{ id: "1", studentName: "João", answers: ["A", "B"], score: 10 }],
      { subject: "Math", numQuestions: 2 }
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Aluno,Nota,Q1,Q2");
    expect(csv).toContain("João,10.0,A,B");
  });

  it("escapa nomes com vírgula", () => {
    const csv = submissionsToCsv(
      [{ id: "1", studentName: "Silva, João", answers: ["A"], score: 5 }],
      { subject: "Math", numQuestions: 1 }
    );
    expect(csv).toContain('"Silva, João"');
  });
});
