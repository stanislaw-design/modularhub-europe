"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { trackPageview, type PageType } from "@/lib/observability/analytics-client";
import { isAnalyticsEnabled } from "@/lib/observability/analytics-enabled";
import { useAnalyticsConsent } from "./useAnalyticsConsent";

interface PageviewAttributionProps {
  pageType: Extract<PageType, "project" | "sauna" | "outdoor_tv" | "modularproject" | "producer">;
  producerId?: string;
  productId?: string;
  family?: string;
}

// Spec 0079 AC-6: strona produktu lub producenta sama podaje, czyj to ruch
// (producer_id ustawione przez stronę, nie wyliczone z adresu).
export function PageviewAttribution({ pageType, producerId, productId, family }: PageviewAttributionProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const { decision } = useAnalyticsConsent();

  useEffect(() => {
    if (!isAnalyticsEnabled() || decision !== "granted") return;
    void trackPageview({
      page_path: pathname,
      locale,
      page_type: pageType,
      ...(producerId ? { producer_id: producerId } : {}),
      ...(productId ? { product_id: productId } : {}),
      ...(family ? { family } : {}),
    });
  }, [pathname, locale, decision, pageType, producerId, productId, family]);

  return null;
}
