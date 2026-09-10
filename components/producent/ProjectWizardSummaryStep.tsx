import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  getCompletionStandardOptions,
  getPergolaSubcategoryOptions,
  getProductFamilyOptions,
  getProjectCategoryOptions,
  getSpaSubcategoryOptions,
  getTechnicalFieldsByFamily,
} from "@/lib/producer-project-draft";

type Translate = ReturnType<typeof useTranslations>;

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

function subcategoryLabel(draft: ProjectDraft, tOptions: Translate, empty: string): string {
  switch (draft.family) {
    case "dom":
      return getProjectCategoryOptions(tOptions).find((option) => option.value === draft.category)?.label ?? empty;
    case "spa-modulowe":
      return (
        getSpaSubcategoryOptions(tOptions).find((option) => option.value === draft.spaSubcategory)?.label ?? empty
      );
    case "pergola":
      return (
        getPergolaSubcategoryOptions(tOptions).find((option) => option.value === draft.pergolaSubcategory)?.label ??
        empty
      );
    case null:
      return empty;
  }
}

export function ProjectWizardSummaryStep({ draft, countries }: ProjectWizardSummaryStepProps) {
  const t = useTranslations("ProjectWizardSummaryStep");
  const tOptions = useTranslations("ProjectOptions");
  const empty = t("empty");
  const countryName =
    countries.find((country) => country.code === draft.countryOfProduction)?.name ?? empty;
  const familyLabel = getProductFamilyOptions(tOptions).find((option) => option.value === draft.family)?.label ?? empty;

  return (
    <Stack gap={4}>
      <Heading level="h2">{t("heading")}</Heading>
      <Text tone="muted">{t("intro")}</Text>

      <SummaryGroup title={t("groupBasicInfo")}>
        <SummaryRow label={t("rowName")} value={draft.name} />
        <SummaryRow
          label={t("rowFloorArea")}
          value={draft.floorAreaM2 !== null ? t("rowFloorAreaValue", { area: draft.floorAreaM2 }) : empty}
        />
        <SummaryRow label={t("rowBedrooms")} value={draft.bedrooms !== null ? String(draft.bedrooms) : empty} />
        <SummaryRow label={t("rowCountry")} value={countryName} />
        <SummaryRow label={t("rowDescription")} value={draft.description} />
        <SummaryRow label={t("rowFamily")} value={familyLabel} />
        <SummaryRow label={t("rowSubcategory")} value={subcategoryLabel(draft, tOptions, empty)} />
      </SummaryGroup>

      {draft.family !== null && (
        <SummaryGroup title={t("groupTechnical")}>
          {getTechnicalFieldsByFamily(draft.family, tOptions).map((field) => {
            const value = draft.technicalSpecs[field.key];
            const displayValue =
              field.type === "select"
                ? field.options?.find((option) => option.value === value)?.label ?? empty
                : value !== undefined && value !== "" && value !== null
                  ? String(value)
                  : empty;
            return <SummaryRow key={field.key} label={field.label} value={displayValue} />;
          })}
        </SummaryGroup>
      )}

      <SummaryGroup title={t("groupPricing")}>
        <SummaryRow
          label={t("rowPrice")}
          value={draft.housePriceMinEur !== null ? t("rowPriceValue", { price: draft.housePriceMinEur }) : empty}
        />
        <SummaryRow
          label={t("rowStandard")}
          value={
            getCompletionStandardOptions(tOptions).find((option) => option.value === draft.completionStandard)
              ?.label ?? empty
          }
        />
        <SummaryRow
          label={t("rowLeadTime")}
          value={
            draft.productionLeadTimeWeeksMin !== null && draft.productionLeadTimeWeeksMax !== null
              ? t("rowLeadTimeValue", {
                  min: draft.productionLeadTimeWeeksMin,
                  max: draft.productionLeadTimeWeeksMax,
                })
              : empty
          }
        />
        <SummaryRow
          label={t("rowAssemblyTime")}
          value={
            draft.onSiteAssemblyDaysMin !== null && draft.onSiteAssemblyDaysMax !== null
              ? t("rowAssemblyTimeValue", { min: draft.onSiteAssemblyDaysMin, max: draft.onSiteAssemblyDaysMax })
              : empty
          }
        />
        <SummaryRow
          label={t("rowWarranty")}
          value={
            draft.structuralWarrantyYears !== null
              ? t("rowWarrantyValue", { years: draft.structuralWarrantyYears })
              : empty
          }
        />
      </SummaryGroup>

      <Stack gap={2}>
        <Heading level="h3">{t("groupFiles")}</Heading>
        <Card padding="md">
          <Stack gap={3}>
            <Stack gap={1}>
              <Text variant="label" tone="muted">
                {t("floorPlanCount", { count: draft.floorPlanFiles.length })}
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
                {t("photoCount", { count: draft.photoFiles.length })}
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
