import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const DATE_LOCALES: Record<string, string> = { pl: "pl-PL", en: "en-GB", de: "de-DE", nl: "nl-NL" };

export interface RequestOnBehalfForClient {
  kind: "request" | "product";
  id: string;
  email: string;
  name: string;
  // Język klienta wybrany jawnie przez doradcę (spec 0070 AC-20), zapisany też jako contact_locale.
  locale: string;
  countryCode: string;
  unitCount: number;
  deadlineAt: Date;
}

// Spec 0070 AC-20, AC-23, AC-24: klient, w imieniu którego doradca złożył zapytanie,
// dostaje mail w wybranym języku. Link prowadzi do ekranu logowania z powrotem na
// /{locale}/panel/quotes (nie na /pl/panel). Bez danych producentów, bo oferty jeszcze
// nie ma. Best effort: błąd wysyłki trafia do Sentry i nigdy nie cofa zapisu zapytania.
export async function notifyClientOfRequestOnBehalf(input: RequestOnBehalfForClient): Promise<void> {
  try {
    const t = await getTranslations({ locale: input.locale, namespace: "LargeOrderClientOnBehalfEmail" });
    const deadline = new Intl.DateTimeFormat(DATE_LOCALES[input.locale] ?? "pl-PL", { dateStyle: "long" }).format(
      input.deadlineAt,
    );
    const callbackUrl = `/${input.locale}/panel/quotes`;
    const subject = t("subject");
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: [
        t("greeting", { name: input.name }),
        t("intro"),
        `${t("countryLabel")}: ${input.countryCode}`,
        `${t("unitsLabel")}: ${input.unitCount}`,
        `${t("deadlineLabel")}: ${deadline}`,
        t("loginHint", { email: input.email }),
      ].join("\n"),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/${input.locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      reference: shortReference(input.id),
    };

    await sendNotificationEmail({
      to: input.email,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "large_order_client_request_on_behalf",
      entityId: input.id,
      distinctId: input.id,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfRequestOnBehalf" });
  }
}

export interface PublishedSummaryForClient {
  kind: "request" | "product";
  id: string;
  email: string;
  name: string;
  // contact_locale zapytania (spec 0070 AC-23): język maila i powrotu po zalogowaniu.
  locale: string;
  countryCode: string;
  unitCount: number;
}

// Spec 0070 AC-14, AC-23, AC-24: po publikacji podsumowania klient dostaje mail w języku
// zapytania z linkiem do logowania, który wraca na /{locale}/panel/quotes. Konto nie jest
// wymagane: klient bez konta zakłada je pierwszym logowaniem (pending_registration, ustawia
// to wołający). Bez cen i nazw producentów w treści. Best effort, błąd idzie do Sentry.
export async function notifyClientOfPublishedSummary(input: PublishedSummaryForClient): Promise<void> {
  try {
    const t = await getTranslations({ locale: input.locale, namespace: "LargeOrderClientSummaryPublishedEmail" });
    const callbackUrl = `/${input.locale}/panel/quotes`;
    const subject = t("subject");
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: [
        t("greeting", { name: input.name }),
        t("intro"),
        `${t("countryLabel")}: ${input.countryCode}`,
        `${t("unitsLabel")}: ${input.unitCount}`,
        t("loginHint", { email: input.email }),
      ].join("\n"),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/${input.locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      reference: shortReference(input.id),
    };

    await sendNotificationEmail({
      to: input.email,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "large_order_client_summary_published",
      entityId: input.id,
      distinctId: input.id,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfPublishedSummary" });
  }
}
