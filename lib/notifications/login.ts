import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { sendNotificationEmail } from "./send";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// AC-9, AC-11: branded szablon React Email, wspólny sender z pozostałymi
// czterema zdarzeniami. AC-10: w przeciwieństwie do nich, błąd wysyłki NIE
// jest best effort — throwOnFailure rzuca dalej, żeby auth.ts (wywołujący,
// przez sendVerificationRequest) pokazał ekran błędu Auth.js, bo to jedyna
// droga dostarczenia magic linku. Wydzielone z auth.ts, bo ten plik nie ładuje
// się pod Vitest (next-auth's env.js robi bare `import "next/server"`).
export async function sendLoginLinkEmail(input: { identifier: string; url: string }): Promise<void> {
  const t = await getTranslations({ locale: "pl", namespace: "LoginLinkEmail" });
  const content: TransactionalEmailProps = {
    preview: t("subject"),
    heading: t("heading"),
    body: t("body"),
    ctaLabel: t("cta"),
    ctaHref: input.url,
  };

  await sendNotificationEmail({
    to: input.identifier,
    subject: t("subject"),
    html: await render(TransactionalEmail(content)),
    text: renderTransactionalEmailText(content),
    emailType: "login_link",
    entityId: input.identifier,
    distinctId: input.identifier,
    throwOnFailure: true,
  });
}
