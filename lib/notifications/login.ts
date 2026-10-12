import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { parseGuestLinkVariant } from "./login-callback";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// AC-9, AC-11: branded szablon React Email, wspólny sender z pozostałymi
// czterema zdarzeniami. AC-10: w przeciwieństwie do nich, błąd wysyłki NIE
// jest best effort — throwOnFailure rzuca dalej, żeby auth.ts (wywołujący,
// przez sendVerificationRequest) pokazał ekran błędu Auth.js, bo to jedyna
// droga dostarczenia magic linku. Wydzielone z auth.ts, bo ten plik nie ładuje
// się pod Vitest (next-auth's env.js robi bare `import "next/server"`).
//
// Spec 0066 AC-7, AC-10, AC-16: link z zapytania gościa ma marker `welcome` w
// adresie powrotu. Wtedy treść jest stała, w języku sprawy, bez pól wpisanych
// przez gościa, a w analityce identyfikatorem jest id sprawy, nigdy e mail.
export async function sendLoginLinkEmail(input: { identifier: string; url: string }): Promise<void> {
  const guest = parseGuestLinkVariant(input.url);
  const t = await getTranslations({
    locale: guest?.locale ?? "pl",
    namespace: guest ? (guest.variant === "new" ? "GuestLinkNewEmail" : "GuestLinkExistingEmail") : "LoginLinkEmail",
  });
  const content: TransactionalEmailProps = {
    preview: t("subject"),
    heading: t("heading"),
    body: t("body"),
    ctaLabel: t("cta"),
    ctaHref: input.url,
    ...(guest ? { reference: shortReference(guest.inquiryId) } : {}),
  };

  await sendNotificationEmail({
    to: input.identifier,
    subject: t("subject"),
    html: await render(TransactionalEmail(content)),
    text: renderTransactionalEmailText(content),
    emailType: "login_link",
    entityId: guest?.inquiryId ?? input.identifier,
    distinctId: guest?.inquiryId ?? input.identifier,
    // "Czy to Ty" (AC-10): odpowiedź trafia do zespołu.
    replyTo: guest?.variant === "existing" ? process.env.SUPPORT_REPLY_TO_EMAIL || undefined : undefined,
    throwOnFailure: true,
  });
}
