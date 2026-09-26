import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Checkbox, Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, CountryCode, ProjectDraft } from "@/lib/data/types";
import {
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  getContainerSubcategoryOptions,
  getProductFamilyOptions,
  getProjectCategoryOptions,
  getSpaSubcategoryOptions,
} from "@/lib/producer-project-draft";

interface ProjectWizardBasicInfoStepProps {
  countries: Country[];
  showValidation: boolean;
  // Rodzina jest niezmienna po utworzeniu produktu (spec 0022 AC-7): ścieżka
  // edycji (ProductEditWizard) blokuje selektor zamiast go ukrywać całkiem,
  // żeby producent nadal widział, jaką rodzinę edytuje.
  familyLocked?: boolean;
}

// Zmigrowany na react-hook-form (spec 0045 AC-14, Build plan task 3): stan
// żyje w useForm z ProjectWizard/ProductEditWizard (FormProvider), ten
// komponent czyta go przez useFormContext zamiast przez draft/onChange props.
// Uklad pomieszczen (spec 0045 AC-5) wyniosl sie do wlasnego kroku
// ProjectWizardRoomLayoutStep, umieszczonego po "pliki" — patrz komentarz przy
// WIZARD_STEPS (lib/producer-project-draft.ts).
export function ProjectWizardBasicInfoStep({
  countries,
  showValidation,
  familyLocked = false,
}: ProjectWizardBasicInfoStepProps) {
  const t = useTranslations("ProjectWizardBasicInfoStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, setValue } = useFormContext<ProjectDraft>();
  const values = useWatch({ control }) as ProjectDraft;
  const nameInvalid = showValidation && values.name.trim().length === 0;
  const floorAreaInvalid =
    showValidation &&
    (values.floorAreaM2 === null ||
      values.floorAreaM2 < FLOOR_AREA_MIN_M2 ||
      values.floorAreaM2 > FLOOR_AREA_MAX_M2);
  const countryInvalid = showValidation && values.countryOfProduction === null;
  const deliveryCountriesInvalid = showValidation && values.deliveryCountries.length === 0;
  const descriptionInvalid = showValidation && values.description.trim().length === 0;
  const familyInvalid = showValidation && values.family === null;
  const subcategoryInvalid =
    showValidation &&
    ((values.family === "dom" && values.category === null) ||
      (values.family === "spa-modulowe" && values.spaSubcategory === null) ||
      (values.family === "kontenery-modulowe" && values.containerSubcategory === null));

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
  const familyOptions = getProductFamilyOptions(tOptions);
  const familyLabel = familyOptions.find((option) => option.value === values.family)?.label ?? "—";

  // Kraje dostawy (spec 0018 product_country_eligibility): zestaw checkboxów
  // zamiast Select — producent zwykle dostarcza do więcej niż jednego kraju
  // naraz, a ta lista jest krótka (3 kraje), więc multi-select nie potrzebuje
  // osobnego komponentu.
  function toggleDeliveryCountry(code: CountryCode) {
    setValue(
      "deliveryCountries",
      values.deliveryCountries.includes(code)
        ? values.deliveryCountries.filter((existing) => existing !== code)
        : [...values.deliveryCountries, code],
    );
  }

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
            <Controller
              name="family"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    setValue("category", null);
                    setValue("spaSubcategory", null);
                    setValue("containerSubcategory", null);
                    setValue("technicalSpecs", {});
                  }}
                  options={familyOptions}
                  invalid={familyInvalid}
                  aria-labelledby="wizard-family-label"
                />
              )}
            />
            {familyInvalid && (
              <p className="font-sans text-body text-status-blocked">{t("familyRequiredError")}</p>
            )}
          </>
        )}
      </Stack>
      {values.family === "dom" && (
        <Stack gap={1}>
          <Label id="wizard-category-label" required>
            {t("categoryLabel")}
          </Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={getProjectCategoryOptions(tOptions)}
                invalid={subcategoryInvalid}
                aria-labelledby="wizard-category-label"
              />
            )}
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">{t("categoryRequiredError")}</p>
          )}
        </Stack>
      )}
      {values.family === "spa-modulowe" && (
        <Stack gap={1}>
          <Label id="wizard-spa-subcategory-label" required>
            {t("spaSubcategoryLabel")}
          </Label>
          <Controller
            name="spaSubcategory"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={getSpaSubcategoryOptions(tOptions)}
                invalid={subcategoryInvalid}
                aria-labelledby="wizard-spa-subcategory-label"
              />
            )}
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">{t("subcategoryRequiredError")}</p>
          )}
        </Stack>
      )}
      {values.family === "kontenery-modulowe" && (
        <Stack gap={1}>
          <Label id="wizard-container-subcategory-label" required>
            {t("containerSubcategoryLabel")}
          </Label>
          <Controller
            name="containerSubcategory"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setValue("technicalSpecs", {});
                }}
                options={getContainerSubcategoryOptions(tOptions)}
                invalid={subcategoryInvalid}
                aria-labelledby="wizard-container-subcategory-label"
              />
            )}
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
          {...register("name")}
        />
        {nameInvalid && (
          <p id="wizard-name-error" className="font-sans text-body text-status-blocked">
            {t("nameRequiredError")}
          </p>
        )}
      </Stack>
      <Stack gap={1}>
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
          {...register("floorAreaM2", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
        />
        {floorAreaInvalid && (
          <p id="wizard-floor-area-error" className="font-sans text-body text-status-blocked">
            {t("floorAreaRequiredError", { min: FLOOR_AREA_MIN_M2, max: FLOOR_AREA_MAX_M2 })}
          </p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="wizard-external-dimensions">{t("externalDimensionsLabel")}</Label>
        <Input id="wizard-external-dimensions" {...register("externalDimensions")} />
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-country-label" required>
          {t("countryLabel")}
        </Label>
        <Controller
          name="countryOfProduction"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              options={countryOptions}
              invalid={countryInvalid}
              aria-labelledby="wizard-country-label"
            />
          )}
        />
        {countryInvalid && (
          <p className="font-sans text-body text-status-blocked">{t("countryRequiredError")}</p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-delivery-countries-label" required>
          {t("deliveryCountriesLabel")}
        </Label>
        <Stack direction="row" gap={3} className="flex-wrap" aria-labelledby="wizard-delivery-countries-label">
          {countries.map((country) => (
            <div key={country.code} className="flex items-center gap-brand-1">
              <Checkbox
                id={`wizard-delivery-country-${country.code}`}
                checked={values.deliveryCountries.includes(country.code)}
                onChange={() => toggleDeliveryCountry(country.code)}
              />
              <Label htmlFor={`wizard-delivery-country-${country.code}`}>{country.name}</Label>
            </div>
          ))}
        </Stack>
        {deliveryCountriesInvalid && (
          <p className="font-sans text-body text-status-blocked">{t("deliveryCountriesRequiredError")}</p>
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
          {...register("description")}
        />
        {descriptionInvalid && (
          <p id="wizard-description-error" className="font-sans text-body text-status-blocked">
            {t("descriptionRequiredError")}
          </p>
        )}
      </Stack>
    </Stack>
  );
}
