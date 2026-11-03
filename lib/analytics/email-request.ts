// Spec 0079 etap 3: drobne pomocniki tras pikselki i kliknięcia.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// Pierwszy adres z x-forwarded-for (Vercel). Służy wyłącznie do rozpoznania automatu w chwili
// żądania, nigdzie go nie zapisujemy (AC-15).
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip");
}
