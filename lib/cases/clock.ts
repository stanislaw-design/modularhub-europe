// Wstrzykiwany zegar (spec 0048 AC-6): interwały i okna czasowe czytają czas
// stąd, nie z Date.now(), żeby dało się je testować bez czekania.
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

// JS Date ma precyzję milisekundy, więc kolejnych wierszy jednego db.batch nie
// da się rozróżnić samym Date (AC-38, kolejność zapisu kart startowych).
// Zwraca literał znacznika czasu z jawną częścią mikrosekundową (6 cyfr po
// kropce), o co najmniej jedną mikrosekundę większy dla kolejnych offsetów w
// tej samej milisekundzie co base; string trafia do kolumny timestamptz przez
// sql`` (patrz lib/cases/create.ts), Postgres parsuje precyzję sam.
export function microOffsetTimestamp(base: Date, offsetMicroseconds: number): string {
  const iso = base.toISOString(); // "2026-09-23T12:00:00.000Z"
  const millis = iso.slice(0, -1).split(".")[1] ?? "000";
  const micros = String(offsetMicroseconds).padStart(3, "0");
  return `${iso.slice(0, 10)}T${iso.slice(11, 19)}.${millis}${micros}Z`;
}
