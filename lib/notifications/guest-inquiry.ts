import { and, eq, isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { findClientIdByEmail } from "@/lib/cases/guest";
import { caseLink, claimLink } from "@/lib/cases/notify";
import { db } from "@/lib/db/client";
import { inquiry } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// Powiadomienia po zapytaniu gościa (spec 0066 AC-7, AC-10). Żaden mail nie
// powtarza pól wpisanych przez gościa (imię, wiadomość, adres): wyłącznie stały
// tekst i link, żeby nasza domena nie była kanałem phishingu.
export async function notifyGuestOfNewCase(inquiryId: string): Promise<void> {
  try {
    const [row] = await db
      .select({ email: inquiry.email, locale: inquiry.locale, clientId: inquiry.clientId })
      .from(inquiry)
      .where(eq(inquiry.id, inquiryId));
    if (!row?.email || row.clientId) return;
    const locale = row.locale ?? "pl";

    // AC-10: e mail należy do istniejącego konta klienta, więc sprawa od razu
    // trafia na jego konto, jako niepotwierdzona, a właściciel dostaje "czy to Ty".
    const existingClientId = await findClientIdByEmail(row.email);
    if (existingClientId) {
      await db
        .update(inquiry)
        .set({ clientId: existingClientId })
        .where(and(eq(inquiry.id, inquiryId), isNull(inquiry.clientId)));
      await sendEmail("GuestIdentityCheckEmail", "guest_identity_check", inquiryId, row.email, locale, caseLink("client", locale, inquiryId), true);
      return;
    }

    await sendEmail("GuestInquiryConfirmationEmail", "guest_inquiry_confirmation", inquiryId, row.email, locale, claimLink(locale, inquiryId), false);
  } catch (error) {
    captureError(error, { path: "notifications:notifyGuestOfNewCase" });
  }
}

async function sendEmail(
  namespace: "GuestInquiryConfirmationEmail" | "GuestIdentityCheckEmail",
  emailType: "guest_inquiry_confirmation" | "guest_identity_check",
  inquiryId: string,
  to: string,
  locale: string,
  ctaHref: string,
  withReplyTo: boolean,
): Promise<void> {
  const t = await getTranslations({ locale, namespace });
  const content: TransactionalEmailProps = {
    preview: t("subject"),
    heading: t("heading"),
    body: t("body"),
    ctaLabel: t("cta"),
    ctaHref,
    reference: shortReference(inquiryId),
  };
  await sendNotificationEmail({
    to,
    subject: t("subject"),
    html: await render(TransactionalEmail(content)),
    text: renderTransactionalEmailText(content),
    emailType,
    entityId: inquiryId,
    distinctId: inquiryId,
    replyTo: withReplyTo ? process.env.SUPPORT_REPLY_TO_EMAIL || undefined : undefined,
  });
}
