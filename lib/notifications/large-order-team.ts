import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

export interface NewLargeOrderForTeam {
  kind: "request" | "product";
  id: string;
  countryCode: string;
  unitCount: number;
  deadlineAt: Date;
  contactLocale: string;
  // Liczba producentów dopasowanych do zapytania wolnego (spec 0070 AC-10).
  // Brak wartości: zapytanie o produkt (idzie do producenta produktu) albo nie
  // udało się policzyć. Zero zmienia mail w alert.
  matchedProducerCount?: number;
}

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Adres zespołu dla alertów dużych zamówień (spec 0070 Configuration required).
// Spec nazywa zmienną OPERATIONS_NOTIFY_EMAIL; ADVISOR_NOTIFY_EMAIL (spec 0048)
// jest zapasowym adresem, żeby alert nie przepadł, dopóki nowa zmienna nie
// jest ustawiona.
function teamRecipient(): string | undefined {
  return process.env.OPERATIONS_NOTIFY_EMAIL ?? process.env.ADVISOR_NOTIFY_EMAIL;
}

// Spec 0070 AC-24 (część): nowe zapytanie, mail do zespołu po polsku, od razu po
// złożeniu. Bez danych kontaktowych klienta w treści (link do panelu admina).
// Best effort: błąd wysyłki trafia do Sentry i nigdy nie cofa zapisu zapytania.
export async function notifyTeamOfNewLargeOrder(order: NewLargeOrderForTeam): Promise<void> {
  const to = teamRecipient();
  if (!to) return;
  try {
    const t = await getTranslations({ locale: "pl", namespace: "LargeOrderTeamNewRequestEmail" });
    const noMatch = order.matchedProducerCount === 0;
    const subject = t(noMatch ? "subjectNoMatch" : "subject", { units: order.unitCount, country: order.countryCode });
    const deadline = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(order.deadlineAt);
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: [
        noMatch ? t("noMatchWarning") : undefined,
        t("intro"),
        `${t("countryLabel")}: ${order.countryCode}`,
        `${t("unitsLabel")}: ${order.unitCount}`,
        `${t("deadlineLabel")}: ${deadline}`,
        `${t("languageLabel")}: ${order.contactLocale}`,
        order.matchedProducerCount === undefined ? undefined : `${t("matchedLabel")}: ${order.matchedProducerCount}`,
      ]
        .filter((line) => line !== undefined)
        .join("\n"),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/pl/internal/large-orders/${order.id}?kind=${order.kind}`,
      reference: shortReference(order.id),
    };

    await sendNotificationEmail({
      to,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "large_order_team_new_request",
      entityId: order.id,
      distinctId: order.id,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyTeamOfNewLargeOrder" });
  }
}

export interface ClientCancelledRequestForTeam {
  kind: "request" | "product";
  id: string;
  countryCode: string;
  unitCount: number;
  // Powód maila: podsumowanie było już opublikowane, albo wybór klienta czekał na B2B.
  wasPublished: boolean;
  hadPendingSelection: boolean;
}

// Spec 0070 AC-37: klient zamknął własne zapytanie. Zespół dostaje mail po polsku tylko
// wtedy, gdy ktoś już włożył pracę (opublikowane podsumowanie) albo czekał na
// zatwierdzenie B2B dla wyboru, który już nie ma sensu. Best effort, jak inne maile zespołu.
export async function notifyTeamOfClientCancelledRequest(order: ClientCancelledRequestForTeam): Promise<void> {
  if (!order.wasPublished && !order.hadPendingSelection) return;
  const to = teamRecipient();
  if (!to) return;
  try {
    const t = await getTranslations({ locale: "pl", namespace: "LargeOrderTeamClientCancelledEmail" });
    const subject = t("subject", { units: order.unitCount, country: order.countryCode });
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: [
        t("intro"),
        order.wasPublished ? t("publishedNote") : undefined,
        order.hadPendingSelection ? t("pendingSelectionNote") : undefined,
      ]
        .filter((line) => line !== undefined)
        .join("\n"),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/pl/internal/large-orders/${order.id}?kind=${order.kind}`,
      reference: shortReference(order.id),
    };

    await sendNotificationEmail({
      to,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "large_order_team_client_cancelled",
      entityId: order.id,
      distinctId: order.id,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyTeamOfClientCancelledRequest" });
  }
}
