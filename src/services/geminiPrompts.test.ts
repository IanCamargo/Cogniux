import { describe, it, expect } from "vitest";
import {
  SYSTEM_INSTRUCTIONS,
  buildAnswerKeyPrompt,
  buildExamQuestionsPrompt,
  buildGradeAnswerPrompt,
  buildPedagogicalPlanPrompt,
  buildContentsWithFiles,
} from "./geminiPrompts";

describe("geminiPrompts", () => {
  it("buildExamQuestionsPrompt inclui arquivos quando hasFiles", () => {
    const prompt = buildExamQuestionsPrompt({
      subject: "Matemática",
      topic: "Funções",
      numQuestions: 10,
      difficulty: "intermediate",
      hasFiles: true,
    });
    expect(prompt).toContain("10");
    expect(prompt).toContain("Funções");
    expect(prompt).toContain("arquivos anexados");
  });

  it("buildExamQuestionsPrompt omite linha de arquivos sem anexos", () => {
    const prompt = buildExamQuestionsPrompt({
      subject: "História",
      topic: "Brasil Colônia",
      numQuestions: 5,
      difficulty: "beginner",
      hasFiles: false,
    });
    expect(prompt).not.toContain("arquivos anexados");
  });

  it("buildAnswerKeyPrompt inclui numQuestions", () => {
    const prompt = buildAnswerKeyPrompt({
      subject: "Física",
      topic: "Leis de Newton",
      numQuestions: 15,
      hasFiles: true,
    });
    expect(prompt).toContain("15");
    expect(prompt).toContain("GABARITO");
  });

  it("buildPedagogicalPlanPrompt inclui estatísticas", () => {
    const prompt = buildPedagogicalPlanPrompt({
      subject: "Química",
      examStats: { average: 7.2, maxScore: 10, minScore: 4 },
      submissionCount: 28,
    });
    expect(prompt).toContain("7.2");
    expect(prompt).toContain("28");
  });

  it("buildGradeAnswerPrompt inclui rubric quando informada", () => {
    const withRubric = buildGradeAnswerPrompt({
      question: "O que é fotossíntese?",
      studentAnswer: "Processo das plantas.",
      rubric: "Mencionar clorofila e luz",
    });
    expect(withRubric).toContain("Mencionar clorofila");

    const withoutRubric = buildGradeAnswerPrompt({
      question: "O que é fotossíntese?",
      studentAnswer: "Processo das plantas.",
    });
    expect(withoutRubric).not.toContain("Critérios de Avaliação");
  });

  it("buildContentsWithFiles anexa inlineData", () => {
    const contents = buildContentsWithFiles("prompt", [
      { data: "abc", mimeType: "image/png" },
    ]);
    expect(contents).toHaveLength(2);
    expect(contents[0]).toEqual({ text: "prompt" });
    expect(contents[1]).toEqual({ inlineData: { data: "abc", mimeType: "image/png" } });
  });

  it("SYSTEM_INSTRUCTIONS define todas as chaves", () => {
    expect(SYSTEM_INSTRUCTIONS.examQuestions).toBeTruthy();
    expect(SYSTEM_INSTRUCTIONS.answerKey).toBeTruthy();
    expect(SYSTEM_INSTRUCTIONS.pedagogicalPlan).toBeTruthy();
    expect(SYSTEM_INSTRUCTIONS.gradeAnswer).toBeTruthy();
  });
});
