// Reguły e maila przy zwykłych wiadomościach (spec 0048 AC-10): najwyżej jeden
// e mail na odbiorcę i kanał w oknie 10 minut i żaden, jeśli odbiorca był
// aktywny w kanale w ciągu ostatnich 90 sekund. Czysta decyzja na danych z
// channel_read_state, bez dostępu do bazy.
export const MESSAGE_EMAIL_WINDOW_MS = 10 * 60 * 1000;
export const RECIPIENT_ACTIVE_WINDOW_MS = 90 * 1000;

export interface MessageEmailState {
  now: Date;
  lastEmailAt: Date | null;
  lastSeenAt: Date | null;
}

export function shouldEmailForMessage({ now, lastEmailAt, lastSeenAt }: MessageEmailState): boolean {
  if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < RECIPIENT_ACTIVE_WINDOW_MS) return false;
  if (lastEmailAt && now.getTime() - lastEmailAt.getTime() < MESSAGE_EMAIL_WINDOW_MS) return false;
  return true;
}
