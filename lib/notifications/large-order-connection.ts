import { render } from "@react-email/render";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { bulkProductInquiry, producer, projectQuote, projectRequest, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail, type NotificationEmailType } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

type Kind = "request" | "product";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Ten sam adres zespołu co w large-order-team.ts (OPERATIONS_NOTIFY_EMAIL, zapasowo ADVISOR_NOTIFY_EMAIL).
function teamRecipient(): string | undefined {
  return process.env.OPERATIONS_NOTIFY_EMAIL ?? process.env.ADVISOR_NOTIFY_EMAIL;
}

interface RequestParty {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactLocale: string;
  countryCode: string;
  unitCount: number;
  selectedQuoteId: string | null;
}

async function loadRequest(kind: Kind, id: string): Promise<RequestParty | null> {
  if (kind === "request") {
    const [row] = await db
      .select({
        contactName: projectRequest.contactName,
        contactEmail: projectRequest.contactEmail,
        contactPhone: projectRequest.contactPhone,
        contactLocale: projectRequest.contactLocale,
        countryCode: projectRequest.countryCode,
        unitCount: projectRequest.unitCount,
        selectedQuoteId: projectRequest.selectedQuoteId,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, id));
    return row ?? null;
  }
  const [row] = await db
    .select({
      contactName: bulkProductInquiry.contactName,
      contactEmail: bulkProductInquiry.contactEmail,
      contactPhone: bulkProductInquiry.contactPhone,
      contactLocale: bulkProductInquiry.contactLocale,
      countryCode: bulkProductInquiry.deliveryCountryCode,
      unitCount: bulkProductInquiry.unitCount,
      selectedQuoteId: bulkProductInquiry.selectedQuoteId,
    })
    .from(bulkProductInquiry)
    .where(eq(bulkProductInquiry.id, id));
  return row ?? null;
}

async function sendContent(input: {
  to: string;
  content: TransactionalEmailProps;
  emailType: NotificationEmailType;
  entityId: string;
  distinctId: string;
}): Promise<void> {
  await sendNotificationEmail({
    to: input.to,
    subject: input.content.heading,
    html: await render(TransactionalEmail(input.content)),
    text: renderTransactionalEmailText(input.content),
    emailType: input.emailType,
    entityId: input.entityId,
    distinctId: input.distinctId,
  });
}

// Spec 0070 AC-17, część C: połączenie stron. Trzy maile: klient (w języku zapytania) dostaje
// dane zwycięskiego producenta, producent (po polsku) dane klienta, zespół kopię z danymi obu
// stron. Każdy mail prosi, żeby ustalenia o cenie, zakresie i terminie potwierdzać w systemie.
// Wołane tylko wtedy, gdy zapis połączenia faktycznie zmienił wiersz, więc najwyżej raz na
// zapytanie. Best effort: błąd wysyłki trafia do Sentry i nigdy nie cofa połączenia.
export async function notifyOfConnection(input: { kind: Kind; id: string }): Promise<void> {
  try {
    const request = await loadRequest(input.kind, input.id);
    if (!request?.selectedQuoteId) return;

    const [winner] = await db
      .select({ producerId: producer.id, producerName: producer.name, producerEmail: users.email })
      .from(projectQuote)
      .innerJoin(producer, eq(producer.id, projectQuote.producerId))
      .innerJoin(users, eq(users.id, producer.userId))
      .where(and(eq(projectQuote.id, request.selectedQuoteId), eq(projectQuote.status, "accepted")));
    if (!winner) return;

    const reference = shortReference(input.id);
    const phone = request.contactPhone ?? "-";
    const producerEmail = winner.producerEmail ?? "-";

    const clientT = await getTranslations({ locale: request.contactLocale, namespace: "LargeOrderClientConnectedEmail" });
    const clientSubject = clientT("subject", { producer: winner.producerName });
    await sendContent({
      to: request.contactEmail,
      content: {
        preview: clientSubject,
        heading: clientSubject,
        body: [
          clientT("intro", { producer: winner.producerName }),
          `${clientT("producerLabel")}: ${winner.producerName}`,
          `${clientT("emailLabel")}: ${producerEmail}`,
          clientT("confirmInSystem"),
        ].join("\n"),
        ctaLabel: clientT("cta"),
        ctaHref: `${baseUrl()}/${request.contactLocale}/panel/quotes`,
        reference,
      },
      emailType: "large_order_client_connected",
      entityId: input.id,
      distinctId: input.id,
    });

    const producerT = await getTranslations({ locale: "pl", namespace: "LargeOrderProducerConnectedEmail" });
    const producerSubject = producerT("subject");
    if (winner.producerEmail) await sendContent({
      to: winner.producerEmail,
      content: {
        preview: producerSubject,
        heading: producerSubject,
        body: [
          producerT("intro"),
          `${producerT("nameLabel")}: ${request.contactName}`,
          `${producerT("emailLabel")}: ${request.contactEmail}`,
          `${producerT("phoneLabel")}: ${phone}`,
          `${producerT("countryLabel")}: ${request.countryCode}`,
          `${producerT("unitsLabel")}: ${request.unitCount}`,
          producerT("confirmInSystem"),
        ].join("\n"),
        ctaLabel: producerT("cta"),
        ctaHref: `${baseUrl()}/pl/producer/panel/board-quotes`,
        reference,
      },
      emailType: "large_order_producer_connected",
      entityId: input.id,
      distinctId: winner.producerId,
    });

    const team = teamRecipient();
    if (team) {
      const teamT = await getTranslations({ locale: "pl", namespace: "LargeOrderTeamConnectedEmail" });
      const teamSubject = teamT("subject", { units: request.unitCount, country: request.countryCode });
      await sendContent({
        to: team,
        content: {
          preview: teamSubject,
          heading: teamSubject,
          body: [
            teamT("intro"),
            `${teamT("producerLabel")}: ${winner.producerName} (${producerEmail})`,
            `${teamT("clientLabel")}: ${request.contactName} (${request.contactEmail}, ${phone})`,
          ].join("\n"),
          ctaLabel: teamT("cta"),
          ctaHref: `${baseUrl()}/pl/internal/large-orders/${input.id}?kind=${input.kind}`,
          reference,
        },
        emailType: "large_order_team_connected",
        entityId: input.id,
        distinctId: input.id,
      });
    }
  } catch (error) {
    captureError(error, { path: "notifications:notifyOfConnection" });
  }
}

// Spec 0070 AC-17: klient wybrał ofertę, ale nie ma jeszcze zatwierdzonych danych firmy, więc
// połączenie czeka. Zespół dostaje mail po polsku, żeby zatwierdził B2B. Bez danych kontaktowych.
export async function notifyTeamOfPendingSelection(input: { kind: Kind; id: string }): Promise<void> {
  const to = teamRecipient();
  if (!to) return;
  try {
    const request = await loadRequest(input.kind, input.id);
    if (!request) return;
    const t = await getTranslations({ locale: "pl", namespace: "LargeOrderTeamPendingSelectionEmail" });
    const subject = t("subject", { units: request.unitCount, country: request.countryCode });
    await sendContent({
      to,
      content: {
        preview: subject,
        heading: subject,
        body: t("intro"),
        ctaLabel: t("cta"),
        ctaHref: `${baseUrl()}/pl/internal/large-orders/${input.id}?kind=${input.kind}`,
        reference: shortReference(input.id),
      },
      emailType: "large_order_team_pending_selection",
      entityId: input.id,
      distinctId: input.id,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyTeamOfPendingSelection" });
  }
}
