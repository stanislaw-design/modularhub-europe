// Odstępy pollingu wiadomości (spec 0048 AC-6): 5 s w aktywnej karcie, 30 s w
// karcie w tle, przy błędach odczekanie rosnące, z sufitem.
export const POLL_ACTIVE_MS = 5_000;
export const POLL_BACKGROUND_MS = 30_000;
export const POLL_MAX_BACKOFF_MS = 60_000;

export function nextPollDelay({ visible, failures }: { visible: boolean; failures: number }): number {
  const base = visible ? POLL_ACTIVE_MS : POLL_BACKGROUND_MS;
  if (failures <= 0) return base;
  return Math.min(base * 2 ** failures, POLL_MAX_BACKOFF_MS);
}

// Kursor to (created_at, id) z mikrosekundową precyzją zwróconą przez bazę.
export function encodeCursor(createdAtIso: string, id: string): string {
  return `${createdAtIso}|${id}`;
}

const CURSOR_PATTERN = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\|([0-9a-f-]{36})$/i;

export function parseCursor(raw: string | null): { createdAt: string; id: string } | null {
  if (!raw) return null;
  const match = CURSOR_PATTERN.exec(raw);
  return match ? { createdAt: match[1], id: match[2] } : null;
}
