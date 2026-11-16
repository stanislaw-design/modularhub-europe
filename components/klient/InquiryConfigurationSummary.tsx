"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ConfigurationSnapshot } from "@/lib/configuration-snapshot";

function formatCents(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

// Spec 0084 AC-8: wybrana konfiguracja tylko do odczytu. Niczego nie zmienia w
// tym, co zapisuje serwer: migawka dla doradcy powstaje tam z identyfikatorów.
export function InquiryConfigurationSummary({ snapshot }: { snapshot: ConfigurationSnapshot }) {
  const t = useTranslations("InquiryFlow");
  const locale = useLocale();

  return (
    <section aria-labelledby="inquiry-config-heading" className="flex flex-col gap-brand-1" data-testid="configuration-summary">
      <h3 id="inquiry-config-heading" className="font-sans text-body font-medium text-brand-v5-ink">
        {t("configurationHeading")}
      </h3>
      <dl className="flex flex-col gap-brand-1 text-data text-brand-v5-ink">
        {snapshot.variantLabel ? (
          <div className="flex justify-between gap-brand-3">
            <dt>{t("configurationVariant")}</dt>
            <dd className="text-right font-medium">{snapshot.variantLabel}</dd>
          </div>
        ) : null}
        {snapshot.options.map((option) => (
          <div key={option.optionId} className="flex justify-between gap-brand-3">
            <dt>{option.groupName}: {option.label}</dt>
            <dd className="text-right">
              {option.priceOnRequest || option.priceCents === null
                ? t("configurationPriceOnRequest")
                : formatCents(option.priceCents, snapshot.currency, locale)}
            </dd>
          </div>
        ))}
        {snapshot.style ? (
          <div className="flex justify-between gap-brand-3">
            <dt>{t("configurationStyle")}</dt>
            <dd className="text-right font-medium">{snapshot.style.name}</dd>
          </div>
        ) : null}
        {snapshot.totalPriceCents !== null ? (
          <div className="flex justify-between gap-brand-3 border-t border-brand-v5-line pt-brand-1 font-medium">
            <dt>{t("configurationTotal")}</dt>
            <dd className="text-right">
              {snapshot.totalIsFrom ? t("configurationFrom", { price: formatCents(snapshot.totalPriceCents, snapshot.currency, locale) }) : formatCents(snapshot.totalPriceCents, snapshot.currency, locale)}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
