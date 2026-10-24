import { Anchor, BadgeCheck, FileText, Move } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import type { ProductEnvelopeParameter } from "@/lib/data/types";
import {
  ENVELOPE_UNIT,
  FLOOR_AREA_NOTE_MAX_M2,
  FLOOR_AREA_NOTE_MIN_M2,
  envelopeSymbol,
  type FoundationStatus,
} from "@/lib/product-envelope-parameters";

interface ProjectEnvelopeParametersProps {
  parameters: ProductEnvelopeParameter[];
  foundationStatus?: FoundationStatus | null;
  floorAreaM2?: number | null;
  locale: string;
}

// Spec 0075 AC-11, AC-12, AC-14, AC-17: liczby izolacji przegród z jednostką,
// metodą, datą i stanem potwierdzenia. Stan niesie tekst i ikona, nigdy sam
// kolor. Sekcja nigdzie nie wnioskuje zgodności z przepisami z samych liczb.
// Brak wierszy → sekcja się nie renderuje. Przełącznik ENVELOPE_SECTION_ENABLED
// stoi po stronie strony produktu, nie tutaj.
export async function ProjectEnvelopeParameters({
  parameters,
  foundationStatus,
  floorAreaM2,
  locale,
}: ProjectEnvelopeParametersProps) {
  if (parameters.length === 0) return null;
  const t = await getTranslations("EnvelopeParameters");
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const numberFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 3 });

  const showAreaNote =
    typeof floorAreaM2 === "number" && floorAreaM2 >= FLOOR_AREA_NOTE_MIN_M2 && floorAreaM2 <= FLOOR_AREA_NOTE_MAX_M2;

  return (
    <section className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <Text tone="muted" surface="v5">
        {t("intro")}
      </Text>

      {foundationStatus ? (
        <div className="flex flex-col gap-brand-1">
          <span className="flex items-center gap-brand-1">
            {foundationStatus === "permanent" ? (
              <Anchor className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
            ) : (
              <Move className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
            )}
            <Text as="span" surface="v5" className="text-data font-medium">
              {t(`foundation.${foundationStatus}`)}
            </Text>
          </span>
          <Text tone="muted" surface="v5" className="text-data">
            {t(`explain.${foundationStatus}`)}
          </Text>
        </div>
      ) : null}

      <ul className="flex flex-col gap-brand-3">
        {parameters.map((parameter) => {
          const symbol = envelopeSymbol(parameter.element, parameter.quantity);
          const confirmed = parameter.confirmed && parameter.confirmedAt !== null;
          const asOfDate = dateFormatter.format(new Date(`${parameter.asOfDate}T00:00:00Z`));
          return (
            <li
              key={`${parameter.element}-${parameter.quantity}`}
              className="flex flex-col gap-brand-1 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-brand-2">
                <Text as="span" surface="v5" className="text-body font-semibold">
                  {t(`element.${parameter.element}.label`)}
                </Text>
                <Text as="span" surface="v5" className="text-body font-semibold">
                  {t("valueLabel", {
                    symbol,
                    value: numberFormatter.format(parameter.value),
                    unit: ENVELOPE_UNIT[parameter.quantity],
                  })}
                </Text>
              </div>
              <Text tone="muted" surface="v5" className="text-data">
                {t(`element.${parameter.element}.description`)}
              </Text>
              <Text tone="muted" surface="v5" className="text-data">
                {t("methodLabel")}: {t(`method.${parameter.method}`)}
                {parameter.methodNote ? ` (${parameter.methodNote})` : null}
                {" · "}
                {t("asOf", { date: asOfDate })}
              </Text>
              {confirmed ? (
                <span className="flex items-center gap-brand-1">
                  <BadgeCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text as="span" tone="muted" surface="v5" className="text-data">
                    {t("status.confirmed")}
                  </Text>
                </span>
              ) : (
                <span className="flex items-center gap-brand-1">
                  <FileText className="size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
                  <Text as="span" tone="muted" surface="v5" className="text-data">
                    {t("status.declared")}
                  </Text>
                </span>
              )}
              {confirmed ? (
                <Text tone="muted" surface="v5" className="text-data">
                  {t("status.confirmedHelp")}
                </Text>
              ) : null}
              <details className="text-data">
                <summary className="focus-ring cursor-pointer rounded-data text-brand-passage-blue underline">
                  {t("whatItMeans")}
                </summary>
                <div className="mt-brand-1 flex flex-col gap-brand-1">
                  <Text tone="muted" surface="v5" className="text-data">
                    {t(parameter.quantity === "rc_value" ? "explain.rc" : "explain.u")}
                  </Text>
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("explain.notEqual")}
                  </Text>
                  {parameter.element === "glazing" || parameter.element === "window" ? (
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("explain.ug")}
                    </Text>
                  ) : null}
                  {parameter.element === "door" ? (
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("explain.ud")}
                    </Text>
                  ) : null}
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("explain.asOf")}
                  </Text>
                  <Text tone="muted" surface="v5" className="text-data">
                    {t(confirmed ? "explain.confirmed" : "explain.declared")}
                  </Text>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {showAreaNote ? (
        <Text tone="muted" surface="v5" className="text-data">
          {t("areaNote")}
        </Text>
      ) : null}
      <Text tone="muted" surface="v5" className="text-data">
        {t("disclaimer")}
      </Text>
    </section>
  );
}
