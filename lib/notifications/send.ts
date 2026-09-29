import { captureError, trackEvent } from "@/lib/observability";

// Jeden, niski poziom sender dla wszystkich pięciu szablonów e mail (spec
// 0051 AC-7) i, po refaktorze, dla dzisiejszych e maili sprawy doradczej
// (spec 0048, lib/cases/notify.ts). Zastępuje surowe wywołanie fetch, które
// wcześniej siedziało w notify.ts.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Jeden, wspólny fallback adresu nadawcy (AC-11): wcześniej auth.ts i
// notify.ts miały każdy swój własny domyślny adres.
export const DEFAULT_FROM_EMAIL = "ModularHub Europe <powiadomienia@modularhubeurope.pl>";

export type NotificationEmailType =
  | "login_link"
  | "new_inquiry_confirmation"
  | "new_offer"
  | "order_status_changed"
  | "payment_confirmed"
  | "case_new_case_alert"
  | "case_new_message";

export interface SendNotificationEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  emailType: NotificationEmailType;
  entityId: string;
  distinctId: string;
  // Wyłącznie dla e maila logowania (AC-10): jedyna droga dostarczenia
  // magic linku, więc błąd wysyłki rzuca dalej zamiast być połknięty.
  throwOnFailure?: boolean;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
}

// Brak RESEND_API_KEY jest cichym "nie wysyłaj" (jak dzisiaj), nie liczy się
// jako notification_email_failed: to zdarzenie jest tylko dla realnej próby
// wysyłki, która nie doszła (spec 0051 Key invariants).
export async function sendNotificationEmail(input: SendNotificationEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (input.throwOnFailure) throw new Error("RESEND_API_KEY is not configured");
    return false;
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        ...(input.html ? { html: input.html } : {}),
        ...(input.text ? { text: input.text } : {}),
      }),
    });
  } catch (networkError) {
    captureError(networkError, { path: "notifications:send" });
    trackEvent("notification_email_failed", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
    if (input.throwOnFailure) throw networkError;
    return false;
  }

  if (!response.ok) {
    const error = new Error(`Resend responded ${response.status}`);
    captureError(error, { path: "notifications:send" });
    trackEvent("notification_email_failed", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
    if (input.throwOnFailure) throw error;
    return false;
  }

  trackEvent("notification_email_sent", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
  return true;
}
