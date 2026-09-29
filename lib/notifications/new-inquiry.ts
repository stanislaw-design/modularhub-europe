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

// AC-1: klient dostaje e mail potwierdzający złożenie nowego zapytania/sprawy.
// Best effort, tak jak notifyAdvisorOfNewCase obok którego jest wołana.
export async function notifyClientOfNewCase(inquiryId: string): Promise<void> {
  try {
    const [row] = await db.select({ email: inquiry.email }).from(inquiry).where(eq(inquiry.id, inquiryId));
    if (!row?.email) return;

    const t = await getTranslations({ locale: "pl", namespace: "NewInquiryConfirmationEmail" });
    const content: TransactionalEmailProps = {
      preview: t("subject"),
      heading: t("heading"),
      body: t("body"),
      ctaLabel: t("cta"),
      ctaHref: caseLink("client", "pl", inquiryId),
      reference: shortReference(inquiryId),
    };

    await sendNotificationEmail({
      to: row.email,
      subject: t("subject"),
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "new_inquiry_confirmation",
      entityId: inquiryId,
      distinctId: inquiryId,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfNewCase" });
  }
}
