import { useTranslations } from "next-intl";
import { Heading, Stack, Text } from "@/components/ui";
import type { CaseView } from "@/lib/cases/queries";

function formatConfigPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

// Etap, kto ma następny ruch i oczekiwany czas pierwszej odpowiedzi (spec 0048
// AC-5), dane zapytania i stały komunikat o prowizji w stopce (AC-29).
// Etykiety są w katalogu tłumaczeń, nie w komponencie.
export function CaseStatusPanel({ view, dateLabel }: { view: CaseView; dateLabel: string }) {
  const t = useTranslations("CaseStatus");
  const plotLine = [view.plot.street, [view.plot.postalCode, view.plot.city].filter(Boolean).join(" "), view.plot.countryCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading level="h1" surface="v5">
          {t("title")}
        </Heading>
        <Text tone="muted" surface="v5">
          {view.productNames.join(", ") || "—"}
        </Text>
      </Stack>
      <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-brand-3 gap-y-1 rounded-v5-card border border-brand-v5-line p-brand-3">
        <Text as="dt" surface="v5" tone="muted">
          {t("stageLabel")}
        </Text>
        <Text as="dd" surface="v5" className="font-medium">
          {t(`stage.${view.stage}`)}
        </Text>
        {view.waitingOn && (
          <>
            <Text as="dt" surface="v5" tone="muted">
              {t("nextMoveLabel")}
            </Text>
            <Text as="dd" surface="v5">
              {t(`waiting.${view.waitingOn}`)}
            </Text>
          </>
        )}
        <Text as="dt" surface="v5" tone="muted">
          {t("plotLabel")}
        </Text>
        <Text as="dd" surface="v5">
          {plotLine}
        </Text>
        <Text as="dt" surface="v5" tone="muted">
          {t("sentLabel")}
        </Text>
        <Text as="dd" surface="v5">
          {dateLabel}
        </Text>
        {view.clientMessage && (
          <>
            <Text as="dt" surface="v5" tone="muted">
              {t("yourMessageLabel")}
            </Text>
            <Text as="dd" surface="v5" className="whitespace-pre-wrap break-words">
              {view.clientMessage}
            </Text>
          </>
        )}
      </dl>
      {view.configurations.map(({ productName, snapshot }) => (
        <section key={snapshot.capturedAt + productName} className="flex max-w-xl flex-col gap-brand-1 rounded-v5-card border border-brand-v5-line p-brand-3">
          <Heading level="h2" surface="v5" className="text-h4">
            {t("configurationHeading", { product: productName })}
          </Heading>
          <ul className="flex flex-col gap-1">
            {snapshot.variantLabel && (
              <li>
                <Text as="span" tone="muted" surface="v5">{t("configurationVariant")}: </Text>
                {snapshot.variantLabel}
              </li>
            )}
            {snapshot.options.map((option) => (
              <li key={option.optionId}>
                <Text as="span" tone="muted" surface="v5">{option.groupName}: </Text>
                {option.label}
                {" "}
                <Text as="span" tone="muted" surface="v5">
                  ({option.priceOnRequest || option.priceCents === null ? t("configurationPriceOnRequest") : `+${formatConfigPrice(option.priceCents, snapshot.currency)}`})
                </Text>
              </li>
            ))}
            {snapshot.style && (
              <li>
                <Text as="span" tone="muted" surface="v5">{t("configurationStyle")}: </Text>
                {snapshot.style.name}
              </li>
            )}
          </ul>
          {snapshot.totalPriceCents !== null && (
            <Text as="p" surface="v5" className="font-semibold">
              {t(snapshot.totalIsFrom ? "configurationTotalFrom" : "configurationTotal", { total: formatConfigPrice(snapshot.totalPriceCents, snapshot.currency) })}
            </Text>
          )}
        </section>
      ))}
      {view.stage === "nowe" && (
        <Text tone="muted" surface="v5">
          {t("firstReplyExpectation")}
        </Text>
      )}
    </Stack>
  );
}

export function CaseCommissionFooter() {
  const t = useTranslations("CaseStatus");
  return (
    <Text as="p" tone="muted" surface="v5" className="max-w-xl border-t border-brand-v5-line pt-brand-2 text-data">
      {t("commissionNotice")}
    </Text>
  );
}
