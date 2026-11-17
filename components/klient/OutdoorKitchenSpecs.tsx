import { Check, Minus, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import {
  OUTDOOR_KITCHEN_EQUIPMENT_KEYS,
  type OutdoorKitchenEquipmentState,
  type OutdoorKitchenTechnicalSpecs,
} from "@/lib/product-technical-specs";

// Wymiary w formacie "D × S × W cm" (spec 0086 AC-7): brakujący wymiar się opuszcza, więc
// zestaw Premium z samą długością pokazuje "300 cm". Liczby w formacie języka strony.
export function formatKitchenDimensions(
  dimensions: { length: number; width?: number; height?: number },
  locale: string,
): string {
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const parts = [dimensions.length, dimensions.width, dimensions.height].filter(
    (value): value is number => typeof value === "number",
  );
  return `${parts.map((value) => format.format(value)).join(" × ")} cm`;
}

const STATE_ICON: Record<OutdoorKitchenEquipmentState, typeof Check> = {
  included: Check,
  extra: Plus,
  none: Minus,
};

const STATE_TONE: Record<OutdoorKitchenEquipmentState, string> = {
  included: "text-brand-v5-ink",
  extra: "text-brand-v5-ink",
  none: "text-brand-v5-muted",
};

interface SpecsRow {
  key: string;
  label: string;
  value: string;
}

function SpecsTable({ caption, rows }: { caption: string; rows: SpecsRow[] }) {
  return (
    <div className="overflow-hidden rounded-v5-card border border-brand-v5-line">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-brand-v5-line/50 odd:bg-brand-v5-surface last:border-b-0">
              <th scope="row" className="w-1/2 p-brand-3 align-top sm:w-2/5">
                <Text as="span" variant="label" tone="muted" surface="v5">
                  {row.label}
                </Text>
              </th>
              <td className="p-brand-3 align-top">
                <Text as="span" surface="v5" className="font-semibold">
                  {row.value}
                </Text>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface OutdoorKitchenSpecsProps {
  specs: OutdoorKitchenTechnicalSpecs;
  locale: string;
}

// Sekcja "Wymiary i wyposażenie" (spec 0086 AC-7). Etykiety wyposażenia i stanów pochodzą
// z messages i są kluczowane po wartości enum, nigdy po tekście. Stan to ikona plus tekst,
// nie sam kolor (WCAG).
export async function OutdoorKitchenSpecs({ specs, locale }: OutdoorKitchenSpecsProps) {
  const t = await getTranslations({ locale, namespace: "OutdoorKitchenSpecs" });

  const rows: SpecsRow[] = [
    {
      key: "externalDimensions",
      label: t("externalDimensions"),
      value: formatKitchenDimensions(specs.externalDimensionsCm, locale),
    },
    ...(specs.internalDimensionsCm
      ? [
          {
            key: "internalDimensions",
            label: t("internalDimensions"),
            value: formatKitchenDimensions(specs.internalDimensionsCm, locale),
          },
        ]
      : []),
    {
      key: "bodyMaterial",
      label: t("bodyMaterial"),
      value: specs.bodyMaterial,
    },
    ...(specs.worktopMaterial
      ? [
          {
            key: "worktopMaterial",
            label: t("worktopMaterial"),
            value: specs.worktopMaterial,
          },
        ]
      : []),
    {
      key: "closable",
      label: t("closable"),
      value: specs.closable ? t("yes") : t("no"),
    },
  ];

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <SpecsTable caption={t("heading")} rows={rows} />

      <Heading level="h3" surface="v5" className="text-body-l">
        {t("equipmentHeading")}
      </Heading>
      <ul className="grid gap-brand-2 sm:grid-cols-2">
        {OUTDOOR_KITCHEN_EQUIPMENT_KEYS.map((key) => {
          const state = specs.equipment[key];
          const Icon = STATE_ICON[state];
          return (
            <li
              key={key}
              className="flex items-center justify-between gap-brand-2 rounded-v5-card border border-brand-v5-line p-brand-3"
            >
              <Text as="span" surface="v5" className="font-semibold">
                {t(`equipment.${key}`)}
              </Text>
              <span className={`inline-flex items-center gap-1 text-data ${STATE_TONE[state]}`}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {t(`equipmentState.${state}`)}
              </span>
            </li>
          );
        })}
      </ul>

      <Heading level="h3" surface="v5" className="text-body-l">
        {t("standardHeading")}
      </Heading>
      <ul className="flex flex-col gap-brand-1">
        {specs.standardFeatures.map((feature) => (
          <li key={feature} className="flex items-start gap-brand-2">
            <Check className="mt-1 size-4 shrink-0 text-brand-v5-ink" aria-hidden="true" />
            <Text as="span" surface="v5">
              {feature}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Sekcja "Dostawa i montaż" (spec 0086 AC-9): deliveryNote zawsze, waga i wymóg podłoża tylko
// gdy są w danych. Bez żadnych danych nie renderuje się wcale.
export async function OutdoorKitchenDelivery({ specs, locale }: OutdoorKitchenSpecsProps) {
  const t = await getTranslations({ locale, namespace: "OutdoorKitchenSpecs" });
  const weight = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const rows: SpecsRow[] = [
    {
      key: "deliveryNote",
      label: t("deliveryNote"),
      value: specs.deliveryNote,
    },
    ...(specs.weightKg !== undefined
      ? [
          {
            key: "weightKg",
            label: t("weight"),
            value: `${weight.format(specs.weightKg)} kg`,
          },
        ]
      : []),
    ...(specs.foundationRequirement
      ? [
          {
            key: "foundationRequirement",
            label: t("foundation"),
            value: specs.foundationRequirement,
          },
        ]
      : []),
  ].filter((row) => row.value.trim().length > 0);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("deliveryHeading")}
      </Heading>
      <SpecsTable caption={t("deliveryHeading")} rows={rows} />
    </div>
  );
}
