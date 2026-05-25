import type { ExamStats, Submission } from "@/types";

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

export function calculateDashboardStats(
  exams: { createdAt?: { toDate?: () => Date } }[],
  allSubmissions: Pick<Submission, "score">[]
): { totalExams: number; examsThisMonth: number; totalSubmissions: number; averageScore: number } {
  const now = new Date();
  const examsThisMonth = exams.filter((e) => {
    const date = e.createdAt?.toDate?.();
    return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const stats = calculateExamStats(allSubmissions);

  return {
    totalExams: exams.length,
    examsThisMonth,
    totalSubmissions: stats.count,
    averageScore: stats.average,
  };
}
