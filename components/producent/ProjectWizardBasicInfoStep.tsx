import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  getContainerSubcategoryOptions,
  getProductFamilyOptions,
  getProjectCategoryOptions,
  getSpaSubcategoryOptions,
} from "@/lib/producer-project-draft";

interface ProjectWizardBasicInfoStepProps {
  draft: ProjectDraft;
  countries: Country[];
  showValidation: boolean;
  // Rodzina jest niezmienna po utworzeniu produktu (spec 0022 AC-7): ścieżka
  // edycji (ProductEditWizard) blokuje selektor zamiast go ukrywać całkiem,
  // żeby producent nadal widział, jaką rodzinę edytuje.
  familyLocked?: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardBasicInfoStep({
  draft,
  countries,
  showValidation,
  familyLocked = false,
  onChange,
}: ProjectWizardBasicInfoStepProps) {
  const t = useTranslations("ProjectWizardBasicInfoStep");
  const tOptions = useTranslations("ProjectOptions");
  // Zakładki EN/NL są opcjonalne (spec 0028 AC-5): brak walidacji, w
  // przeciwieństwie do wymaganych pól polskich poniżej.
  const [translationTab, setTranslationTab] = useState<"en" | "nl">("en");
  const nameInvalid = showValidation && draft.name.trim().length === 0;
  const floorAreaInvalid =
    showValidation &&
    (draft.floorAreaM2 === null ||
      draft.floorAreaM2 < FLOOR_AREA_MIN_M2 ||
      draft.floorAreaM2 > FLOOR_AREA_MAX_M2);
  const bedroomsInvalid =
    showValidation &&
    (draft.bedrooms === null || draft.bedrooms < BEDROOMS_MIN || draft.bedrooms > BEDROOMS_MAX);
  const countryInvalid = showValidation && draft.countryOfProduction === null;
  const descriptionInvalid = showValidation && draft.description.trim().length === 0;
  const familyInvalid = showValidation && draft.family === null;
  const subcategoryInvalid =
    showValidation &&
    ((draft.family === "dom" && draft.category === null) ||
      (draft.family === "spa-modulowe" && draft.spaSubcategory === null) ||
      (draft.family === "kontenery-modulowe" && draft.containerSubcategory === null));

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
  const familyOptions = getProductFamilyOptions(tOptions);
  const familyLabel = familyOptions.find((option) => option.value === draft.family)?.label ?? "—";

  return (
    <Stack gap={3}>
      <Heading level="h2">{t("heading")}</Heading>
      <Stack gap={1}>
        {familyLocked ? (
          <>
            <Text as="span" variant="label" tone="muted">
              {t("familyLabel")}
            </Text>
            <Text>{familyLabel}</Text>
          </>
        ) : (
          <>
            <Label id="wizard-family-label" required>
              {t("familyLabel")}
            </Label>
            <Select
              value={draft.family}
              onChange={(value) =>
                onChange({
                  family: value,
                  category: null,
                  spaSubcategory: null,
                  containerSubcategory: null,
                  technicalSpecs: {},
                })
              }
              options={familyOptions}
              invalid={familyInvalid}
              aria-labelledby="wizard-family-label"
            />
            {familyInvalid && (
              <p className="font-sans text-body text-status-blocked">{t("familyRequiredError")}</p>
            )}
          </>
        )}
      </Stack>
      {draft.family === "dom" && (
        <Stack gap={1}>
          <Label id="wizard-category-label" required>
            {t("categoryLabel")}
          </Label>
          <Select
            value={draft.category}
            onChange={(value) => onChange({ category: value })}
            options={getProjectCategoryOptions(tOptions)}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-category-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">{t("categoryRequiredError")}</p>
          )}
        </Stack>
      )}
      {draft.family === "spa-modulowe" && (
        <Stack gap={1}>
          <Label id="wizard-spa-subcategory-label" required>
            {t("spaSubcategoryLabel")}
          </Label>
          <Select
            value={draft.spaSubcategory}
            onChange={(value) => onChange({ spaSubcategory: value })}
            options={getSpaSubcategoryOptions(tOptions)}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-spa-subcategory-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">{t("subcategoryRequiredError")}</p>
          )}
        </Stack>
      )}
      {draft.family === "kontenery-modulowe" && (
        <Stack gap={1}>
          <Label id="wizard-container-subcategory-label" required>
            {t("containerSubcategoryLabel")}
          </Label>
          <Select
            value={draft.containerSubcategory}
            onChange={(value) => onChange({ containerSubcategory: value, technicalSpecs: {} })}
            options={getContainerSubcategoryOptions(tOptions)}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-container-subcategory-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">{t("subcategoryRequiredError")}</p>
          )}
        </Stack>
      )}
      <Stack gap={1}>
        <Label htmlFor="wizard-name" required>
          {t("nameLabel")}
        </Label>
        <Input
          id="wizard-name"
          required
          invalid={nameInvalid}
          aria-describedby={nameInvalid ? "wizard-name-error" : undefined}
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        {nameInvalid && (
          <p id="wizard-name-error" className="font-sans text-body text-status-blocked">
            {t("nameRequiredError")}
          </p>
        )}
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-floor-area" required>
            {t("floorAreaLabel")}
          </Label>
          <Input
            id="wizard-floor-area"
            type="number"
            required
            min={FLOOR_AREA_MIN_M2}
            max={FLOOR_AREA_MAX_M2}
            invalid={floorAreaInvalid}
            aria-describedby={floorAreaInvalid ? "wizard-floor-area-error" : undefined}
            value={draft.floorAreaM2 ?? ""}
            onChange={(event) =>
              onChange({ floorAreaM2: event.target.value === "" ? null : Number(event.target.value) })
            }
          />
          {floorAreaInvalid && (
            <p id="wizard-floor-area-error" className="font-sans text-body text-status-blocked">
              {t("floorAreaRequiredError", { min: FLOOR_AREA_MIN_M2, max: FLOOR_AREA_MAX_M2 })}
            </p>
          )}
        </Stack>
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-bedrooms" required>
            {t("bedroomsLabel")}
          </Label>
          <Input
            id="wizard-bedrooms"
            type="number"
            required
            min={BEDROOMS_MIN}
            max={BEDROOMS_MAX}
            invalid={bedroomsInvalid}
            aria-describedby={bedroomsInvalid ? "wizard-bedrooms-error" : undefined}
            value={draft.bedrooms ?? ""}
            onChange={(event) =>
              onChange({ bedrooms: event.target.value === "" ? null : Number(event.target.value) })
            }
          />
          {bedroomsInvalid && (
            <p id="wizard-bedrooms-error" className="font-sans text-body text-status-blocked">
              {t("bedroomsRequiredError", { min: BEDROOMS_MIN, max: BEDROOMS_MAX })}
            </p>
          )}
        </Stack>
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-country-label" required>
          {t("countryLabel")}
        </Label>
        <Select
          value={draft.countryOfProduction}
          onChange={(value) => onChange({ countryOfProduction: value })}
          options={countryOptions}
          invalid={countryInvalid}
          aria-labelledby="wizard-country-label"
        />
        {countryInvalid && (
          <p className="font-sans text-body text-status-blocked">{t("countryRequiredError")}</p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="wizard-description" required>
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id="wizard-description"
          required
          invalid={descriptionInvalid}
          aria-describedby={descriptionInvalid ? "wizard-description-error" : undefined}
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        {descriptionInvalid && (
          <p id="wizard-description-error" className="font-sans text-body text-status-blocked">
            {t("descriptionRequiredError")}
          </p>
        )}
      </Stack>
      <Stack gap={2}>
        <Stack gap={1}>
          <Text as="span" variant="label">
            {t("translationsHeading")}
          </Text>
          <Text tone="muted">{t("translationsHint")}</Text>
        </Stack>
        <div role="tablist" aria-label={t("translationsHeading")} className="flex gap-brand-1">
          <Button
            type="button"
            role="tab"
            aria-selected={translationTab === "en"}
            variant={translationTab === "en" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTranslationTab("en")}
          >
            {t("translationTabEn")}
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={translationTab === "nl"}
            variant={translationTab === "nl" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTranslationTab("nl")}
          >
            {t("translationTabNl")}
          </Button>
        </div>
        {translationTab === "en" ? (
          <Stack gap={2}>
            <Stack gap={1}>
              <Label htmlFor="wizard-name-en">{t("nameEnLabel")}</Label>
              <Input
                id="wizard-name-en"
                value={draft.nameEn}
                onChange={(event) => onChange({ nameEn: event.target.value })}
              />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="wizard-description-en">{t("descriptionEnLabel")}</Label>
              <Textarea
                id="wizard-description-en"
                value={draft.descriptionEn}
                onChange={(event) => onChange({ descriptionEn: event.target.value })}
              />
            </Stack>
          </Stack>
        ) : (
          <Stack gap={2}>
            <Stack gap={1}>
              <Label htmlFor="wizard-name-nl">{t("nameNlLabel")}</Label>
              <Input
                id="wizard-name-nl"
                value={draft.nameNl}
                onChange={(event) => onChange({ nameNl: event.target.value })}
              />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="wizard-description-nl">{t("descriptionNlLabel")}</Label>
              <Textarea
                id="wizard-description-nl"
                value={draft.descriptionNl}
                onChange={(event) => onChange({ descriptionNl: event.target.value })}
              />
            </Stack>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
