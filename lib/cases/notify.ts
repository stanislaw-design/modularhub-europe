import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { channelReadState, client, inquiry, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import type { Clock } from "./clock";
import { shouldEmailForMessage } from "./email-policy";

// Powiadomienia e mail sprawy doradczej (spec 0048 AC-5, AC-10). E mail niesie
// wyłącznie link i powód, nigdy treść wiadomości. Wszystko best effort: błąd
// wysyłki nie cofa zapisanej sprawy ani wiadomości.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "ModularHub Europe <powiadomienia@modularhub.eu>";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function caseLink(role: "client" | "advisor", locale: string, inquiryId: string): string {
  const path = role === "client" ? `panel/inquiries/${inquiryId}` : `internal/cases/${inquiryId}`;
  return `${baseUrl()}/${locale}/${path}`;
}

export async function sendCaseEmail(input: { to: string; subject: string; text: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      captureError(new Error(`Resend responded ${response.status}`), { path: "cases:sendCaseEmail" });
      return false;
    }
    return true;
  } catch (error) {
    captureError(error, { path: "cases:sendCaseEmail" });
    return false;
  }
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
    });
  } catch (error) {
    captureError(error, { path: "cases:notifyAdvisorOfNewCase" });
  }
}

interface Recipient {
  userId: string | null;
  email: string;
  role: "client" | "advisor";
  locale: string;
}

async function resolveRecipient(
  inquiryId: string,
  authorKind: "client" | "advisor" | "producer",
  messageLocale: string,
): Promise<Recipient | null> {
  const [row] = await db
    .select({ email: inquiry.email, clientUserId: client.userId, assignedAdvisorId: inquiry.assignedAdvisorId })
    .from(inquiry)
    .innerJoin(client, eq(client.id, inquiry.clientId))
    .where(eq(inquiry.id, inquiryId));
  if (!row) return null;

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
