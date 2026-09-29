import { eq } from "drizzle-orm";
import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db/client";
import { payment, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function formatAmount(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

// Zaprojektowane w spec 0051 (AC-6), jeszcze nie podłączone: żadna akcja nie
// woła tej funkcji dzisiaj, bo funkcja 12 (Realne płatności) jeszcze nie
// istnieje. Patrz docs/specs/0051.../index.md `## Follow-up` dla dokładnego
// miejsca podłączenia.
//
// payment.paidByUserId -> users.email, FK bezpośredni (Data model sketch),
// bez przechodzenia przez order/inquiry.
export async function notifyClientOfPaymentConfirmed(paymentId: string): Promise<void> {
  try {
    const [row] = await db
      .select({ email: users.email, amountCents: payment.amountCents, currency: payment.currency })
      .from(payment)
      .innerJoin(users, eq(users.id, payment.paidByUserId))
      .where(eq(payment.id, paymentId));
    if (!row?.email) return;

    const t = await getTranslations({ locale: "pl", namespace: "PaymentConfirmedEmail" });
    const content: TransactionalEmailProps = {
      preview: t("subject"),
      heading: t("heading"),
      body: t("body", { amount: formatAmount(row.amountCents, row.currency) }),
      ctaLabel: t("cta"),
      ctaHref: `${baseUrl()}/pl/panel`,
      reference: shortReference(paymentId),
    };

    await sendNotificationEmail({
      to: row.email,
      subject: t("subject"),
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "payment_confirmed",
      entityId: paymentId,
      distinctId: paymentId,
    });
  } catch (error) {
    captureError(error, { path: "notifications:notifyClientOfPaymentConfirmed" });
  }
}
