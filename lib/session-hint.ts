// Spec 0078 AC-5: ciasteczko wskazówka `has_session` mówi tylko, CO narysować w
// nagłówku strony publicznej (przycisk konta zamiast "Zaloguj"), żeby szkielet
// strony mógł być statyczny i nie czytać sesji. Nie niesie danych i nie jest
// dowodem tożsamości: dostęp do paneli i danych zawsze weryfikuje serwer sesją.
export const SESSION_HINT_COOKIE = "has_session";

// Tyle samo co domyślny czas życia sesji Auth.js (30 dni, strategia `database`).
export const SESSION_HINT_MAX_AGE = 60 * 60 * 24 * 30;

// Atrybut ustawiany na <html> przez skrypt w <head> (components/SessionHintScript.tsx),
// żeby CSS mógł pokazać szkielet przycisku konta od pierwszego malowania.
export const SESSION_HINT_ATTRIBUTE = "data-has-session";

function secureFlag(secure: boolean): string {
  return secure ? "; Secure" : "";
}

/** Wartość nagłówka `Set-Cookie`, która ustawia wskazówkę (bez HttpOnly, czytelna dla JS). */
export function sessionHintSetCookie(secure: boolean): string {
  return `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${SESSION_HINT_MAX_AGE}; SameSite=Lax${secureFlag(secure)}`;
}

/** Wartość nagłówka `Set-Cookie`, która kasuje wskazówkę. */
export function sessionHintClearCookie(secure: boolean): string {
  return `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag(secure)}`;
}

/** Tylko w przeglądarce. */
export function hasSessionHint(): boolean {
  return document.cookie.split("; ").some((part) => part === `${SESSION_HINT_COOKIE}=1`);
}

/** Tylko w przeglądarce. */
export function setSessionHint(): void {
  document.cookie = sessionHintSetCookie(window.location.protocol === "https:");
  document.documentElement.setAttribute(SESSION_HINT_ATTRIBUTE, "");
}

/** Tylko w przeglądarce. */
export function clearSessionHint(): void {
  document.cookie = sessionHintClearCookie(window.location.protocol === "https:");
  document.documentElement.removeAttribute(SESSION_HINT_ATTRIBUTE);
}

/** True, gdy odpowiedź Auth.js właśnie ustawia niepustą sesję (ciasteczko `*session-token`). */
export function setsSessionToken(setCookieHeaders: readonly string[]): boolean {
  return setCookieHeaders.some((header) => {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    if (separator === -1) return false;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    return name.endsWith("session-token") && value.length > 0 && !/max-age=0/i.test(header);
  });
}
