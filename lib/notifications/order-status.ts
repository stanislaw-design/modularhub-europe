import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { caseLink } from "@/lib/cases/notify";
import { db } from "@/lib/db/client";
import { inquiry, offer, order, orderStageEnum } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

export type OrderStage = (typeof orderStageEnum.enumValues)[number];

// Zaprojektowane w spec 0051 (AC-6), jeszcze nie podłączone: żadna akcja nie
// woła tej funkcji dzisiaj, bo funkcja 16 (Realizacja i statusy na
// prawdziwym zapleczu) jeszcze nie istnieje. Patrz docs/specs/0051.../
// index.md `## Follow-up` dla dokładnego miejsca podłączenia.
//
// order.offerId -> offer.inquiryId -> inquiry.email (Data model sketch).
export async function notifyClientOfOrderStatusChange(orderId: string, newStage: OrderStage): Promise<void> {
  try {
    const [row] = await db
      .select({ email: inquiry.email, inquiryId: inquiry.id })
      .from(order)
      .innerJoin(offer, eq(offer.id, order.offerId))
      .innerJoin(inquiry, eq(inquiry.id, offer.inquiryId))
      .where(eq(order.id, orderId));
    if (!row?.email) return;

    const [t, stageLabel] = await Promise.all([
      getTranslations({ locale: "pl", namespace: "OrderStatusChangedEmail" }),
      getTranslations({ locale: "pl", namespace: "FulfillmentStage" }),
    ]);
    const content: TransactionalEmailProps = {
      preview: t("subject"),
      heading: t("heading"),
      body: t("body", { stage: stageLabel(newStage) }),
      ctaLabel: t("cta"),
      ctaHref: caseLink("client", "pl", row.inquiryId),
      badge: stageLabel(newStage),
      reference: shortReference(orderId),
    };

    await sendNotificationEmail({
      to: row.email,
      subject: t("subject"),
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "order_status_changed",
      entityId: orderId,
      distinctId: orderId,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfOrderStatusChange" });
  }
}
