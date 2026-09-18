import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  getContainerSubcategoryOptions,
  getProductFamilyOptions,
  getProjectCategoryOptions,
  getSpaSubcategoryOptions,
  getTechnicalFieldsFor,
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
    case "kontenery-modulowe":
      return (
        getContainerSubcategoryOptions(tOptions).find((option) => option.value === draft.containerSubcategory)
          ?.label ?? empty
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
          {getTechnicalFieldsFor(draft.family, draft.containerSubcategory, tOptions).map((field) => {
            const value = draft.technicalSpecs[field.key];
            const displayValue =
              field.type === "select"
                ? field.options?.find((option) => option.value === value)?.label ?? empty
                : field.type === "boolean"
                  ? value === true
                    ? t("booleanYes")
                    : value === false
                      ? t("booleanNo")
                      : empty
                  : value !== undefined && value !== "" && value !== null
                    ? String(value)
                    : empty;
            return <SummaryRow key={field.key} label={field.label} value={displayValue} />;
          })}
        </SummaryGroup>
      )}

      <SummaryGroup title={t("groupVariants")}>
        <SummaryRow label={t("rowVariantCount")} value={String(draft.variantsSummary.length)} />
        <SummaryRow
          label={t("rowDefaultPrice")}
          value={(() => {
            const defaultVariant = draft.variantsSummary.find((variant) => variant.isDefault);
            return defaultVariant && defaultVariant.priceMinCents !== null
              ? t("rowDefaultPriceValue", { price: defaultVariant.priceMinCents / 100 })
              : empty;
          })()}
        />
      </SummaryGroup>

      <SummaryGroup title={t("groupLogistics")}>
        <SummaryRow
          label={t("rowWarranty")}
          value={
            draft.structuralWarrantyYears !== null
              ? t("rowWarrantyValue", { years: draft.structuralWarrantyYears })
              : empty
          }
        />
        <SummaryRow
          label={t("rowInstallationWarranty")}
          value={
            draft.installationWarrantyYears !== null
              ? t("rowWarrantyValue", { years: draft.installationWarrantyYears })
              : empty
          }
        />
        <SummaryRow
          label={t("rowSimplifiedPermit")}
          value={
            draft.simplifiedPermitEligible === null
              ? empty
              : draft.simplifiedPermitEligible
                ? t("booleanYes")
                : t("booleanNo")
          }
        />
      </SummaryGroup>

      <SummaryGroup title={t("groupContent")}>
        <SummaryRow label={t("rowRoomCount")} value={String(draft.roomLayout.length)} />
        <SummaryRow label={t("rowFaqCount")} value={String(draft.faq.length)} />
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
