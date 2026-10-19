"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
// Importuje lib/observability/errors wprost, nie barrel: barrel ciągnie wrapper PostHog tylko
// dla serwera i zepsułby paczkę komponentu klienckiego (wzór z app/global-error.tsx).
import { captureError } from "@/lib/observability/errors";

// Granica błędu dla całej grupy tras klienta (spec 0073 AC-10). Panele i producent mają
// własne layouty i poza zakresem.
export default function CustomerError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ErrorPage");
  const locale = useLocale();

  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-brand-3 py-brand-7 text-center">
      <h1 className="text-h2 font-semibold text-brand-v5-ink">{t("heading")}</h1>
      <p className="max-w-prose text-body text-brand-v5-muted">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-brand-2">
        <button
          type="button"
          onClick={() => retry()}
          className="focus-ring rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
        >
          {t("retry")}
        </button>
        <Link
          href={`/${locale}`}
          className="focus-ring rounded-v5-pill border border-brand-v5-line px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-ink hover:bg-brand-v5-line/60"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
