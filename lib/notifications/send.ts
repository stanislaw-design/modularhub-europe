import { randomUUID } from "node:crypto";
import { captureError, trackEvent } from "@/lib/observability";
import { getSiteUrl } from "@/lib/site-url";
import { addUtmToEmailBodies, hostOf, isTrackedEmailType } from "./email-tracking";
import { appendTrackingPixel, rewriteLinksForClickTracking } from "./email-tracking-links";

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
  | "case_new_message"
  | "large_order_team_new_request"
  | "large_order_team_client_cancelled"
  | "large_order_client_request_on_behalf"
  | "large_order_client_request_received"
  | "large_order_producer_request_closed"
  | "large_order_producer_not_selected"
  | "large_order_client_connected"
  | "large_order_producer_connected"
  | "large_order_team_connected"
  | "large_order_team_pending_selection"
  | "large_order_producer_new_request"
  | "large_order_producer_new_platform_project"
  | "large_order_producer_platform_selection_done"
  | "large_order_team_new_quote"
  | "large_order_client_summary_published"
  | "large_order_producer_reminder"
  | "large_order_team_deadline"
  | "crm_daily_digest"
  | "commercial_display_team_new_inquiry";

export interface SendNotificationEmailInput {
  // Jeden adres albo lista (wspólny mail dzienny do wszystkich administratorów, spec 0080 AC-19).
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  emailType: NotificationEmailType;
  entityId: string;
  distinctId: string;
  // Wyłącznie dla e maila logowania (AC-10): jedyna droga dostarczenia
  // magic linku, więc błąd wysyłki rzuca dalej zamiast być połknięty.
  throwOnFailure?: boolean;
  // Spec 0066 AC-10: adres, na który trafia odpowiedź (mail "czy to Ty").
  replyTo?: string;
  // Spec 0079 AC-13: dziennik maila do producenta. Działa tylko dla typów z TRACKED_EMAIL_TYPES;
  // bez tego pola funkcja zachowuje się dokładnie jak przed specem 0079.
  tracking?: { producerId: string; recipientUserId: string | null };
}

interface EmailTrackingState {
  messageId: string | null;
  html?: string;
  text?: string;
}

// Spec 0079 AC-13, AC-16, AC-20: przygotowanie wariantu z dziennikiem. Każdy krok pada osobno i
// nigdy nie blokuje wysyłki: błąd zapisu wiersza oznacza mail bez tagu (wariant nieśledzony), błąd
// sprawdzenia zgody albo przepisania linków oznacza wariant nieśledzony (treść jak dla odbiorcy bez
// zgody: UTM, tag, bez pikselki). Błąd idzie do Sentry. Wariant śledzony (pikselka i linki przez
// nasze przekierowanie) dostaje wyłącznie odbiorca z aktywną zgodą, sprawdzaną per użytkownik.
async function prepareTracking(input: SendNotificationEmailInput): Promise<EmailTrackingState> {
  const state: EmailTrackingState = { messageId: null, html: input.html, text: input.text };
  const tracking = input.tracking;
  if (!tracking || !isTrackedEmailType(input.emailType)) return state;

  const hosts = new Set([hostOf(getSiteUrl()), hostOf(process.env.AUTH_URL)].filter((host): host is string => host !== null));
  try {
    const bodies = addUtmToEmailBodies({ html: input.html, text: input.text }, input.emailType, hosts);
    state.html = bodies.html;
    state.text = bodies.text;
  } catch (error) {
    captureError(error, { path: "notifications:send:utm" });
  }

  const messageId = randomUUID();
  const untrackedHtml = state.html;
  let tracked = false;
  if (tracking.recipientUserId && state.html) {
    try {
      const { hasActiveEmailTrackingConsent } = await import("@/lib/analytics/user-consent");
      tracked = (await hasActiveEmailTrackingConsent(tracking.recipientUserId)) === true;
    } catch (error) {
      captureError(error, { path: "notifications:send:consent-check" });
    }
  }
  if (tracked && state.html) {
    try {
      state.html = appendTrackingPixel(rewriteLinksForClickTracking(state.html, messageId, hosts), messageId);
    } catch (error) {
      captureError(error, { path: "notifications:send:rewrite-links" });
      state.html = untrackedHtml;
      tracked = false;
    }
  }

  try {
    const { insertEmailMessage } = await import("@/lib/analytics/email-message");
    await insertEmailMessage({
      id: messageId,
      emailType: input.emailType,
      entityId: input.entityId,
      producerId: tracking.producerId,
      recipientUserId: tracking.recipientUserId,
      tracked,
    });
    state.messageId = messageId;
  } catch (error) {
    captureError(error, { path: "notifications:send:log-insert" });
    // Bez wiersza w dzienniku linki i pikselka z tym id nic by nie zapisały: wracamy do treści z UTM.
    state.html = untrackedHtml;
  }
  return state;
}

// Po porażce wysyłki wiersz znika (dziennik liczy tylko maile, które wyszły). Awaria usunięcia
// zostawia osierocony wiersz bez resend_email_id, co jest tylko raportowane.
async function discardMessage(messageId: string | null): Promise<void> {
  if (!messageId) return;
  try {
    const { deleteEmailMessage } = await import("@/lib/analytics/email-message");
    await deleteEmailMessage(messageId);
  } catch (error) {
    captureError(error, { path: "notifications:send:log-delete" });
  }
}

async function recordResendId(messageId: string | null, response: Response): Promise<void> {
  if (!messageId) return;
  try {
    const payload = (await response.json()) as { id?: unknown };
    if (typeof payload.id !== "string") return;
    const { setEmailMessageResendId } = await import("@/lib/analytics/email-message");
    await setEmailMessageResendId(messageId, payload.id);
  } catch (error) {
    captureError(error, { path: "notifications:send:log-resend-id" });
  }
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

  const prepared = await prepareTracking(input);

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(prepared.html ? { html: prepared.html } : {}),
        ...(prepared.text ? { text: prepared.text } : {}),
        ...(prepared.messageId ? { tags: [{ name: "message_id", value: prepared.messageId }] } : {}),
      }),
    });
  } catch (networkError) {
    captureError(networkError, { path: "notifications:send" });
    await discardMessage(prepared.messageId);
    trackEvent("notification_email_failed", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
    if (input.throwOnFailure) throw networkError;
    return false;
  }

  if (!response.ok) {
    const error = new Error(`Resend responded ${response.status}`);
    captureError(error, { path: "notifications:send" });
    await discardMessage(prepared.messageId);
    trackEvent("notification_email_failed", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
    if (input.throwOnFailure) throw error;
    return false;
  }

  await recordResendId(prepared.messageId, response);
  trackEvent("notification_email_sent", { emailType: input.emailType, entityId: input.entityId }, input.distinctId);
  return true;
}
