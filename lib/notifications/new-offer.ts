import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { caseLink } from "@/lib/cases/notify";
import { db } from "@/lib/db/client";
import { inquiry } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// AC-2: klient (e mail z inquiry.email) dostaje e mail o nowej ofercie
// producenta na zapytaniu bezpośrednim, z linkiem do jej podglądu. Best
// effort (Key invariants): błąd tutaj nigdy nie cofa ani nie failuje
// submitOffer, który go wywołał.
export async function notifyClientOfNewOffer(offerId: string, inquiryId: string): Promise<void> {
  try {
    const [row] = await db.select({ email: inquiry.email }).from(inquiry).where(eq(inquiry.id, inquiryId));
    if (!row?.email) return;

    const t = await getTranslations({ locale: "pl", namespace: "NewOfferEmail" });
    const content: TransactionalEmailProps = {
      preview: t("subject"),
      heading: t("heading"),
      body: t("body"),
      ctaLabel: t("cta"),
      ctaHref: caseLink("client", "pl", inquiryId),
      reference: shortReference(offerId),
    };

    await sendNotificationEmail({
      to: row.email,
      subject: t("subject"),
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "new_offer",
      entityId: offerId,
      distinctId: offerId,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfNewOffer" });
  }
}
