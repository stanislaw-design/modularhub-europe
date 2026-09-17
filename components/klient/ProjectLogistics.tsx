import { getTranslations } from "next-intl/server";
import { HardHat, LandPlot, Ruler, TowerControl, Truck } from "lucide-react";
import { DataText, Heading, StatusPill, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface ProjectLogisticsProps {
  project: Project;
}

// Ten sam zróżnicowany układ co pasek kluczowych danych w hero (jedna
// większa pozycja plus rząd mniejszych, spec 0042 Feature design): minimalna
// szerokość działki jest tu pytaniem "czy dostawa jest w ogóle możliwa",
// więc dostaje osobne, większe miejsce. Sekcja renderuje się zawsze (żeby
// klient widział cały nowy układ strony); pole bez wartości pokazuje jawny
// placeholder zamiast znikać, świadome odejście od pierwotnego AC-5.
export async function ProjectLogistics({ project }: ProjectLogisticsProps) {
  const t = await getTranslations("ProjectLogistics");

  const smallFields = [
    { icon: Ruler, label: "externalDimensionsLabel", value: project.externalDimensions },
    { icon: HardHat, label: "foundationOptionsLabel", value: project.foundationOptions },
    { icon: Truck, label: "transportDimensionsLabel", value: project.transportDimensions },
    { icon: TowerControl, label: "craneRequirementsLabel", value: project.craneRequirements },
  ];

  return (
    <div className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <div className="flex flex-col gap-brand-4 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4 sm:p-brand-5">
        <div className="flex items-center gap-brand-3 border-b border-brand-v5-line pb-brand-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-data bg-brand-v5-night">
            <LandPlot className="size-8 text-brand-v5-paper" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            {project.minPlotWidthM !== undefined ? (
              <DataText surface="v5" className="text-h2 font-black leading-none">
                {t("minPlotWidthValue", { width: project.minPlotWidthM })}
              </DataText>
            ) : (
              <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
            )}
            <Text variant="label" tone="muted" surface="v5" className="font-semibold">
              {t("minPlotWidthLabel")}
            </Text>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-brand-4 sm:grid-cols-2">
          {smallFields.map(({ icon: Icon, label, value }) => (
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
      </div>
    </div>
  );
}
