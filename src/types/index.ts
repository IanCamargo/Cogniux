import { Timestamp } from "firebase/firestore";

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
}

export interface Exam {
  id: string;
  subject: string;
  semester: string;
  course?: string;
  className?: string;
  unit?: string;
  numQuestions: number;
  alternativesPerQuestion: number;
  answerKey: string[];
  questions?: GeneratedQuestion[] | null;
  isOnline: boolean;
  professorId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Student {
  id: string;
  name: string;
  registrationId?: string;
  createdAt?: Timestamp;
}

export interface Submission {
  id: string;
  examId?: string;
  studentName: string;
  answers: string[];
  score: number;
  gradedAt?: Timestamp;
  isOnline?: boolean;
  accessToken?: string | null;
}

export interface PedagogicalPlan {
  id?: string;
  examId?: string;
  analysis: string;
  recommendations: string[];
  createdAt?: Timestamp;
}

export interface AccessToken {
  id: string;
  token: string;
  examId: string;
  studentId?: string;
  studentName?: string;
  isUsed: boolean;
  createdAt?: Timestamp;
  usedAt?: Timestamp;
}

export interface ExamStats {
  average: number;
  maxScore: number;
  minScore: number;
  count: number;
}

export interface DashboardStats {
  totalExams: number;
  examsThisMonth: number;
  totalSubmissions: number;
  averageScore: number;
}

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

export interface FileContext {
  data: string;
  mimeType: string;
}
