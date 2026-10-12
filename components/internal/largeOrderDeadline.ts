const DAY_MS = 86_400_000;

// Termin ofert jako czas, który został: zespół widzi pilność bez liczenia dat.
// Dla zapytań już połączonych lub zamkniętych termin nie ma znaczenia.
export function describeDeadline(deadlineAt: Date, status: string, now: number): { text: string; urgent: boolean } | null {
  if (status === "accepted" || status === "closed") return null;
  const days = Math.ceil((deadlineAt.getTime() - now) / DAY_MS);
  if (days < 0) return { text: "po terminie", urgent: true };
  if (days === 0) return { text: "dziś", urgent: true };
  if (days === 1) return { text: "jutro", urgent: true };
  return { text: `za ${days} dni`, urgent: days <= 3 };
}
