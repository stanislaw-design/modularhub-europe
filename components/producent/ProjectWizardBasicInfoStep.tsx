import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Card, Checkbox, Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { recognizeRoomLayout } from "@/lib/producer-room-layout-actions";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  getContainerSubcategoryOptions,
  getFloorLevelOptions,
  getProductFamilyOptions,
  getProjectCategoryOptions,
  getSpaSubcategoryOptions,
} from "@/lib/producer-project-draft";
import { mergeRecognizedRooms, type RoomLayoutConfidence } from "@/lib/room-layout-merge";

const MAX_FLOOR_PLANS_FOR_RECOGNITION = 5;

export interface ProjectWizardBasicInfoStepFloorPlan {
  id: string;
  filename: string;
}

interface ProjectWizardBasicInfoStepProps {
  countries: Country[];
  showValidation: boolean;
  // Rodzina jest niezmienna po utworzeniu produktu (spec 0022 AC-7): ścieżka
  // edycji (ProductEditWizard) blokuje selektor zamiast go ukrywać całkiem,
  // żeby producent nadal widział, jaką rodzinę edytuje.
  familyLocked?: boolean;
  // Rozpoznawanie układu pomieszczeń (spec 0050 AC-4 do AC-12) istnieje
  // wyłącznie w kreatorze nowego projektu, nigdy w edycji istniejącego,
  // opublikowanego produktu (AC-41) — ProductEditWizard po prostu nie
  // przekazuje tych trzech propsów, więc sekcja się nie renderuje.
  productId?: string | null;
  floorPlans?: ProjectWizardBasicInfoStepFloorPlan[];
}

// Zmigrowany na react-hook-form (spec 0045 AC-14, Build plan task 3): stan
// żyje w useForm z ProjectWizard/ProductEditWizard (FormProvider), ten
// komponent czyta go przez useFormContext zamiast przez draft/onChange props.
export function ProjectWizardBasicInfoStep({
  countries,
  showValidation,
  familyLocked = false,
  productId = null,
  floorPlans,
}: ProjectWizardBasicInfoStepProps) {
  const t = useTranslations("ProjectWizardBasicInfoStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register, setValue } = useFormContext<ProjectDraft>();
  // Uklad pomieszczen (spec 0045 AC-5, AC-10; DE dodane spec 0050 AC-28):
  // cztery tablice w locku po pozycji, ten sam wzorzec co ProjectWizardFaqStep
  // — patrz komentarz tam. Tłumaczenia (roomLayoutEn/Nl/De) nie mają tu już
  // własnej zakładki (spec 0050 AC-31, AC-32): wypełnia je wyłącznie
  // ProjectWizardTranslationsStep, ten komponent tylko trzyma je w tym samym
  // locku id/pozycji co roomLayout, żeby nie rozjechały się przy dodaniu/
  // usunięciu/przesunięciu pokoju.
  const roomLayoutArray = useFieldArray({ control, name: "roomLayout" });
  const roomLayoutEnArray = useFieldArray({ control, name: "roomLayoutEn" });
  const roomLayoutNlArray = useFieldArray({ control, name: "roomLayoutNl" });
  const roomLayoutDeArray = useFieldArray({ control, name: "roomLayoutDe" });
  const values = useWatch({ control }) as ProjectDraft;

  // Rozpoznawanie układu pomieszczeń (spec 0050 AC-4 do AC-12): tylko gdy
  // rodzic przekazał floorPlans (AC-41, patrz props powyżej). Domyślnie
  // zaznaczone są pierwsze pięć wgranych rzutów (limit AC-4); producent może
  // odznaczyć/zaznaczyć inne, nigdy więcej niż pięć naraz.
  const [selectedFloorPlanIds, setSelectedFloorPlanIds] = useState<string[]>(() =>
    (floorPlans ?? []).slice(0, MAX_FLOOR_PLANS_FOR_RECOGNITION).map((plan) => plan.id),
  );
  const [roomConfidence, setRoomConfidence] = useState<Record<string, RoomLayoutConfidence>>({});
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  function toggleFloorPlanSelection(id: string) {
    setSelectedFloorPlanIds((current) => {
      if (current.includes(id)) return current.filter((existingId) => existingId !== id);
      if (current.length >= MAX_FLOOR_PLANS_FOR_RECOGNITION) return current;
      return [...current, id];
    });
  }

  async function handleRecognizeRooms() {
    if (productId === null || selectedFloorPlanIds.length === 0) return;
    setRecognitionError(null);
    setIsRecognizing(true);
    const result = await recognizeRoomLayout(productId, selectedFloorPlanIds);
    setIsRecognizing(false);
    if (!result.ok || !result.rooms) {
      setRecognitionError(result.error ?? t("recognizeError"));
      return;
    }
    const currentRooms = values.roomLayout;
    const existingIds = new Set(currentRooms.map((room) => room.id));
    const merged = mergeRecognizedRooms(currentRooms, result.rooms);
    for (const room of merged.rows) {
      if (existingIds.has(room.id)) continue;
      roomLayoutArray.append(room);
      roomLayoutEnArray.append({ id: room.id, name: "" });
      roomLayoutNlArray.append({ id: room.id, name: "" });
      roomLayoutDeArray.append({ id: room.id, name: "" });
    }
    setRoomConfidence((current) => ({ ...current, ...merged.confidenceById }));
  }
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
  const floorLevelOptions = getFloorLevelOptions(tOptions);
  const familyLabel = familyOptions.find((option) => option.value === values.family)?.label ?? "—";

  function handleAddRoom() {
    const id = crypto.randomUUID();
    roomLayoutArray.append({ id, name: "", areaM2: 0, function: "", floorLevel: "parter" });
    roomLayoutEnArray.append({ id, name: "" });
    roomLayoutNlArray.append({ id, name: "" });
    roomLayoutDeArray.append({ id, name: "" });
  }

  function handleRemoveRoom(index: number) {
    roomLayoutArray.remove(index);
    roomLayoutEnArray.remove(index);
    roomLayoutNlArray.remove(index);
    roomLayoutDeArray.remove(index);
  }

  function handleMoveRoom(from: number, to: number) {
    roomLayoutArray.move(from, to);
    roomLayoutEnArray.move(from, to);
    roomLayoutNlArray.move(from, to);
    roomLayoutDeArray.move(from, to);
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
            {t("roomLayoutHeading")}
          </Text>
          <Text tone="muted">{t("roomLayoutHint")}</Text>
        </Stack>

        {floorPlans !== undefined && (
          <Card padding="sm">
            <Stack gap={2}>
              <Text as="span" variant="label">
                {t("recognizeHeading")}
              </Text>
              {productId === null || floorPlans.length === 0 ? (
                <Text tone="muted">{t("recognizeNoFloorPlansHint")}</Text>
              ) : (
                <>
                  <Text tone="muted">{t("recognizeHint")}</Text>
                  <Stack gap={1}>
                    {floorPlans.map((plan) => {
                      const checked = selectedFloorPlanIds.includes(plan.id);
                      const disabled = !checked && selectedFloorPlanIds.length >= MAX_FLOOR_PLANS_FOR_RECOGNITION;
                      return (
                        <div key={plan.id} className="flex items-center gap-brand-1">
                          <Checkbox
                            id={`recognize-floor-plan-${plan.id}`}
                            checked={checked}
                            disabled={disabled || isRecognizing}
                            onChange={() => toggleFloorPlanSelection(plan.id)}
                          />
                          <Label htmlFor={`recognize-floor-plan-${plan.id}`}>{plan.filename}</Label>
                        </div>
                      );
                    })}
                  </Stack>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-fit"
                    disabled={isRecognizing || selectedFloorPlanIds.length === 0}
                    onClick={handleRecognizeRooms}
                  >
                    {isRecognizing ? t("recognizePending") : t("recognizeAction")}
                  </Button>
                  {recognitionError && (
                    <p role="alert" className="font-sans text-body text-status-blocked">
                      {recognitionError}
                    </p>
                  )}
                </>
              )}
            </Stack>
          </Card>
        )}

        {roomLayoutArray.fields.length === 0 && <Text tone="muted">{t("roomLayoutEmptyHint")}</Text>}

        <Stack gap={2}>
          {roomLayoutArray.fields.map((field, index) => {
            // field.id to wewnętrzny, generowany przez react-hook-form klucz
            // do React key (keyName domyślnie "id" NADPISUJE wartość id z
            // danych, nie jest z nią tożsamy) — do znacznika pewności trzeba
            // prawdziwego id z watchowanej wartości, tego samego, którego
            // używa mergeRecognizedRooms.
            const roomId = values.roomLayout[index]?.id;
            return (
            <Card key={field.id} padding="sm">
              <Stack gap={2}>
                <Stack direction="row" gap={2} className="flex-wrap items-end">
                  <Stack gap={1} className="min-w-40 flex-1">
                    <div className="flex items-center gap-brand-1">
                      <Label htmlFor={`room-${index}-name`} required>
                        {t("roomNameLabel")}
                      </Label>
                      {roomId && roomConfidence[roomId] && (
                        <Text as="span" tone="muted" className="text-data">
                          {t(`confidenceBadge.${roomConfidence[roomId]}`)}
                        </Text>
                      )}
                    </div>
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
                  <Stack gap={1} className="min-w-32">
                    <Label id={`room-${index}-floor-level-label`}>{t("roomFloorLevelLabel")}</Label>
                    <Controller
                      name={`roomLayout.${index}.floorLevel`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          options={floorLevelOptions}
                          aria-labelledby={`room-${index}-floor-level-label`}
                        />
                      )}
                    />
                  </Stack>
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
            );
          })}
        </Stack>

        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={handleAddRoom}>
          <Plus className="size-4" aria-hidden="true" />
          {t("addRoomButton")}
        </Button>
      </Stack>
    </Stack>
  );
}
