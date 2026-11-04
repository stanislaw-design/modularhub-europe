import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { sendNotificationEmail } from "./send";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// Dzienny mail z notatnika rozmów (spec 0080 AC-19): jeden wspólny mail do wszystkich aktywnych
// administratorów, zadania zaległe i na dziś pogrupowane według osoby odpowiedzialnej.
// Zwraca, czy mail wyszedł, a błąd wysyłki zgłasza sam sender (captureError w send.ts); cron
// na tej podstawie zwalnia zajęty dzień (wzór claimNotification, spec 0070).

export interface DigestTaskLine {
  title: string;
  partnerName: string;
  /** Data zadania, RRRR-MM-DD. */
  dueDate: string;
  /** Zadanie zewnętrzne: czekamy na stronę zewnętrzną. */
  external: boolean;
}

export interface DigestOwnerGroup {
  ownerLabel: string;
  overdue: DigestTaskLine[];
  dueToday: DigestTaskLine[];
}

export interface ConversationsDigestInput {
  to: string[];
  groups: DigestOwnerGroup[];
  noDueDateCount: number;
  /** Dzień wysyłki (Europe/Warsaw), użyty jako identyfikator wpisu w statystykach. */
  digestDate: string;
}

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** RRRR-MM-DD do DD.MM.RRRR. */
export function formatDigestDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function countDigestTasks(groups: DigestOwnerGroup[]): number {
  return groups.reduce((sum, group) => sum + group.overdue.length + group.dueToday.length, 0);
}

type DigestLabels = { overdue: string; today: string; waitingThem: string; dueOn: string };

function taskLine(task: DigestTaskLine, labels: DigestLabels, withDate: boolean): string {
  const parts = [task.partnerName];
  if (withDate) parts.push(`${labels.dueOn} ${formatDigestDate(task.dueDate)}`);
  if (task.external) parts.push(labels.waitingThem);
  return `• ${task.title} (${parts.join(", ")})`;
}

export function buildDigestBody(
  groups: DigestOwnerGroup[],
  noDueDateCount: number,
  intro: string,
  noDueDateLine: string,
  labels: DigestLabels,
): string {
  const sections = groups.map((group) => {
    const lines = [group.ownerLabel];
    if (group.overdue.length) {
      lines.push(`${labels.overdue}:`, ...group.overdue.map((task) => taskLine(task, labels, true)));
    }
    if (group.dueToday.length) {
      lines.push(`${labels.today}:`, ...group.dueToday.map((task) => taskLine(task, labels, false)));
    }
    return lines.join("\n");
  });
  return [intro, ...sections, noDueDateCount > 0 ? noDueDateLine : undefined].filter((part) => part !== undefined).join("\n\n");
}

/** Wysyła mail dzienny. Zwraca, czy wyszedł; brak klucza Resend albo błąd Resend to `false`. */
export async function sendConversationsDigest(input: ConversationsDigestInput): Promise<boolean> {
  const t = await getTranslations({ locale: "pl", namespace: "ConversationsDigestEmail" });
  const subject = t("subject", { count: countDigestTasks(input.groups) });
  const labels: DigestLabels = {
    overdue: t("overdue"),
    today: t("today"),
    waitingThem: t("waitingThem"),
    dueOn: t("dueOn"),
  };
  const content: TransactionalEmailProps = {
    preview: subject,
    heading: subject,
    body: buildDigestBody(input.groups, input.noDueDateCount, t("intro"), t("noDueDate", { count: input.noDueDateCount }), labels),
    ctaLabel: t("cta"),
    ctaHref: `${baseUrl()}/pl/internal/conversations`,
  };

  return sendNotificationEmail({
    to: input.to,
    subject,
    html: await render(TransactionalEmail(content)),
    text: renderTransactionalEmailText(content),
    emailType: "crm_daily_digest",
    entityId: input.digestDate,
    distinctId: "crm-daily-digest",
  });
}
