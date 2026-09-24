/** Ölçek girişi: işaretlenmeyen madde 0 sayılmaz, cinsiyet ve yaş uydurulmaz. */

export type ScaleAnswer = number | null;

export function emptyAnswers(count: number): ScaleAnswer[] {
  return Array.from({ length: count }, () => null);
}

export function asCompleteAnswers(answers: ScaleAnswer[]): number[] | null {
  if (answers.length === 0 || answers.some((answer) => answer === null || !Number.isInteger(answer))) return null;
  return answers as number[];
}

export function parseOptionalAge(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const age = Number(trimmed);
  if (!Number.isInteger(age) || age < 0 || age > 120) return null;
  return age;
}
