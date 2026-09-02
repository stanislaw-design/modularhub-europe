import type { ReactNode } from "react";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  COMPLETION_STANDARD_OPTIONS,
  PERGOLA_SUBCATEGORY_OPTIONS,
  PRODUCT_FAMILY_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  SPA_SUBCATEGORY_OPTIONS,
  TECHNICAL_FIELDS_BY_FAMILY,
} from "@/lib/producer-project-draft";

interface ProjectWizardSummaryStepProps {
  draft: ProjectDraft;
  countries: Country[];
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text as="dt" variant="label" tone="muted">
        {label}
      </Text>
      <Text as="dd">{value}</Text>
    </Stack>
  );
}

function SummaryGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Heading level="h3">{title}</Heading>
      <Card as="dl" padding="md">
        <Stack gap={3}>{children}</Stack>
      </Card>
    </Stack>
  );
}

function subcategoryLabel(draft: ProjectDraft): string {
  switch (draft.family) {
    case "dom":
      return PROJECT_CATEGORY_OPTIONS.find((option) => option.value === draft.category)?.label ?? "—";
    case "spa-modulowe":
      return SPA_SUBCATEGORY_OPTIONS.find((option) => option.value === draft.spaSubcategory)?.label ?? "—";
    case "pergola":
      return (
        PERGOLA_SUBCATEGORY_OPTIONS.find((option) => option.value === draft.pergolaSubcategory)?.label ?? "—"
      );
    case null:
      return "—";
  }
}

export function ProjectWizardSummaryStep({ draft, countries }: ProjectWizardSummaryStepProps) {
  const countryName =
    countries.find((country) => country.code === draft.countryOfProduction)?.name ?? "—";
  const familyLabel = PRODUCT_FAMILY_OPTIONS.find((option) => option.value === draft.family)?.label ?? "—";

  return (
    <Stack gap={4}>
      <Heading level="h2">Podsumowanie</Heading>
      <Text tone="muted">Sprawdź wszystkie dane przed zapisaniem projektu.</Text>

      <SummaryGroup title="Informacje podstawowe">
        <SummaryRow label="Nazwa projektu" value={draft.name} />
        <SummaryRow label="Metraż" value={draft.floorAreaM2 !== null ? `${draft.floorAreaM2} m²` : "—"} />
        <SummaryRow label="Liczba sypialni" value={draft.bedrooms !== null ? String(draft.bedrooms) : "—"} />
        <SummaryRow label="Kraj produkcji" value={countryName} />
        <SummaryRow label="Opis" value={draft.description} />
        <SummaryRow label="Rodzina produktu" value={familyLabel} />
        <SummaryRow label="Podkategoria" value={subcategoryLabel(draft)} />
      </SummaryGroup>

      {draft.family !== null && (
        <SummaryGroup title="Dane techniczne">
          {TECHNICAL_FIELDS_BY_FAMILY[draft.family].map((field) => {
            const value = draft.technicalSpecs[field.key];
            const displayValue =
              field.type === "select"
                ? field.options?.find((option) => option.value === value)?.label ?? "—"
                : value !== undefined && value !== "" && value !== null
                  ? String(value)
                  : "—";
            return <SummaryRow key={field.key} label={field.label} value={displayValue} />;
          })}
        </SummaryGroup>
      )}

      <SummaryGroup title="Cena i sprzedaż">
        <SummaryRow
          label="Cena domu"
          value={
            draft.housePriceMinEur !== null && draft.housePriceMaxEur !== null
              ? `${draft.housePriceMinEur}–${draft.housePriceMaxEur} EUR`
              : "—"
          }
        />
        <SummaryRow
          label="Standard wykończenia"
          value={
            COMPLETION_STANDARD_OPTIONS.find((option) => option.value === draft.completionStandard)?.label ??
            "—"
          }
        />
        <SummaryRow
          label="Termin produkcji"
          value={
            draft.productionLeadTimeWeeksMin !== null && draft.productionLeadTimeWeeksMax !== null
              ? `${draft.productionLeadTimeWeeksMin}–${draft.productionLeadTimeWeeksMax} tyg.`
              : "—"
          }
        />
        <SummaryRow
          label="Czas montażu"
          value={
            draft.onSiteAssemblyDaysMin !== null && draft.onSiteAssemblyDaysMax !== null
              ? `${draft.onSiteAssemblyDaysMin}–${draft.onSiteAssemblyDaysMax} dni`
              : "—"
          }
        />
        <SummaryRow
          label="Gwarancja konstrukcyjna"
          value={draft.structuralWarrantyYears !== null ? `${draft.structuralWarrantyYears} lat` : "—"}
        />
      </SummaryGroup>

      <Stack gap={2}>
        <Heading level="h3">Pliki</Heading>
        <Card padding="md">
          <Stack gap={3}>
            <Stack gap={1}>
              <Text variant="label" tone="muted">
                Rzuty ({draft.floorPlanFiles.length})
              </Text>
              <ul className="flex flex-col gap-1">
                {draft.floorPlanFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <DataText tone="muted">{file.name}</DataText>
                  </li>
                ))}
              </ul>
            </Stack>
            <Stack gap={1}>
              <Text variant="label" tone="muted">
                Zdjęcia ({draft.photoFiles.length})
              </Text>
              <ul className="flex flex-col gap-1">
                {draft.photoFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <DataText tone="muted">{file.name}</DataText>
                  </li>
                ))}
              </ul>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}
