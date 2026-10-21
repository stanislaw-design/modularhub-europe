const DAY_MS = 86_400_000;

// Pełne dni od daty do teraz (wiek zapytania na pulpicie i liście zapytań producenta).
// Osobna funkcja, bo strony serwerowe nie wołają `Date.now` w samym renderze (reguła react-hooks/purity).
export function ageInDays(since: Date): number {
  return Math.max(0, Math.floor((Date.now() - since.getTime()) / DAY_MS));
}
