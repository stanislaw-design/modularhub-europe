// Spec 0077 część D: wspólne reguły zaproszenia administratora, bez importów next-auth ani bazy,
// żeby auth.ts, akcje i testy jednostkowe czytały te same liczby.

export const ADMIN_INVITE_TTL_DAYS = 7;
export const ADMIN_INVITE_MAX_OPEN = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

// Logowanie (Auth.js) porównuje adres małymi literami, więc "Jan@X.pl" zapisany bez normalizacji
// nigdy nie utworzyłby konta (AC-35).
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function adminInviteExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ADMIN_INVITE_TTL_DAYS * DAY_MS);
}

export function isAdminInviteExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= adminInviteExpiresAt(createdAt).getTime();
}
