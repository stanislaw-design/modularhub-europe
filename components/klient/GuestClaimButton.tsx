"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { requestAccountForGuestCase } from "@/lib/guest-case-actions";

// Przycisk "załóż konto" ze strony claim (spec 0066 AC-7, AC-8). Akcja zawsze
// odpowiada tak samo, więc komunikat nie zdradza, czy konto istnieje.
export function GuestClaimButton({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("InquiryClaim");
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  if (state === "sent") {
    return (
      <p className="font-sans text-body text-brand-v5-ink" role="status">
        {t("sent")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-brand-3">
      {state === "error" && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {t("error")}
        </p>
      )}
      <Button
        type="button"
        surface="v5"
        size="lg"
        className="w-fit"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestAccountForGuestCase({ inquiryId, locale });
            setState(result.ok ? "sent" : "error");
          })
        }
      >
        {isPending ? t("sending") : state === "error" ? t("retry") : t("cta")}
      </Button>
    </div>
  );
}
