import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Timestamp } from "firebase/firestore";
import type { ExamStats, Submission } from "@/types";

export function formatExamCreatedAt(createdAt?: Timestamp): string | null {
  const date = createdAt?.toDate?.();
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

export function calculateExamStats(submissions: Pick<Submission, "score">[]): ExamStats {
  if (submissions.length === 0) {
    return { average: 0, maxScore: 0, minScore: 0, count: 0 };
  }
  const scores = submissions.map((s) => s.score);
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return {
    average: sum / scores.length,
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
    count: scores.length,
  };
}

export function buildSubmissionStatsByExam(
  examIds: string[],
  byExamId: Record<string, Pick<Submission, "score">[]>
): Record<string, ExamStats> {
  return Object.fromEntries(examIds.map((id) => [id, calculateExamStats(byExamId[id] ?? [])]));
}

export function calculateDashboardStats(
  exams: { createdAt?: { toDate?: () => Date }; isOnline?: boolean }[],
  allSubmissions: Pick<Submission, "score">[]
): {
  totalExams: number;
  examsThisMonth: number;
  onlineExams: number;
  totalSubmissions: number;
  averageScore: number;
} {
  const now = new Date();
  const examsThisMonth = exams.filter((e) => {
    const date = e.createdAt?.toDate?.();
    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const stats = calculateExamStats(allSubmissions);

  const onlineExams = exams.filter((e) => e.isOnline).length;

  return {
    totalExams: exams.length,
    examsThisMonth,
    onlineExams,
    totalSubmissions: stats.count,
    averageScore: stats.average,
  };
}
