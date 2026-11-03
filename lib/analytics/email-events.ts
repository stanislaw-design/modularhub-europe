import { and, countDistinct, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailEvent, emailMessage } from "@/lib/db/schema";
import { hasActiveEmailTrackingConsent } from "./user-consent";

// Spec 0079 etap 3 (AC-20, AC-22): zapis otwarć i kliknięć z maili w wariancie śledzonym oraz
// reguła `likely_automatic`. Bez adresu e mail i bez adresu IP w bazie: IP służy tylko do
// rozpoznania automatu w chwili żądania i nie jest zapisywane (AC-15).

export type EmailEventKind = "opened" | "clicked";

// "Kilka sekund" z AC-22: tyle po wysyłce otwarcie jest automatem, i w takim oknie kilka różnych
// linków jednego maila oznacza skaner.
const AUTOMATIC_OPEN_AFTER_SEND_MS = 5_000;
const MULTI_LINK_WINDOW_MS = 5_000;

// Lista w kodzie, do przeglądu co jakiś czas. Zakresy to przybliżenie: Apple (Mail Privacy
// Protection i Private Relay, 17.0.0.0/8), Microsoft (Exchange Online Protection, Defender for
// Office 365), Proofpoint. Proxy obrazków Gmaila (GoogleImageProxy) celowo NIE jest na liście:
// pobiera obrazek dopiero przy otwarciu, więc liczy się jako człowiek.
const AUTOMATIC_IP_RANGES = [
  "17.0.0.0/8",
  "40.92.0.0/15",
  "40.107.0.0/16",
  "52.100.0.0/14",
  "104.47.0.0/17",
  "67.231.144.0/20",
  "67.231.152.0/21",
  "148.163.128.0/19",
] as const;

const AUTOMATIC_USER_AGENT = /(proofpoint|ppops|safelinks|microsoft office|ms-office|office365|exchange online|mailprivacyprotection|apple mail privacy)/i;
const GMAIL_IMAGE_PROXY = /googleimageproxy/i;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

export function isAutomaticIp(ip: string | null): boolean {
  if (!ip) return false;
  const value = ipv4ToInt(ip.trim());
  if (value === null) return false;
  return AUTOMATIC_IP_RANGES.some((range) => {
    const [base, bits] = range.split("/");
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) return false;
    const size = 2 ** (32 - Number(bits));
    return value >= baseValue && value < baseValue + size;
  });
}

export interface AutomaticSignals {
  method: string;
  userAgent: string | null;
  ip: string | null;
  kind: EmailEventKind;
  sentAt: Date;
  now: Date;
  // Czy w ostatnich sekundach kliknięto inny link tego samego maila.
  otherLinkClickedRecently: boolean;
}

// AC-22. Kolejność ma znaczenie: HEAD to zawsze automat, proxy Gmaila zawsze człowiek (poza HEAD).
export function isLikelyAutomatic(signals: AutomaticSignals): boolean {
  if (signals.method.toUpperCase() === "HEAD") return true;
  if (signals.userAgent && GMAIL_IMAGE_PROXY.test(signals.userAgent)) return false;
  if (signals.userAgent && AUTOMATIC_USER_AGENT.test(signals.userAgent)) return true;
  if (isAutomaticIp(signals.ip)) return true;
  if (signals.kind === "opened" && signals.now.getTime() - signals.sentAt.getTime() < AUTOMATIC_OPEN_AFTER_SEND_MS) return true;
  if (signals.kind === "clicked" && signals.otherLinkClickedRecently) return true;
  return false;
}

export interface EmailEventRequest {
  messageId: string;
  kind: EmailEventKind;
  targetUrl?: string;
  method: string;
  userAgent: string | null;
  ip: string | null;
}

// Zapisuje zdarzenie, o ile mail był w wariancie śledzonym, a odbiorca nadal ma aktywną zgodę
// (AC-20). Zwraca true, gdy wiersz powstał. Nieznane id, mail nieśledzony i wycofana zgoda to
// ciche pominięcie, nigdy błąd.
export async function recordEmailEvent(request: EmailEventRequest): Promise<boolean> {
  const [message] = await db
    .select({ tracked: emailMessage.tracked, sentAt: emailMessage.sentAt, recipientUserId: emailMessage.recipientUserId })
    .from(emailMessage)
    .where(eq(emailMessage.id, request.messageId));
  if (!message || !message.tracked || !message.recipientUserId) return false;
  if (!(await hasActiveEmailTrackingConsent(message.recipientUserId))) return false;

  const now = new Date();
  let otherLinkClickedRecently = false;
  if (request.kind === "clicked") {
    const [recent] = await db
      .select({ others: countDistinct(emailEvent.targetUrl) })
      .from(emailEvent)
      .where(
        and(
          eq(emailEvent.messageId, request.messageId),
          eq(emailEvent.kind, "clicked"),
          gt(emailEvent.occurredAt, new Date(now.getTime() - MULTI_LINK_WINDOW_MS)),
          request.targetUrl ? ne(emailEvent.targetUrl, request.targetUrl) : undefined,
        ),
      );
    otherLinkClickedRecently = (recent?.others ?? 0) > 0;
  }

  const automatic = isLikelyAutomatic({
    method: request.method,
    userAgent: request.userAgent,
    ip: request.ip,
    kind: request.kind,
    sentAt: message.sentAt,
    now,
    otherLinkClickedRecently,
  });

  await insertEventAndBumpCounters({ ...request, automatic, flipRecentClicks: request.kind === "clicked" && otherLinkClickedRecently });
  return true;
}

interface InsertArgs extends EmailEventRequest {
  automatic: boolean;
  // Skaner kliknął kilka linków: wcześniejsze kliknięcia z okna też były automatem, więc
  // oznaczamy je i cofamy ich wkład do licznika.
  flipRecentClicks: boolean;
}

// Jedno zapytanie z CTE (Neon HTTP nie ma interaktywnych transakcji): insert zdarzenia, opcjonalne
// oznaczenie wcześniejszych kliknięć skanera, potem podbicie liczników w email_message.
// Automaty nie podbijają open_count ani click_count.
async function insertEventAndBumpCounters(args: InsertArgs): Promise<void> {
  const windowSeconds = MULTI_LINK_WINDOW_MS / 1000;
  const isClick = args.kind === "clicked";
  const counter = isClick ? sql.raw("click_count") : sql.raw("open_count");
  const firstAt = isClick ? sql.raw("first_clicked_at") : sql.raw("first_opened_at");
  await db.execute(sql`
    WITH flipped AS (
      UPDATE email_event SET likely_automatic = true
      WHERE ${args.flipRecentClicks} AND message_id = ${args.messageId}::uuid AND kind = 'clicked'
        AND NOT likely_automatic AND occurred_at > now() - make_interval(secs => ${windowSeconds})
      RETURNING id
    ),
    ins AS (
      INSERT INTO email_event (message_id, kind, target_url, likely_automatic)
      VALUES (${args.messageId}::uuid, ${args.kind}::email_event_kind, ${args.targetUrl ?? null}, ${args.automatic})
      RETURNING likely_automatic
    ),
    delta AS (
      SELECT (SELECT count(*) FROM ins WHERE NOT likely_automatic) AS added,
             (SELECT count(*) FROM flipped) AS removed
    )
    UPDATE email_message AS m SET
      ${counter} = greatest(0, m.${counter} + delta.added - delta.removed),
      ${firstAt} = CASE
        WHEN greatest(0, m.${counter} + delta.added - delta.removed) = 0 THEN NULL
        ELSE coalesce(m.${firstAt}, CASE WHEN delta.added > 0 THEN now() END)
      END
    FROM delta
    WHERE m.id = ${args.messageId}::uuid
  `);
}

// AC-23: retencja surowych zdarzeń. Sumy i znaczniki first_* w email_message zostają.
export const EMAIL_EVENT_RETENTION_MONTHS = 13;

export async function deleteExpiredEmailEvents(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - EMAIL_EVENT_RETENTION_MONTHS);
  const deleted = await db.delete(emailEvent).where(lt(emailEvent.occurredAt, cutoff)).returning({ id: emailEvent.id });
  return deleted.length;
}
