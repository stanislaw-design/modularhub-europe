import { render } from "@react-email/render";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { producer, projectQuote, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Spec 0070 AC-19, AC-37, AC-24 (zamknięcie zapytania): producenci z aktywną ofertą
// dostają neutralną informację po polsku, taką samą bez względu na to, kto zamknął
// zapytanie. Bez powodu, bez nazwy klienta i bez danych kontaktowych. Best effort:
// błąd wysyłki trafia do Sentry i nigdy nie cofa zamknięcia.
export async function notifyProducersOfClosedRequest(input: { kind: "request" | "product"; id: string }): Promise<void> {
  try {
    const parentColumn = input.kind === "request" ? projectQuote.projectRequestId : projectQuote.bulkProductInquiryId;
    const recipients = await db
      .selectDistinct({ producerId: producer.id, email: users.email })
      .from(projectQuote)
      .innerJoin(producer, eq(producer.id, projectQuote.producerId))
      .innerJoin(users, eq(users.id, producer.userId))
      .where(and(eq(parentColumn, input.id), eq(projectQuote.status, "active")));
    if (recipients.length === 0) return;

    const t = await getTranslations({ locale: "pl", namespace: "LargeOrderProducerClosedEmail" });
    const subject = t("subject");
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: t("body"),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/pl/producer/panel/board`,
      reference: shortReference(input.id),
    };
    const html = await render(TransactionalEmail(content));
    const text = renderTransactionalEmailText(content);

    for (const recipient of recipients) {
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
  } catch (error) {
    captureError(error, { path: "notifications:notifyProducersOfClosedRequest" });
  }
}
