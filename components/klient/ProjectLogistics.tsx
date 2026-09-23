import { getTranslations } from "next-intl/server";
import { HardHat, ListChecks, Ruler } from "lucide-react";
import { Heading, StatusPill, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import { getClientRequirementCatalogOptions } from "@/lib/producer-project-draft";

interface ProjectLogisticsProps {
  project: Project;
}

// minPlotWidthM/transportDimensions/craneRequirements usunięte (spec 0049
// AC-1, AC-3): rolę przejmuje jeden PDF specyfikacji wgrywany przez
// producenta. Sekcja traci przez to swój dawny układ "hero + siatka" (spec
// 0042 Feature design, jedna większa pozycja plus rząd mniejszych) na rzecz
// jednej prostej siatki dwóch pozostałych pól. Sekcja renderuje się zawsze;
// pole bez wartości pokazuje jawny placeholder zamiast znikać (AC-4).
export async function ProjectLogistics({ project }: ProjectLogisticsProps) {
  const [t, tOptions] = await Promise.all([getTranslations("ProjectLogistics"), getTranslations("ProjectOptions")]);

  const fields = [
    { icon: Ruler, label: "externalDimensionsLabel", value: project.externalDimensions },
    { icon: HardHat, label: "foundationOptionsLabel", value: project.foundationOptions },
  ];

  // Spec 0050 AC-23, AC-35: puste lub brak → blok w ogóle się nie renderuje
  // (w odróżnieniu od pól wyżej, które zawsze pokazują siebie albo
  // placeholder). Pozycje katalogowe (custom: false) tłumaczą się przez `key`
  // i ten sam katalog opcji co kreator producenta; pozycje własne (custom:
  // true) niosą już rozwiązaną etykietę z lib/data/projects.ts.
  const catalogLabels = new Map(getClientRequirementCatalogOptions(tOptions).map((option) => [option.value, option.label]));
  const clientRequirements = project.clientRequirements ?? [];

  return (
    <div className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <div className="flex flex-col gap-brand-4 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4 sm:p-brand-5">
        <div className="grid min-w-0 grid-cols-1 gap-brand-4 sm:grid-cols-2">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex min-w-0 items-start gap-brand-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
                <Icon className="size-6 text-brand-v5-amber-strong" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                  {t(label)}
                </Text>
                {value ? <Text surface="v5">{value}</Text> : <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>}
              </div>
            </div>
          ))}
        </div>
        {clientRequirements.length > 0 && (
          <div className="flex min-w-0 items-start gap-brand-2 border-t border-brand-v5-line pt-brand-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
              <ListChecks className="size-6 text-brand-v5-amber-strong" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                {t("clientRequirementsHeading")}
              </Text>
              <ul className="flex flex-col gap-1">
                {clientRequirements.map((requirement) => (
                  <li key={requirement.id}>
                    <Text surface="v5">
                      {requirement.custom || requirement.key === null
                        ? requirement.label
                        : (catalogLabels.get(requirement.key) ?? requirement.label)}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
