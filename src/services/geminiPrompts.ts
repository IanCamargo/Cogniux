import type { FileContext } from "@/types";

export const GEMINI_MODEL = "gemini-3-flash-preview";

export type ExamDifficulty = "beginner" | "intermediate" | "advanced";

export type ExamStatsInput = {
  average: number;
  maxScore: number;
  minScore: number;
};

export const SYSTEM_INSTRUCTIONS = {
  examQuestions:
    "Você é um assistente de professores que gera questões de alta qualidade academica.",
  answerKey:
    "Você é um assistente que gera gabaritos precisos. Retorne APENAS um array JSON de strings.",
  pedagogicalPlan:
    "Você é um coordenador pedagógico analítico que ajuda professores a melhorarem o desempenho das turmas.",
  gradeAnswer:
    "Você é um corretor de provas inteligente e pedagógico. Sua saída deve ser SEMPRE em JSON seguindo estritamente o esquema fornecido.",
} as const;

const EXAM_QUESTIONS_WITH_FILES =
  "Utilize o conteúdo dos arquivos anexados como base principal para as questões.";
const ANSWER_KEY_WITH_FILES =
  "Utilize o conteúdo dos arquivos anexados para determinar as respostas corretas.";

function filesLine(hasFiles: boolean, withFilesText: string): string {
  return hasFiles ? withFilesText : "";
}

export function buildExamQuestionsPrompt(params: {
  subject: string;
  topic: string;
  numQuestions: number;
  difficulty: ExamDifficulty;
  hasFiles?: boolean;
}): string {
  const { subject, topic, numQuestions, difficulty, hasFiles = false } = params;
  const filesHint = filesLine(hasFiles, EXAM_QUESTIONS_WITH_FILES);

  return [
    `Gere ${numQuestions} questões de múltipla escolha sobre "${topic}" para a disciplina de "${subject}".`,
    filesHint,
    `Nível de dificuldade: ${difficulty}.`,
    "Cada questão deve ter 5 alternativas (A, B, C, D, E).",
    "Retorne as questões em um formato estruturado adequado para uso pedagógico.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAnswerKeyPrompt(params: {
  subject: string;
  topic: string;
  numQuestions: number;
  hasFiles?: boolean;
}): string {
  const { subject, topic, numQuestions, hasFiles = false } = params;
  const filesHint = filesLine(hasFiles, ANSWER_KEY_WITH_FILES);

  return [
    `Gere apenas o GABARITO (lista de respostas corretas) para uma prova de "${subject}" sobre "${topic}".`,
    `A prova possui ${numQuestions} questões.`,
    filesHint,
    "Retorne um array de letras (A, B, C, D ou E) correspondente a cada questão.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPedagogicalPlanPrompt(params: {
  subject: string;
  examStats: ExamStatsInput;
  submissionCount: number;
}): string {
  const { subject, examStats, submissionCount } = params;

  return [
    `Analise o desempenho da turma na prova de "${subject}".`,
    "",
    "Dados da Turma:",
    `- Média: ${examStats.average}`,
    `- Maior Nota: ${examStats.maxScore}`,
    `- Menor Nota: ${examStats.minScore}`,
    `- Total de Submissões: ${submissionCount}`,
    "",
    "Por favor, identifique as principais dificuldades da turma e sugira um plano de ação pedagógico (estratégias de ensino, tópicos para revisão, atividades complementares).",
    "Foco em Português (Brasil).",
  ].join("\n");
}

export function buildGradeAnswerPrompt(params: {
  question: string;
  studentAnswer: string;
  rubric?: string;
}): string {
  const { question, studentAnswer, rubric } = params;
  const rubricLine = rubric
    ? `Critérios de Avaliação/Resposta Esperada: "${rubric}"`
    : "";

  return [
    "Como um professor especialista, corrija a resposta do aluno para a pergunta abaixo.",
    "",
    `Pergunta: "${question}"`,
    rubricLine,
    `Resposta do Aluno: "${studentAnswer}"`,
    "",
    "Forneça uma análise pedagógica detalhada. A nota deve ser de 0 a 10.",
    "A análise deve ser construtiva e em Português (Brasil).",
  ]
    .filter(Boolean)
    .join("\n");
}

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

export function buildContentsWithFiles(
  prompt: string,
  files?: FileContext[]
): GeminiContentPart[] {
  const contents: GeminiContentPart[] = [{ text: prompt }];
  files?.forEach((file) => {
    contents.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
  });
  return contents;
}
