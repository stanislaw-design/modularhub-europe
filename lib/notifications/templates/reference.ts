// Krótki, czytelny numer referencyjny do stopki maila (idea 5, design
// feedback po spec 0051): pierwsze 8 znaków id encji bez myślników, wielkimi
// literami — czytelniejsze niż pełny UUID, nadal wystarczające żeby support
// odnalazł właściwy wiersz po zgłoszeniu klienta.
export function shortReference(entityId: string): string {
  return entityId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
