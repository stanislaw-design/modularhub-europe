"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { ATTRIBUTED_PAGE_TYPES, pageTypeFromPath, startAnalytics, stopAnalytics, trackPageview } from "@/lib/observability/analytics-client";
import { isAnalyticsEnabled } from "@/lib/observability/analytics-enabled";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

// Spec 0079: ogólny tracker w layoucie (customer). Jedno `$pageview` na zmianę
// trasy. Strony szczegółu (produkt, producent) pomija: wysyła je komponent
// atrybucji tej strony z producer_id.
export function AnalyticsTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const { decision } = useAnalyticsConsent();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (decision === "granted") {
      void startAnalytics();
    } else if (decision === "denied") {
      void stopAnalytics();
    }
  }, [decision]);

  useEffect(() => {
    if (!isAnalyticsEnabled() || decision !== "granted") return;
    const pageType = pageTypeFromPath(pathname);
    if (ATTRIBUTED_PAGE_TYPES.has(pageType)) return;
    void trackPageview({ page_path: pathname, locale, page_type: pageType });
  }, [pathname, locale, decision]);

  return null;
}
