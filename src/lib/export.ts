import type { Exam, Submission } from "@/types";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function submissionsToCsv(submissions: Submission[], exam: Pick<Exam, "subject" | "numQuestions">): string {
  const header = ["Aluno", "Nota", ...Array.from({ length: exam.numQuestions }, (_, i) => `Q${i + 1}`)];
  const rows = submissions.map((sub) => {
    const answers = sub.answers.slice(0, exam.numQuestions);
    while (answers.length < exam.numQuestions) answers.push("");
    return [
      escapeCsvField(sub.studentName),
      sub.score.toFixed(1),
      ...answers.map((a) => escapeCsvField(a)),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  return `\uFEFF${csv}`;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
