export function calculateScore(answers: string[], answerKey: string[]): number {
  if (answerKey.length === 0) return 0;
  let correct = 0;
  answers.forEach((ans, idx) => {
    if (ans === answerKey[idx]) correct++;
  });
  return (correct / answerKey.length) * 10;
}

export function getScoreColorClass(score: number): string {
  if (score >= 7.5) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 6) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export function getAlternatives(count: number): string[] {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, count);
}
