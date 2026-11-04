import { CRM_TIME_ZONE } from "./constants";

// Vercel działa w UTC, a spec 0080 wymaga strefy Europe/Warsaw dla dat zdarzeń, terminów i "dziś".
// Czysta arytmetyka na datach i Intl, bez zależności od strefy procesu.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;

const warsawParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(instant: Date): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const map: Record<string, number> = {};
  for (const part of warsawParts.formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  return { y: map.year, mo: map.month, d: map.day, h: map.hour, mi: map.minute, s: map.second };
}

/** Dzień kalendarzowy w Europe/Warsaw jako `YYYY-MM-DD`. */
export function warsawDateString(instant: Date): string {
  const p = partsOf(instant);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Dodaje dni do zwykłej daty (arytmetyka na datach, nie dodawanie 24 godzin do chwili). */
export function addDaysToDate(date: string, days: number): string {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return shifted.toISOString().slice(0, 10);
}

export function isValidDateString(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const check = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return check.toISOString().slice(0, 10) === value;
}

/**
 * Data i godzina z formularza (`YYYY-MM-DDTHH:mm`, czas ścienny w Europe/Warsaw) na chwilę UTC.
 * Zwraca null dla błędnego zapisu. Godziny nieistniejące (przejście na czas letni) przesuwają się
 * do przodu, dwuznaczne (przejście na zimowy) dostają wcześniejszą z dwóch chwil.
 */
export function warsawLocalToDate(local: string): Date | null {
  const match = LOCAL_DATETIME_RE.exec(local);
  if (!match) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(wallAsUtc).getUTCMonth() !== mo - 1) return null;
  const offsetAt = (instantMs: number): number => {
    const p = partsOf(new Date(instantMs));
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(instantMs / 1000) * 1000;
  };
  // Dwa przejścia wystarczają, bo offset zmienia się najwyżej raz w pobliżu danej chwili.
  let guess = wallAsUtc - offsetAt(wallAsUtc);
  guess = wallAsUtc - offsetAt(guess);
  return new Date(guess);
}

/** Chwila UTC na wartość pola `datetime-local` w Europe/Warsaw (`YYYY-MM-DDTHH:mm`). */
export function dateToWarsawLocal(instant: Date): string {
  const p = partsOf(instant);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}
