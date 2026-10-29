import { render } from "@react-email/render";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { getProducerRecipientsForLargeOrder, getProducerUserEmails } from "@/lib/db/large-order-recipients";
import { bulkProductInquiry, product, projectQuote, projectRequest } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import {
  getProducerCommunicationLocale,
  groupByCommunicationLocale,
  intlLocaleFor,
  type CommunicationLocale,
} from "@/lib/producer-communication-locale";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Spec 0070 AC-19, AC-37, AC-24 (zamknięcie zapytania): producenci z aktywną ofertą
// dostają neutralną informację w języku z konta (spec 0077 C), taką samą bez względu na to, kto zamknął
// zapytanie. Bez powodu, bez nazwy klienta i bez danych kontaktowych. Best effort:
// błąd wysyłki trafia do Sentry i nigdy nie cofa zamknięcia.
export async function notifyProducersOfClosedRequest(input: { kind: "request" | "product"; id: string }): Promise<void> {
  try {
    const parentColumn = input.kind === "request" ? projectQuote.projectRequestId : projectQuote.bulkProductInquiryId;
    const quoted = await db
      .selectDistinct({ producerId: projectQuote.producerId })
      .from(projectQuote)
      .where(and(eq(parentColumn, input.id), eq(projectQuote.status, "active")));
    const recipients = await getProducerUserEmails(quoted.map((row) => row.producerId));
    if (recipients.length === 0) return;

    for (const [locale, group] of groupByCommunicationLocale(recipients)) {
      const t = await getTranslations({ locale, namespace: "LargeOrderProducerClosedEmail" });
      const subject = t("subject");
      const content: TransactionalEmailProps = {
        preview: subject,
        heading: subject,
        body: t("body"),
        ctaLabel: t("cta"),
        ctaHref: `${baseUrl()}/${locale}/producer/panel/board`,
        reference: shortReference(input.id),
      };
      const html = await render(TransactionalEmail(content));
      const text = renderTransactionalEmailText(content);

      for (const recipient of group) {
        if (!recipient.email) continue;
        await sendNotificationEmail({
          to: recipient.email,
          subject,
          html,
          text,
          emailType: "large_order_producer_request_closed",
          entityId: input.id,
          distinctId: recipient.producerId,
        });
      }
    }
  } catch (error) {
    captureError(error, { path: "notifications:notifyProducersOfClosedRequest" });
  }
}

// Spec 0070 AC-18, AC-24: po połączeniu stron pozostali producenci z ofertą (oferty ustawione
// na rejected przez connectSelection) dostają neutralną informację w języku z konta (spec 0077 C): wybrano innego
// producenta, bez jego nazwy i bez cen, i nic więcej nie trzeba robić. Wołane tylko wtedy, gdy
// zapis połączenia faktycznie zmienił wiersz, więc najwyżej raz na zapytanie. Best effort:
// błąd wysyłki trafia do Sentry i nigdy nie cofa połączenia.
export async function notifyProducersOfOtherSelected(input: { kind: "request" | "product"; id: string }): Promise<void> {
  try {
    const parentColumn = input.kind === "request" ? projectQuote.projectRequestId : projectQuote.bulkProductInquiryId;
    const quoted = await db
      .selectDistinct({ producerId: projectQuote.producerId })
      .from(projectQuote)
      .where(and(eq(parentColumn, input.id), eq(projectQuote.status, "rejected")));
    const recipients = await getProducerUserEmails(quoted.map((row) => row.producerId));
    if (recipients.length === 0) return;

    for (const [locale, group] of groupByCommunicationLocale(recipients)) {
      const t = await getTranslations({ locale, namespace: "LargeOrderProducerNotSelectedEmail" });
      const subject = t("subject");
      const content: TransactionalEmailProps = {
        preview: subject,
        heading: subject,
        body: t("body"),
        ctaLabel: t("cta"),
        ctaHref: `${baseUrl()}/${locale}/producer/panel/board`,
        reference: shortReference(input.id),
      };
      const html = await render(TransactionalEmail(content));
      const text = renderTransactionalEmailText(content);

      for (const recipient of group) {
        if (!recipient.email) continue;
        await sendNotificationEmail({
          to: recipient.email,
          subject,
          html,
          text,
          emailType: "large_order_producer_not_selected",
          entityId: input.id,
          distinctId: recipient.producerId,
        });
      }
    }
  } catch (error) {
    captureError(error, { path: "notifications:notifyProducersOfOtherSelected" });
  }
}

type LargeOrderKind = "request" | "product";

interface LargeOrderSummary {
  countryCode: string;
  unitCount: number;
  deadlineAt: Date;
  // Rodziny produktów (zapytanie wolne) albo nazwa produktu (zapytanie o produkt).
  families: string[];
  productName: string | null;
}

async function loadLargeOrderSummary(kind: LargeOrderKind, id: string): Promise<LargeOrderSummary | null> {
  if (kind === "request") {
    const [row] = await db
      .select({
        countryCode: projectRequest.countryCode,
        unitCount: projectRequest.unitCount,
        deadlineAt: projectRequest.deadlineAt,
        families: projectRequest.families,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, id));
    return row ? { ...row, families: row.families ?? [], productName: null } : null;
  }
  const [row] = await db
    .select({
      countryCode: bulkProductInquiry.deliveryCountryCode,
      unitCount: bulkProductInquiry.unitCount,
      deadlineAt: bulkProductInquiry.deadlineAt,
      productName: product.name,
    })
    .from(bulkProductInquiry)
    .innerJoin(product, eq(product.id, bulkProductInquiry.productId))
    .where(eq(bulkProductInquiry.id, id));
  return row ? { ...row, families: [] } : null;
}

function boardHref(kind: LargeOrderKind, id: string, locale: CommunicationLocale): string {
  const path = kind === "request" ? "board" : "product-inquiries";
  return `${baseUrl()}/${locale}/producer/panel/${path}/${id}`;
}

// Spec 0070 AC-24: nowe zapytanie trafia od razu do dopasowanych producentów (zapytanie
// wolne, ta sama reguła co tablica) albo do producenta produktu (zapytanie o produkt).
// Treść: kraj, liczba domów, rodziny lub produkt, termin i link. Nigdy dane kontaktowe
// klienta. Best effort: błąd wysyłki do jednego producenta nie zatrzymuje reszty ani nie
// cofa zapisu zapytania; po pętli lista producentów, do których mail nie doszedł, trafia do
// Sentry (zespół widzi, kogo trzeba powiadomić ręcznie).
export async function notifyProducersOfNewLargeOrder(input: { kind: LargeOrderKind; id: string }): Promise<void> {
  try {
    const [summary, recipients] = await Promise.all([
      loadLargeOrderSummary(input.kind, input.id),
      getProducerRecipientsForLargeOrder(input.kind, input.id),
    ]);
    if (!summary || recipients.length === 0) return;

    const failed: string[] = [];
    for (const [locale, group] of groupByCommunicationLocale(recipients)) {
      const t = await getTranslations({ locale, namespace: "LargeOrderProducerNewRequestEmail" });
      const subject = t("subject", { units: summary.unitCount, country: summary.countryCode });
      const deadline = new Intl.DateTimeFormat(intlLocaleFor(locale), { dateStyle: "long" }).format(summary.deadlineAt);
      const content: TransactionalEmailProps = {
        preview: subject,
        heading: subject,
        body: [
          t("intro"),
          `${t("countryLabel")}: ${summary.countryCode}`,
          `${t("unitsLabel")}: ${summary.unitCount}`,
          summary.families.length > 0 ? `${t("familiesLabel")}: ${summary.families.join(", ")}` : undefined,
          summary.productName ? `${t("productLabel")}: ${summary.productName}` : undefined,
          `${t("deadlineLabel")}: ${deadline}`,
        ]
          .filter((line) => line !== undefined)
          .join("\n"),
        ctaLabel: t("cta"),
        ctaHref: boardHref(input.kind, input.id, locale),
        reference: shortReference(input.id),
      };
      const html = await render(TransactionalEmail(content));
      const text = renderTransactionalEmailText(content);

      for (const recipient of group) {
        const sent = await sendNotificationEmail({
          to: recipient.email,
          subject,
          html,
          text,
          emailType: "large_order_producer_new_request",
          entityId: input.id,
          distinctId: recipient.producerId,
        });
        if (!sent) failed.push(recipient.producerId);
      }
    }
    if (failed.length > 0) {
      captureError(
        new Error(`Mail o nowym zapytaniu ${input.id} nie doszedł do producentów: ${failed.join(", ")}`),
        { path: "notifications:notifyProducersOfNewLargeOrder" },
      );
    }
  } catch (error) {
    captureError(error, { path: "notifications:notifyProducersOfNewLargeOrder" });
  }
}

export type DeadlineReminderThreshold = "3d" | "1d";

// Spec 0070 AC-25: przypomnienie o terminie dla jednego producenta bez aktywnej oferty.
// Wołane przez zadanie cykliczne dopiero po tym, jak wiersz w project_notification_log
// został wstawiony (najwyżej jedno przypomnienie na próg i termin). Zwraca, czy mail wyszedł.
export async function sendDeadlineReminderToProducer(input: {
  kind: LargeOrderKind;
  id: string;
  producerId: string;
  email: string;
  threshold: DeadlineReminderThreshold;
  // Język z listy odbiorców; bez niego jest czytany z konta (spec 0077 AC-30).
  locale?: CommunicationLocale;
}): Promise<boolean> {
  try {
    const summary = await loadLargeOrderSummary(input.kind, input.id);
    if (!summary) return false;
    const locale = input.locale ?? (await getProducerCommunicationLocale(input.producerId));
    const t = await getTranslations({ locale, namespace: "LargeOrderProducerReminderEmail" });
    const subject = t(input.threshold === "3d" ? "subject3d" : "subject1d");
    const deadline = new Intl.DateTimeFormat(intlLocaleFor(locale), { dateStyle: "long", timeStyle: "short" }).format(
      summary.deadlineAt,
    );
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: [
        t("intro"),
        `${t("countryLabel")}: ${summary.countryCode}`,
        `${t("unitsLabel")}: ${summary.unitCount}`,
        `${t("deadlineLabel")}: ${deadline}`,
      ].join("\n"),
      ctaLabel: t("cta"),
      ctaHref: boardHref(input.kind, input.id, locale),
      reference: shortReference(input.id),
    };
    return await sendNotificationEmail({
      to: input.email,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "large_order_producer_reminder",
      entityId: input.id,
      distinctId: input.producerId,
    });
  } catch (error) {
    captureError(error, { path: "notifications:sendDeadlineReminderToProducer" });
    return false;
  }
}

// Spec 0077 AC-8: mail o nowym projekcie własnym ModularHub do wskazanych producentów. Ten sam
// odbiorca co na tablicy (wiersz include), jeden mail na użytkownika producenta, bez dubli.
// Treść: tytuł, zamawiający (ModularHub), kraj, liczba sztuk, termin i link. Bez danych klienta,
// bo go nie ma. Język z konta producenta (część C). Best
// effort: błąd wysyłki trafia do Sentry i nie cofa założenia projektu.
export async function notifyProducersOfNewPlatformProject(input: { id: string }): Promise<void> {
  try {
    const [row] = await db
      .select({
        title: projectRequest.title,
        countryCode: projectRequest.countryCode,
        unitCount: projectRequest.unitCount,
        deadlineAt: projectRequest.deadlineAt,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, input.id));
    if (!row) return;
    const recipients = await getProducerRecipientsForLargeOrder("request", input.id);
    if (recipients.length === 0) return;

    const title = row.title ?? "";
    const failed: string[] = [];
    for (const [locale, group] of groupByCommunicationLocale(recipients)) {
      const t = await getTranslations({ locale, namespace: "LargeOrderProducerNewPlatformProjectEmail" });
      const subject = t("subject", { title });
      const deadline = new Intl.DateTimeFormat(intlLocaleFor(locale), { dateStyle: "long" }).format(row.deadlineAt);
      const content: TransactionalEmailProps = {
        preview: subject,
        heading: subject,
        body: [
          t("intro"),
          `${t("titleLabel")}: ${title}`,
          `${t("buyerLabel")}: ${t("buyerValue")}`,
          `${t("countryLabel")}: ${row.countryCode}`,
          `${t("unitsLabel")}: ${row.unitCount}`,
          `${t("deadlineLabel")}: ${deadline}`,
        ].join("\n"),
        ctaLabel: t("cta"),
        ctaHref: boardHref("request", input.id, locale),
        reference: shortReference(input.id),
      };
      const html = await render(TransactionalEmail(content));
      const text = renderTransactionalEmailText(content);

      for (const recipient of group) {
        const sent = await sendNotificationEmail({
          to: recipient.email,
          subject,
          html,
          text,
          emailType: "large_order_producer_new_platform_project",
          entityId: input.id,
          distinctId: recipient.producerId,
        });
        if (!sent) failed.push(recipient.producerId);
      }
    }
    if (failed.length > 0) {
      captureError(
        new Error(`Mail o nowym projekcie własnym ${input.id} nie doszedł do producentów: ${failed.join(", ")}`),
        { path: "notifications:notifyProducersOfNewPlatformProject" },
      );
    }
  } catch (error) {
    captureError(error, { path: "notifications:notifyProducersOfNewPlatformProject" });
  }
}

// Spec 0077 AC-18: jeden, identyczny i neutralny mail po zakończeniu wyboru w projekcie własnym:
// tytuł projektu, informacja, że wybór został dokonany, podziękowanie i zapowiedź dalszych kroków.
// Bez nazwy wybranego producenta, cen, powodu i informacji, czy dany producent wygrał. Wołane dla
// jednego producenta, po tym jak wpis w project_notification_log został zajęty (najwyżej raz).
// Zwraca, czy mail wyszedł do przynajmniej jednego adresu. Język z konta producenta (część C).
export async function sendPlatformSelectionDoneToProducer(input: { id: string; producerId: string }): Promise<boolean> {
  try {
    const [row] = await db.select({ title: projectRequest.title }).from(projectRequest).where(eq(projectRequest.id, input.id));
    if (!row) return false;
    const recipients = await getProducerUserEmails([input.producerId]);
    if (recipients.length === 0) return false;

    const title = row.title ?? "";
    let sentAny = false;
    for (const [locale, group] of groupByCommunicationLocale(recipients)) {
      const t = await getTranslations({ locale, namespace: "LargeOrderProducerPlatformSelectionDoneEmail" });
      const subject = t("subject", { title });
      const content: TransactionalEmailProps = {
        preview: subject,
        heading: subject,
        body: t("body", { title }),
        ctaLabel: t("cta"),
        ctaHref: `${baseUrl()}/${locale}/producer/panel/board-quotes`,
        reference: shortReference(input.id),
      };
      const html = await render(TransactionalEmail(content));
      const text = renderTransactionalEmailText(content);

      for (const recipient of group) {
        const sent = await sendNotificationEmail({
          to: recipient.email,
          subject,
          html,
          text,
          emailType: "large_order_producer_platform_selection_done",
          entityId: input.id,
          distinctId: recipient.producerId,
        });
        sentAny = sentAny || sent;
      }
    }
    return sentAny;
  } catch (error) {
    captureError(error, { path: "notifications:sendPlatformSelectionDoneToProducer" });
    return false;
  }
}
