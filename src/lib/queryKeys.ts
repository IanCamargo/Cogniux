export const queryKeys = {
  auth: ["auth"] as const,
  exams: (professorId: string) => ["exams", professorId] as const,
  exam: (examId: string) => ["exam", examId] as const,
  examSubmissions: (examId: string) => ["exam", examId, "submissions"] as const,
  examStudents: (examId: string) => ["exam", examId, "students"] as const,
  examTokens: (examId: string) => ["exam", examId, "tokens"] as const,
  examPlan: (examId: string) => ["exam", examId, "plan"] as const,
  submissionScores: (examIds: string[]) => ["submissionScores", examIds.join(",")] as const,
  onlineSession: (examId: string, token?: string) =>
    ["onlineSession", examId, token ?? "open"] as const,
};
