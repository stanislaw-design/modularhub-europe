"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { closeConsentSettings, writeConsent } from "@/lib/observability/analytics-consent";
import { isAnalyticsEnabled } from "@/lib/observability/analytics-enabled";
import { Button } from "@/components/ui";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

// Spec 0079 AC-3: równorzędne przyciski, link do polityki, decyzję można
// zmienić z linku w stopce (ConsentSettingsLink).
export function ConsentBanner() {
  const t = useTranslations("ConsentBanner");
  const { decision, settingsOpen, hydrated } = useAnalyticsConsent();

  if (!hydrated || !isAnalyticsEnabled()) return null;
  if (decision !== null && !settingsOpen) return null;

  return (
    <section
      role="region"
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-marketing border border-brand-steel bg-brand-warm-white p-brand-3 text-brand-foundation-navy shadow-lg sm:inset-x-6"
    >
      <h2 id="consent-banner-title" className="text-body font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1 text-data">
        {t("text")}{" "}
        <Link href="/privacy" className="focus-ring rounded-data underline underline-offset-4">
          {t("privacyLink")}
        </Link>
      </p>
      {decision && <p className="mt-1 text-data font-medium">{t(decision === "granted" ? "currentGranted" : "currentDenied")}</p>}
      <div className="mt-brand-2 flex flex-col gap-brand-1 sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={() => writeConsent("granted")}>
          {t("accept")}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => writeConsent("denied")}>
          {t("decline")}
        </Button>
        {decision && (
          <Button variant="ghost" onClick={closeConsentSettings}>
            {t("close")}
          </Button>
        )}
      </div>
    </section>
  );
}
