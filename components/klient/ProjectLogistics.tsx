import { getTranslations } from "next-intl/server";
import { CheckCircle2, HardHat, Info, ListChecks, Ruler } from "lucide-react";
import { Heading, Text, DataText } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import { getClientRequirementCatalogOptions } from "@/lib/producer-project-draft";

interface ProjectLogisticsProps {
  project: Project;
}

interface FieldHintProps {
  id: string;
  buttonLabel: string;
  hint: string;
}

// CSS-only (:hover / :focus-within), no client JS: ProjectLogistics stays an
// async server component, and the tooltip still opens on keyboard focus, not
// only mouse hover. aria-describedby ties the bubble to the trigger so
// screen readers announce it the same moment it becomes visible.
function FieldHint({ id, buttonLabel, hint }: FieldHintProps) {
  const tooltipId = `${id}-hint`;
  return (
    <span className="group/hint relative inline-flex">
      <button
        type="button"
        aria-label={buttonLabel}
        aria-describedby={tooltipId}
        className="focus-ring flex size-5 shrink-0 items-center justify-center rounded-full border border-brand-v5-line text-brand-v5-muted transition-colors hover:text-brand-v5-ink"
      >
        <Info className="size-3" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-data border border-brand-v5-line bg-brand-v5-night px-brand-3 py-2 text-label leading-snug text-brand-v5-paper opacity-0 shadow-lg transition-opacity duration-150 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100"
      >
        {hint}
      </span>
    </span>
  );
}

// Literalne nazwy klas (nie budowane dynamicznie) — Tailwind musi widzieć
// każdą użytą klasę w źródle. Tyle kolumn ile pól z wartością (1 albo 2,
// spec 0054 AC-5).
const FIELD_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
};

// minPlotWidthM/transportDimensions/craneRequirements usunięte (spec 0049
// AC-1, AC-3): rolę przejmuje jeden PDF specyfikacji wgrywany przez
// producenta. Sekcja traci przez to swój dawny układ "hero + siatka" (spec
// 0042 Feature design, jedna większa pozycja plus rząd mniejszych) na rzecz
// jednej prostej siatki dwóch pozostałych pól. Każde pole renderuje się
// niezależnie tylko gdy ma wartość (spec 0054 AC-5); cała sekcja znika, gdy
// nic w niej nie ma treści (AC-8).
export async function ProjectLogistics({ project }: ProjectLogisticsProps) {
  const [t, tOptions] = await Promise.all([getTranslations("ProjectLogistics"), getTranslations("ProjectOptions")]);

  const fields = [
    { icon: Ruler, label: "externalDimensionsLabel", hint: "externalDimensionsHint", value: project.externalDimensions },
    { icon: HardHat, label: "foundationOptionsLabel", hint: "foundationOptionsHint", value: project.foundationOptions },
  ].filter((field) => Boolean(field.value));

  // Spec 0050 AC-23, AC-35: puste lub brak → blok w ogóle się nie renderuje.
  // Pozycje katalogowe (custom: false) tłumaczą się przez `key` i ten sam
  // katalog opcji co kreator producenta; pozycje własne (custom: true) niosą
  // już rozwiązaną etykietę z lib/data/projects.ts.
  const catalogLabels = new Map(getClientRequirementCatalogOptions(tOptions).map((option) => [option.value, option.label]));
  const clientRequirements = project.clientRequirements ?? [];

  if (fields.length === 0 && clientRequirements.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <div className="flex flex-col gap-brand-4 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4 sm:p-brand-5">
        {fields.length > 0 && (
          <div className={`grid min-w-0 gap-brand-4 ${FIELD_GRID_COLS[fields.length] ?? "grid-cols-1"}`}>
            {fields.map(({ icon: Icon, label, hint, value }) => (
              <div key={label} className="flex min-w-0 items-start gap-brand-2">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
                  <Icon className="size-6 text-brand-v5-amber-strong" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                      {t(label)}
                    </Text>
                    <FieldHint id={label} buttonLabel={t("hintButtonLabel")} hint={t(hint)} />
                  </div>
                  <DataText surface="v5" className="text-h3 font-medium leading-snug">
                    {value}
                  </DataText>
                </div>
              </div>
            ))}
          </div>
        )}
        {clientRequirements.length > 0 && (
          <div
            className={`flex min-w-0 flex-col gap-brand-3 ${fields.length > 0 ? "border-t border-brand-v5-line pt-brand-4" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-brand-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
                <ListChecks className="size-6 text-brand-v5-amber-strong" aria-hidden="true" />
              </span>
              <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                {t("clientRequirementsHeading")}
              </Text>
            </div>
            <ul className="grid min-w-0 grid-cols-1 gap-x-brand-4 gap-y-2 sm:grid-cols-2">
              {clientRequirements.map((requirement) => (
                <li key={requirement.id} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-v5-amber-strong" aria-hidden="true" />
                  <Text surface="v5">
                    {requirement.custom || requirement.key === null
                      ? requirement.label
                      : (catalogLabels.get(requirement.key) ?? requirement.label)}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
