import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Card, Checkbox, Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
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
export function ProjectWizardBasicInfoStep({
  countries,
  showValidation,
  familyLocked = false,
}: ProjectWizardBasicInfoStepProps) {
  const t = useTranslations("ProjectWizardBasicInfoStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, setValue } = useFormContext<ProjectDraft>();
  // Zakładki EN/NL są opcjonalne (spec 0028 AC-5): brak walidacji, w
  // przeciwieństwie do wymaganych pól polskich poniżej.
  const [translationTab, setTranslationTab] = useState<"en" | "nl">("en");
  // Uklad pomieszczen (spec 0045 AC-5, AC-10): trzy tablice w locku po
  // pozycji, ten sam wzorzec co ProjectWizardFaqStep — patrz komentarz tam.
  const roomLayoutArray = useFieldArray({ control, name: "roomLayout" });
  const roomLayoutEnArray = useFieldArray({ control, name: "roomLayoutEn" });
  const roomLayoutNlArray = useFieldArray({ control, name: "roomLayoutNl" });
  const [roomTranslationTab, setRoomTranslationTab] = useState<"en" | "nl">("en");
  const values = useWatch({ control }) as ProjectDraft;
  const nameInvalid = showValidation && values.name.trim().length === 0;
  const floorAreaInvalid =
    showValidation &&
    (values.floorAreaM2 === null ||
      values.floorAreaM2 < FLOOR_AREA_MIN_M2 ||
      values.floorAreaM2 > FLOOR_AREA_MAX_M2);
  const bedroomsInvalid =
    showValidation &&
    (values.bedrooms === null || values.bedrooms < BEDROOMS_MIN || values.bedrooms > BEDROOMS_MAX);
  const countryInvalid = showValidation && values.countryOfProduction === null;
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

  function handleAddRoom() {
    const id = crypto.randomUUID();
    roomLayoutArray.append({ id, name: "", areaM2: 0, function: "", isMezzanine: false });
    roomLayoutEnArray.append({ id, name: "" });
    roomLayoutNlArray.append({ id, name: "" });
  }

  function handleRemoveRoom(index: number) {
    roomLayoutArray.remove(index);
    roomLayoutEnArray.remove(index);
    roomLayoutNlArray.remove(index);
  }

  function handleMoveRoom(from: number, to: number) {
    roomLayoutArray.move(from, to);
    roomLayoutEnArray.move(from, to);
    roomLayoutNlArray.move(from, to);
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
            {...register("floorAreaM2", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
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
            {...register("bedrooms", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
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
              <Input id="wizard-name-en" {...register("nameEn")} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="wizard-description-en">{t("descriptionEnLabel")}</Label>
              <Textarea id="wizard-description-en" {...register("descriptionEn")} />
            </Stack>
          </Stack>
        ) : (
          <Stack gap={2}>
            <Stack gap={1}>
              <Label htmlFor="wizard-name-nl">{t("nameNlLabel")}</Label>
              <Input id="wizard-name-nl" {...register("nameNl")} />
            </Stack>
            <Stack gap={1}>
              <Label htmlFor="wizard-description-nl">{t("descriptionNlLabel")}</Label>
              <Textarea id="wizard-description-nl" {...register("descriptionNl")} />
            </Stack>
          </Stack>
        )}
      </Stack>

      <Stack gap={2}>
        <Stack gap={1}>
          <Text as="span" variant="label">
            {t("roomLayoutHeading")}
          </Text>
          <Text tone="muted">{t("roomLayoutHint")}</Text>
        </Stack>

        {roomLayoutArray.fields.length === 0 && <Text tone="muted">{t("roomLayoutEmptyHint")}</Text>}

        <Stack gap={2}>
          {roomLayoutArray.fields.map((field, index) => (
            <Card key={field.id} padding="sm">
              <Stack gap={2}>
                <Stack direction="row" gap={2} className="flex-wrap items-end">
                  <Stack gap={1} className="min-w-40 flex-1">
                    <Label htmlFor={`room-${index}-name`} required>
                      {t("roomNameLabel")}
                    </Label>
                    <Input id={`room-${index}-name`} required {...register(`roomLayout.${index}.name`)} />
                  </Stack>
                  <Stack gap={1} className="min-w-28">
                    <Label htmlFor={`room-${index}-area`} required>
                      {t("roomAreaLabel")}
                    </Label>
                    <Input
                      id={`room-${index}-area`}
                      type="number"
                      min={0}
                      required
                      {...register(`roomLayout.${index}.areaM2`, { setValueAs: (value) => (value === "" ? 0 : Number(value)) })}
                    />
                  </Stack>
                  <Stack gap={1} className="min-w-40 flex-1">
                    <Label htmlFor={`room-${index}-function`} required>
                      {t("roomFunctionLabel")}
                    </Label>
                    <Input id={`room-${index}-function`} required {...register(`roomLayout.${index}.function`)} />
                  </Stack>
                  <div className="flex items-center gap-brand-1 pb-2">
                    <Checkbox id={`room-${index}-mezzanine`} {...register(`roomLayout.${index}.isMezzanine`)} />
                    <Label htmlFor={`room-${index}-mezzanine`}>{t("roomMezzanineLabel")}</Label>
                  </div>
                  <Stack direction="row" gap={1} className="items-center pb-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveRoom(index, index - 1)}
                        aria-label={t("moveUpLabel")}
                        className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
                      >
                        <ChevronUp className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    {index < roomLayoutArray.fields.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveRoom(index, index + 1)}
                        aria-label={t("moveDownLabel")}
                        className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-brand-foundation-navy"
                      >
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(index)}
                      aria-label={t("removeRoomLabel")}
                      className="focus-ring flex size-8 items-center justify-center rounded-data text-brand-technical-graphite hover:text-status-blocked"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </Stack>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>

        {roomLayoutArray.fields.length > 0 && (
          <Stack gap={2}>
            <div role="tablist" aria-label={t("roomTranslationsHeading")} className="flex gap-brand-1">
              <Button
                type="button"
                role="tab"
                aria-selected={roomTranslationTab === "en"}
                variant={roomTranslationTab === "en" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setRoomTranslationTab("en")}
              >
                {t("translationTabEn")}
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={roomTranslationTab === "nl"}
                variant={roomTranslationTab === "nl" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setRoomTranslationTab("nl")}
              >
                {t("translationTabNl")}
              </Button>
            </div>
            <Stack gap={2}>
              {roomLayoutArray.fields.map((field, index) =>
                roomTranslationTab === "en" ? (
                  <Input
                    key={field.id}
                    aria-label={t("roomNameTranslationLabel", { index: index + 1 })}
                    placeholder={t("roomNameTranslationLabel", { index: index + 1 })}
                    {...register(`roomLayoutEn.${index}.name`)}
                  />
                ) : (
                  <Input
                    key={field.id}
                    aria-label={t("roomNameTranslationLabel", { index: index + 1 })}
                    placeholder={t("roomNameTranslationLabel", { index: index + 1 })}
                    {...register(`roomLayoutNl.${index}.name`)}
                  />
                ),
              )}
            </Stack>
          </Stack>
        )}

        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={handleAddRoom}>
          <Plus className="size-4" aria-hidden="true" />
          {t("addRoomButton")}
        </Button>
      </Stack>
    </Stack>
  );
}
