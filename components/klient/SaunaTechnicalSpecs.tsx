import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface SaunaTechnicalSpecsProps {
  specs?: Project["saunaTechnicalSpecs"];
}

// Dedykowany komponent na realnym, ścisłym schemacie Zod (saunaSpecsShape,
// lib/product-technical-specs.ts), nie generyczna tabela jsonb jak
// OutdoorTvTechnicalSpecs (spec 0061 AC-7): sauna ma swój własny, poprawny
// kształt danych, więc etykiety są tłumaczone, nie "zhumanizowane" z klucza.
// Każdy wiersz renderuje się niezależnie tylko gdy pole jest wypełnione (ten
// sam wzorzec co ProjectTechnicalSpecs dla "dom"); brak/wszystkie pola puste
// (produkt w statusie szkic bez wypełnionych danych) → sekcja się nie
// renderuje w ogóle.
export async function SaunaTechnicalSpecs({ specs }: SaunaTechnicalSpecsProps) {
  const t = await getTranslations("SaunaTechnicalSpecs");
  if (!specs) return null;

  const rows: { key: string; label: string; value: string }[] = [
    { key: "claddingMaterial", label: t("claddingMaterial"), value: specs.claddingMaterial },
    { key: "interiorWoodType", label: t("interiorWoodType"), value: specs.interiorWoodType },
    { key: "benchMaterial", label: t("benchMaterial"), value: specs.benchMaterial },
    { key: "insulationType", label: t("insulationType"), value: specs.insulationType },
    { key: "glazingType", label: t("glazingType"), value: specs.glazingType },
    {
      key: "seatingCapacity",
      label: t("seatingCapacity"),
      value: specs.seatingCapacity !== null ? String(specs.seatingCapacity) : "",
    },
    { key: "electricalRequirement", label: t("electricalRequirement"), value: specs.electricalRequirement },
    // hasChangingArea: tak/nie pokazuje się tylko gdy pole jest ustawione;
    // opis strefy znaczący tylko gdy hasChangingArea === true (Feature design).
    ...(specs.hasChangingArea !== null
      ? [{ key: "hasChangingArea", label: t("hasChangingArea"), value: specs.hasChangingArea ? t("yes") : t("no") }]
      : []),
    ...(specs.hasChangingArea && specs.changingAreaDescription
      ? [{ key: "changingAreaDescription", label: t("changingAreaDescription"), value: specs.changingAreaDescription }]
      : []),
  ].filter((row) => row.value.trim().length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <div className="overflow-hidden rounded-v5-card border border-brand-v5-line">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t("heading")}</caption>
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
    </div>
  );
}
