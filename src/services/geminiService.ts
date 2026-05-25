import { GoogleGenAI, Type } from "@google/genai";
import { parseJsonResponse } from "@/lib/gemini";
import { withRetry } from "@/lib/retry";
import {
  GEMINI_MODEL,
  SYSTEM_INSTRUCTIONS,
  buildAnswerKeyPrompt,
  buildContentsWithFiles,
  buildExamQuestionsPrompt,
  buildGradeAnswerPrompt,
  buildPedagogicalPlanPrompt,
} from "@/services/geminiPrompts";
import type {
  FileContext,
  GeneratedQuestion,
  GradingResult,
  PedagogicalPlan,
} from "@/types";

export type { GradingResult, GeneratedQuestion, PedagogicalPlan, FileContext };

export class GeminiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiServiceError";
  }
}

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }
  return aiClient;
}

async function callGemini<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withRetry(fn, { maxAttempts: 3, backoffMs: 1000, timeoutMs: 30000 });
  } catch (error) {
    throw new GeminiServiceError(
      error instanceof Error ? error.message : "Erro desconhecido na chamada à IA."
    );
  }
}

export async function generateExamQuestions(
  subject: string,
  topic: string,
  numQuestions: number,
  difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
  files?: FileContext[]
): Promise<GeneratedQuestion[]> {
  const prompt = buildExamQuestionsPrompt({
    subject,
    topic,
    numQuestions,
    difficulty,
    hasFiles: Boolean(files?.length),
  });
  const contents = buildContentsWithFiles(prompt, files);

  return callGemini(async () => {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS.examQuestions,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "O enunciado da questão" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "5 alternativas (A-E)",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "Apenas a letra da alternativa correta (A, B, C, D ou E)",
              },
            },
            required: ["text", "options", "correctAnswer"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new GeminiServiceError("A IA não retornou questões.");
    return parseJsonResponse<GeneratedQuestion[]>(text);
  });
}

export async function generateAnswerKey(
  subject: string,
  topic: string,
  numQuestions: number,
  files?: FileContext[]
): Promise<string[]> {
  const prompt = buildAnswerKeyPrompt({
    subject,
    topic,
    numQuestions,
    hasFiles: Boolean(files?.length),
  });
  const contents = buildContentsWithFiles(prompt, files);

  return callGemini(async () => {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS.answerKey,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const text = response.text;
    if (!text) throw new GeminiServiceError("Falha ao gerar gabarito.");
    return parseJsonResponse<string[]>(text);
  });
}

export async function generatePedagogicalPlan(
  subject: string,
  examStats: { average: number; maxScore: number; minScore: number; count: number },
  submissionCount: number
): Promise<PedagogicalPlan> {
  const prompt = buildPedagogicalPlanPrompt({ subject, examStats, submissionCount });

  return callGemini(async () => {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS.pedagogicalPlan,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Análise profunda do desempenho da turma" },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de ações práticas para o professor",
            },
          },
          required: ["analysis", "recommendations"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new GeminiServiceError("A IA não retornou uma análise válida.");
    return parseJsonResponse<PedagogicalPlan>(text);
  });
}

export async function gradeAnswer(
  question: string,
  studentAnswer: string,
  rubric?: string
): Promise<GradingResult> {
  const prompt = buildGradeAnswerPrompt({ question, studentAnswer, rubric });

  return callGemini(async () => {
    const response = await getAI().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS.gradeAnswer,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Nota de 0 a 10" },
            analysis: { type: Type.STRING, description: "Resumo pedagógico da resposta" },
            feedback: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Pontos fortes" },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Pontos fracos" },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sugestões de melhoria" },
              },
              required: ["strengths", "weaknesses", "improvements"],
            },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggested: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["original", "suggested", "explanation"],
              },
              description: "Correções gramaticais ou conceituais específicas",
            },
          },
          required: ["score", "analysis", "feedback", "corrections"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new GeminiServiceError("A IA não retornou uma resposta válida.");
    return parseJsonResponse<GradingResult>(text);
  });
}
