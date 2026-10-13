"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Text } from "@/components/ui";
import { requestPanelLoginLink } from "@/lib/panel-login-link-actions";
import { BULK_REQUEST_EMAIL_LIMIT } from "@/lib/project-request-specs";

interface BulkRequestLimitMessageProps {
  locale: string;
  contactEmail: string;
}

// Spec 0070 AC-39: komunikat o limicie trzech zapytań o duże zamówienie na e mail. Liczba
// jest stała (trzy z trzech), bo wyzwalacz zgłasza błąd dopiero przy trzech. Prowadzi do
// listy w panelu, a gościowi bez konta daje przycisk z linkiem logującym (odpowiedź
// neutralna, taka sama dla każdego adresu).
export function BulkRequestLimitMessage({ locale, contactEmail }: BulkRequestLimitMessageProps) {
  const t = useTranslations("BulkRequestLimitMessage");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      await requestPanelLoginLink(contactEmail, locale);
      setSent(true);
    });
  }

  return (
    <div className="flex flex-col gap-brand-2" role="alert">
      <Text surface="v5" className="text-status-blocked">
        {t("text", { count: BULK_REQUEST_EMAIL_LIMIT, max: BULK_REQUEST_EMAIL_LIMIT })}
      </Text>
      <a href={`/${locale}/panel/quotes`} className="focus-ring w-fit rounded-data font-medium text-brand-v5-amber-strong underline">
        {t("listLink")}
      </a>
      <Text surface="v5" tone="muted">
        {t("guestHint")}
      </Text>
      {sent ? (
        <Text surface="v5">{t("sent")}</Text>
      ) : (
        <Button type="button" variant="secondary" surface="v5" size="sm" onClick={handleSend} disabled={isPending || contactEmail.trim().length === 0}>
          {isPending ? t("sending") : t("sendLink")}
        </Button>
      )}
    </div>
  );
}
