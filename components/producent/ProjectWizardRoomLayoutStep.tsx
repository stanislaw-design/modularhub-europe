"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Card, Checkbox, Heading, Input, Label, Select, Stack, Text } from "@/components/ui";
import type { ProjectDraft } from "@/lib/data/types";
import { recognizeRoomLayout } from "@/lib/producer-room-layout-actions";
import {
  BATHROOMS_MAX,
  BATHROOMS_MIN,
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  ROOMS_MAX,
  ROOMS_MIN,
  getFloorLevelOptions,
} from "@/lib/producer-project-draft";
import { mergeRecognizedRooms, type RoomLayoutConfidence } from "@/lib/room-layout-merge";

const MAX_FLOOR_PLANS_FOR_RECOGNITION = 5;

export interface ProjectWizardRoomLayoutStepFloorPlan {
  id: string;
  filename: string;
}

interface ProjectWizardRoomLayoutStepProps {
  // Rozpoznawanie układu pomieszczeń (spec 0050 AC-4 do AC-12) w obu
  // kreatorach, tworzenia i edycji istniejącego, opublikowanego produktu
  // (spec 0052, odwraca dawne AC-41 spec 0050) — oba propsy poniżej są
  // przekazywane przez ProjectWizard i ProductEditWizard identycznie.
  // Karta rozpoznawania renderuje się tylko, gdy floorPlans jest podane
  // (ręczne dodawanie/edycja pomieszczeń zostaje dostępne zawsze).
  productId?: string | null;
  floorPlans?: ProjectWizardRoomLayoutStepFloorPlan[];
  // Liczba sypialni/pokoi/łazienek (dedykowane kolumny produktu, przeniesione
  // tu z ProjectWizardBasicInfoStep) jest wymagana, więc krok, inaczej niż
  // reszta tego formularza, ma teraz swój własny błąd walidacji do pokazania.
  showValidation: boolean;
}

// Wydzielony z ProjectWizardBasicInfoStep (spec 0045 AC-5, AC-10; DE dodane
// spec 0050 AC-28) we własny krok kreatora, umieszczony po "pliki" —
// rozpoznawanie AI potrzebuje już wgranych rzutów, a krok "podstawowe" jest
// pierwszy w kreatorze, więc producent musiał wracać na sam początek, żeby
// uruchomić rozpoznawanie po wgraniu plików na kroku "pliki". Patrz komentarz
// przy WIZARD_STEPS (lib/producer-project-draft.ts).
//
// Cztery tablice w locku po pozycji, ten sam wzorzec co ProjectWizardFaqStep.
// Tłumaczenia (roomLayoutEn/Nl/De) nie mają tu własnej zakładki (spec 0050
// AC-31, AC-32): wypełnia je wyłącznie ProjectWizardTranslationsStep, ten
// komponent tylko trzyma je w tym samym locku id/pozycji co roomLayout, żeby
// nie rozjechały się przy dodaniu/usunięciu/przesunięciu pokoju.
export function ProjectWizardRoomLayoutStep({
  productId = null,
  floorPlans,
  showValidation,
}: ProjectWizardRoomLayoutStepProps) {
  const t = useTranslations("ProjectWizardRoomLayoutStep");
  const tOptions = useTranslations("ProjectOptions");
  const { control, register } = useFormContext<ProjectDraft>();
  const roomLayoutArray = useFieldArray({ control, name: "roomLayout" });
  const roomLayoutEnArray = useFieldArray({ control, name: "roomLayoutEn" });
  const roomLayoutNlArray = useFieldArray({ control, name: "roomLayoutNl" });
  const roomLayoutDeArray = useFieldArray({ control, name: "roomLayoutDe" });
  const values = useWatch({ control }) as ProjectDraft;
  const bedroomsInvalid =
    showValidation &&
    (values.bedrooms === null || values.bedrooms < BEDROOMS_MIN || values.bedrooms > BEDROOMS_MAX);
  const roomsInvalid =
    showValidation && (values.rooms === null || values.rooms < ROOMS_MIN || values.rooms > ROOMS_MAX);
  const bathroomsInvalid =
    showValidation &&
    (values.bathrooms === null || values.bathrooms < BATHROOMS_MIN || values.bathrooms > BATHROOMS_MAX);

  // Domyślnie zaznaczone są pierwsze pięć wgranych rzutów (limit AC-4);
  // producent może odznaczyć/zaznaczyć inne, nigdy więcej niż pięć naraz.
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

  const floorLevelOptions = getFloorLevelOptions(tOptions);

  function handleAddRoom() {
    const id = crypto.randomUUID();
    roomLayoutArray.append({ id, name: "", areaM2: 0, floorLevel: "parter" });
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
      <Stack gap={1}>
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted">{t("intro")}</Text>
      </Stack>

      <Stack direction="row" gap={3} className="flex-wrap">
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
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-rooms" required>
            {t("roomsLabel")}
          </Label>
          <Input
            id="wizard-rooms"
            type="number"
            required
            min={ROOMS_MIN}
            max={ROOMS_MAX}
            invalid={roomsInvalid}
            aria-describedby={roomsInvalid ? "wizard-rooms-error" : undefined}
            {...register("rooms", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
          />
          {roomsInvalid && (
            <p id="wizard-rooms-error" className="font-sans text-body text-status-blocked">
              {t("roomsRequiredError", { min: ROOMS_MIN, max: ROOMS_MAX })}
            </p>
          )}
        </Stack>
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-bathrooms" required>
            {t("bathroomsLabel")}
          </Label>
          <Input
            id="wizard-bathrooms"
            type="number"
            required
            min={BATHROOMS_MIN}
            max={BATHROOMS_MAX}
            invalid={bathroomsInvalid}
            aria-describedby={bathroomsInvalid ? "wizard-bathrooms-error" : undefined}
            {...register("bathrooms", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
          />
          {bathroomsInvalid && (
            <p id="wizard-bathrooms-error" className="font-sans text-body text-status-blocked">
              {t("bathroomsRequiredError", { min: BATHROOMS_MIN, max: BATHROOMS_MAX })}
            </p>
          )}
        </Stack>
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
          // field.id to wewnętrzny, generowany przez react-hook-form klucz do
          // React key (keyName domyślnie "id" NADPISUJE wartość id z danych,
          // nie jest z nią tożsamy) — do znacznika pewności trzeba prawdziwego
          // id z watchowanej wartości, tego samego, którego używa
          // mergeRecognizedRooms.
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
  );
}
