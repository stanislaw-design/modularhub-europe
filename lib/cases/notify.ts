import { and, eq, gt, ne, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { channel, channelReadState, client, inquiry, message, users } from "@/lib/db/schema";
import { sendNotificationEmail } from "@/lib/notifications/send";
import { captureError } from "@/lib/observability";
import type { Clock } from "./clock";
import { shouldEmailForMessage } from "./email-policy";

// Powiadomienia e mail sprawy doradczej (spec 0048 AC-5, AC-10). E mail niesie
// wyłącznie link i powód, nigdy treść wiadomości. Wszystko best effort: błąd
// wysyłki nie cofa zapisanej sprawy ani wiadomości.

const GUEST_EMAIL_WINDOW_MS = 10 * 60 * 1000;

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Strona z jednym przyciskiem "załóż konto" dla sprawy gościa (spec 0066 AC-7).
export function claimLink(locale: string, inquiryId: string): string {
  return `${baseUrl()}/${locale}/inquiry/claim/${inquiryId}`;
}

export function caseLink(role: "client" | "advisor", locale: string, inquiryId: string): string {
  const path = role === "client" ? `panel/inquiries/${inquiryId}` : `internal/cases/${inquiryId}`;
  return `${baseUrl()}/${locale}/${path}`;
}

// Cienki wrapper nad wspólnym senderem (spec 0051 AC-7, refaktor): treść i
// odbiorcy się nie zmieniają, ale wysyłka teraz też rejestruje
// notification_email_sent/notification_email_failed, czego wcześniej nie
// robiła. Surowe wywołanie Resend żyje wyłącznie w lib/notifications/send.ts.
export async function sendCaseEmail(input: {
  to: string;
  subject: string;
  text: string;
  emailType: "case_new_case_alert" | "case_new_message";
  inquiryId: string;
  distinctId: string;
}): Promise<boolean> {
  return sendNotificationEmail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    emailType: input.emailType,
    entityId: input.inquiryId,
    distinctId: input.distinctId,
  });
}

// Alarm o nowej sprawie: od razu, bez okna czasowego (zdarzenie kluczowe).
export async function notifyAdvisorOfNewCase(inquiryId: string): Promise<void> {
  const to = process.env.ADVISOR_NOTIFY_EMAIL;
  if (!to) return;
  try {
    const t = await getTranslations({ locale: "pl", namespace: "CaseEmail" });
    await sendCaseEmail({
      to,
      subject: t("newCaseSubject"),
      text: `${t("newCaseBody")}\n\n${caseLink("advisor", "pl", inquiryId)}`,
      emailType: "case_new_case_alert",
      inquiryId,
      distinctId: inquiryId,
    });
  } catch (error) {
    captureError(error, { path: "cases:notifyAdvisorOfNewCase" });
  }
}

interface Recipient {
  userId: string | null;
  email: string;
  role: "client" | "advisor" | "guest";
  locale: string;
}

async function resolveRecipient(
  inquiryId: string,
  authorKind: "client" | "advisor" | "producer",
  messageLocale: string,
): Promise<Recipient | null> {
  const [row] = await db
    .select({
      email: inquiry.email,
      guestLocale: inquiry.locale,
      clientId: inquiry.clientId,
      clientUserId: client.userId,
      assignedAdvisorId: inquiry.assignedAdvisorId,
    })
    .from(inquiry)
    .leftJoin(client, eq(client.id, inquiry.clientId))
    .where(eq(inquiry.id, inquiryId));
  if (!row) return null;

  if (authorKind === "advisor" && !row.clientId) {
    // Sprawa gościa (spec 0066 AC-12): mail na e mail z migawki, w języku
    // zapisanym w sprawie, bo gość nie ma konta ani czatu.
    return { userId: null, email: row.email, role: "guest", locale: row.guestLocale ?? messageLocale };
  }

  if (authorKind === "advisor") {
    return { userId: row.clientUserId, email: row.email, role: "client", locale: messageLocale };
  }

  if (row.assignedAdvisorId) {
    const [advisor] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, row.assignedAdvisorId));
    if (advisor?.email) return { userId: advisor.id, email: advisor.email, role: "advisor", locale: "pl" };
  }

  const fallback = process.env.ADVISOR_NOTIFY_EMAIL;
  if (!fallback) return null;
  const [advisor] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, fallback), eq(users.role, "admin")));
  return { userId: advisor?.id ?? null, email: fallback, role: "advisor", locale: "pl" };
}

// Mail do gościa po odpowiedzi doradcy (AC-12): tylko link do założenia konta,
// najwyżej raz na 10 minut na sprawę. Limit liczymy z samych wiadomości doradcy
// w kanale (bez osobnej kolumny): nowa wiadomość już jest zapisana, więc
// wcześniejsza w oknie oznacza, że mail już poszedł.
async function notifyGuestOfAdvisorReply(
  inquiryId: string,
  channelId: string,
  recipient: Recipient,
  clock: Clock,
): Promise<void> {
  const windowStart = new Date(clock.now().getTime() - GUEST_EMAIL_WINDOW_MS);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(message)
    .innerJoin(channel, eq(channel.id, message.channelId))
    .where(
      and(
        eq(message.channelId, channelId),
        eq(channel.inquiryId, inquiryId),
        eq(message.authorKind, "advisor"),
        ne(message.type, "system_notice"),
        gt(message.createdAt, windowStart),
      ),
    );
  if ((recent?.count ?? 0) > 1) return;

  const t = await getTranslations({ locale: recipient.locale, namespace: "CaseEmail" });
  await sendCaseEmail({
    to: recipient.email,
    subject: t("newMessageSubject"),
    text: `${t("newMessageBodyGuest")}

${claimLink(recipient.locale, inquiryId)}`,
    emailType: "case_new_message",
    inquiryId,
    distinctId: inquiryId,
  });
}

// E mail o zwykłej wiadomości: jeden na odbiorcę i kanał w oknie 10 minut,
// żaden dla odbiorcy aktywnego w kanale w ciągu 90 sekund (AC-10).
export async function notifyMessageRecipient(input: {
  inquiryId: string;
  channelId: string;
  authorKind: "client" | "advisor" | "producer";
  locale: string;
  clock: Clock;
}): Promise<void> {
  try {
    if (input.authorKind === "producer") return;
    const recipient = await resolveRecipient(input.inquiryId, input.authorKind, input.locale);
    if (!recipient) return;

    if (recipient.role === "guest") {
      await notifyGuestOfAdvisorReply(input.inquiryId, input.channelId, recipient, input.clock);
      return;
    }

    const now = input.clock.now();
    let lastEmailAt: Date | null = null;
    let lastSeenAt: Date | null = null;
    if (recipient.userId) {
      const [state] = await db
        .select({ lastEmailAt: channelReadState.lastEmailAt, lastSeenAt: channelReadState.lastSeenAt })
        .from(channelReadState)
        .where(and(eq(channelReadState.channelId, input.channelId), eq(channelReadState.userId, recipient.userId)));
      lastEmailAt = state?.lastEmailAt ?? null;
      lastSeenAt = state?.lastSeenAt ?? null;
    }

    if (!shouldEmailForMessage({ now, lastEmailAt, lastSeenAt })) return;

    const t = await getTranslations({ locale: recipient.locale, namespace: "CaseEmail" });
    const sent = await sendCaseEmail({
      to: recipient.email,
      subject: t("newMessageSubject"),
      text: `${t(recipient.role === "client" ? "newMessageBodyClient" : "newMessageBodyAdvisor")}\n\n${caseLink(recipient.role, recipient.locale, input.inquiryId)}`,
      emailType: "case_new_message",
      inquiryId: input.inquiryId,
      distinctId: recipient.userId ?? input.inquiryId,
    });

    if (sent && recipient.userId) {
      await db
        .insert(channelReadState)
        .values({ channelId: input.channelId, userId: recipient.userId, lastEmailAt: now })
        .onConflictDoUpdate({
          target: [channelReadState.channelId, channelReadState.userId],
          set: { lastEmailAt: now },
        });
    }
  } catch (error) {
    captureError(error, { path: "cases:notifyMessageRecipient" });
  }
}
