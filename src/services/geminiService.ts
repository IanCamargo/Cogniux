import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface GradingResult {
  score: number;
  analysis: string;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
  };
  corrections: {
    original: string;
    suggested: string;
    explanation: string;
  }[];
}

export interface OMRResult {
  studentName: string;
  examId?: string;
  answers: string[]; // e.g. ["A", "B", "C", ...]
}

export async function scanAnswerSheet(
  base64Image: string,
  numQuestions: number,
  alternatives: string[] // e.g. ["A", "B", "C", "D"]
): Promise<OMRResult> {
  const prompt = `
    Esta é uma foto de um gabarito de prova.
    Instruções:
    1. Identifique o nome do aluno escrito no topo (se houver) ou contido dentro do QR Code.
    2. Localize um QR Code na imagem e extraia os dados dele. O QR Code deve conter um objeto JSON com "examId" e opcionalmente "studentName".
    3. Se o QR Code contiver "studentName", este deve ter prioridade sobre o que estiver escrito à mão.
    3. Identifique as alternativas marcadas para as questões de 1 a ${numQuestions}.
    4. As alternativas possíveis são: ${alternatives.join(", ")}.
    
    Retorne apenas o JSON no formato:
    {
      "studentName": "...",
      "examId": "...",
      "answers": ["A", "B", ...]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image.split(",")[1],
          mimeType: "image/jpeg",
        },
      },
      { text: prompt },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou uma resposta válida.");
  
  // Clean JSON string if LLM adds markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  return JSON.parse(jsonStr) as OMRResult;
}

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
}

export interface PedagogicalPlan {
  analysis: string;
  recommendations: string[];
}

export interface FileContext {
  data: string; // base64
  mimeType: string;
}

export async function generateExamQuestions(
  subject: string,
  topic: string,
  numQuestions: number,
  difficulty: "beginner" | "intermediate" | "advanced" = "intermediate",
  files?: FileContext[]
): Promise<GeneratedQuestion[]> {
  const prompt = `Gere ${numQuestions} questões de múltipla escolha sobre "${topic}" para a disciplina de "${subject}".
  ${files && files.length > 0 ? "Utilize o conteúdo dos arquivos anexados como base principal para as questões." : ""}
  Nível de dificuldade: ${difficulty}.
  Cada questão deve ter 5 alternativas (A, B, C, D, E).
  Retorne as questões em um formato estruturado adequado para uso pedagógico.`;

  const contents: any[] = [{ text: prompt }];
  
  if (files && files.length > 0) {
    files.forEach(file => {
      contents.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction: "Você é um assistente de professores que gera questões de alta qualidade academica.",
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
              description: "5 alternativas (A-E)"
            },
            correctAnswer: { type: Type.STRING, description: "Apenas a letra da alternativa correta (A, B, C, D ou E)" }
          },
          required: ["text", "options", "correctAnswer"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou questões.");
  return JSON.parse(text) as GeneratedQuestion[];
}

export async function generateAnswerKey(
  subject: string,
  topic: string,
  numQuestions: number,
  files?: FileContext[]
): Promise<string[]> {
  const prompt = `Gere apenas o GABARITO (lista de respostas corretas) para uma prova de "${subject}" sobre "${topic}".
  A prova possui ${numQuestions} questões.
  ${files && files.length > 0 ? "Utilize o conteúdo dos arquivos anexados para determinar as respostas corretas." : ""}
  Retorne um array de letras (A, B, C, D ou E) correspondente a cada questão.`;

  const contents: any[] = [{ text: prompt }];
  if (files) {
    files.forEach(f => contents.push({ inlineData: { data: f.data, mimeType: f.mimeType } }));
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction: "Você é um assistente que gera gabaritos precisos. Retorne APENAS um array JSON de strings.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar gabarito.");
  return JSON.parse(text) as string[];
}
export async function generatePedagogicalPlan(
  subject: string,
  examStats: any,
  submissions: any[]
): Promise<PedagogicalPlan> {
  const prompt = `Analise o desempenho da turma na prova de "${subject}".
  
  Dados da Turma:
  - Média: ${examStats.average}
  - Maior Nota: ${examStats.maxScore}
  - Menor Nota: ${examStats.minScore}
  - Total de Submissões: ${submissions.length}
  
  Por favor, identifique as principais dificuldades da turma e sugira um plano de ação pedagógico (estratégias de ensino, tópicos para revisão, atividades complementares).
  Foco em Português (Brasil).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Você é um coordenador pedagógico analítico que ajuda professores a melhorarem o desempenho das turmas.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING, description: "Análise profunda do desempenho da turma" },
          recommendations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de ações práticas para o professor"
          }
        },
        required: ["analysis", "recommendations"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou uma análise válida.");
  return JSON.parse(text) as PedagogicalPlan;
}

export async function gradeAnswer(
  question: string,
  studentAnswer: string,
  rubric?: string
): Promise<GradingResult> {
  const prompt = `
    Como um professor especialista, corrija a resposta do aluno para a pergunta abaixo.
    
    Pergunta: "${question}"
    ${rubric ? `Critérios de Avaliação/Resposta Esperada: "${rubric}"` : ""}
    Resposta do Aluno: "${studentAnswer}"
    
    Forneça uma análise pedagógica detalhada. A nota deve ser de 0 a 10.
    A análise deve ser construtiva e em Português (Brasil).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Você é um corretor de provas inteligente e pedagógico. Sua saída deve ser SEMPRE em JSON seguindo estritamente o esquema fornecido.",
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
            required: ["strengths", "weaknesses", "improvements"]
          },
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggested: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["original", "suggested", "explanation"]
            },
            description: "Correções gramaticais ou conceituais específicas"
          }
        },
        required: ["score", "analysis", "feedback", "corrections"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou uma resposta válida.");
  
  return JSON.parse(text) as GradingResult;
}
