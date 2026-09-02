import { Heading, Input, Label, Select, Stack, Text, Textarea } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
  PERGOLA_SUBCATEGORY_OPTIONS,
  PRODUCT_FAMILY_OPTIONS,
  PROJECT_CATEGORY_OPTIONS,
  SPA_SUBCATEGORY_OPTIONS,
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
      (draft.family === "pergola" && draft.pergolaSubcategory === null));

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
  const familyLabel = PRODUCT_FAMILY_OPTIONS.find((option) => option.value === draft.family)?.label ?? "—";

  return (
    <Stack gap={3}>
      <Heading level="h2">Informacje podstawowe</Heading>
      <Stack gap={1}>
        {familyLocked ? (
          <>
            <Text as="span" variant="label" tone="muted">
              Rodzina produktu
            </Text>
            <Text>{familyLabel}</Text>
          </>
        ) : (
          <>
            <Label id="wizard-family-label" required>
              Rodzina produktu
            </Label>
            <Select
              value={draft.family}
              onChange={(value) =>
                onChange({
                  family: value,
                  category: null,
                  spaSubcategory: null,
                  pergolaSubcategory: null,
                  technicalSpecs: {},
                })
              }
              options={PRODUCT_FAMILY_OPTIONS}
              invalid={familyInvalid}
              aria-labelledby="wizard-family-label"
            />
            {familyInvalid && (
              <p className="font-sans text-body text-status-blocked">Wybierz rodzinę produktu.</p>
            )}
          </>
        )}
      </Stack>
      {draft.family === "dom" && (
        <Stack gap={1}>
          <Label id="wizard-category-label" required>
            Kategoria
          </Label>
          <Select
            value={draft.category}
            onChange={(value) => onChange({ category: value })}
            options={PROJECT_CATEGORY_OPTIONS}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-category-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">Wybierz kategorię produktu.</p>
          )}
        </Stack>
      )}
      {draft.family === "spa-modulowe" && (
        <Stack gap={1}>
          <Label id="wizard-spa-subcategory-label" required>
            Podkategoria
          </Label>
          <Select
            value={draft.spaSubcategory}
            onChange={(value) => onChange({ spaSubcategory: value })}
            options={SPA_SUBCATEGORY_OPTIONS}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-spa-subcategory-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">Wybierz podkategorię.</p>
          )}
        </Stack>
      )}
      {draft.family === "pergola" && (
        <Stack gap={1}>
          <Label id="wizard-pergola-subcategory-label" required>
            Podkategoria
          </Label>
          <Select
            value={draft.pergolaSubcategory}
            onChange={(value) => onChange({ pergolaSubcategory: value })}
            options={PERGOLA_SUBCATEGORY_OPTIONS}
            invalid={subcategoryInvalid}
            aria-labelledby="wizard-pergola-subcategory-label"
          />
          {subcategoryInvalid && (
            <p className="font-sans text-body text-status-blocked">Wybierz podkategorię.</p>
          )}
        </Stack>
      )}
      <Stack gap={1}>
        <Label htmlFor="wizard-name" required>
          Nazwa projektu
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
            Podaj nazwę projektu.
          </p>
        )}
      </Stack>
      <Stack direction="row" gap={3} className="flex-wrap">
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-floor-area" required>
            Metraż (m²)
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
              Podaj metraż od {FLOOR_AREA_MIN_M2} do {FLOOR_AREA_MAX_M2} m².
            </p>
          )}
        </Stack>
        <Stack gap={1} className="min-w-40 flex-1">
          <Label htmlFor="wizard-bedrooms" required>
            Liczba sypialni
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
              Podaj liczbę sypialni od {BEDROOMS_MIN} do {BEDROOMS_MAX}.
            </p>
          )}
        </Stack>
      </Stack>
      <Stack gap={1}>
        <Label id="wizard-country-label" required>
          Kraj produkcji
        </Label>
        <Select
          value={draft.countryOfProduction}
          onChange={(value) => onChange({ countryOfProduction: value })}
          options={countryOptions}
          invalid={countryInvalid}
          aria-labelledby="wizard-country-label"
        />
        {countryInvalid && (
          <p className="font-sans text-body text-status-blocked">Wybierz kraj produkcji.</p>
        )}
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="wizard-description" required>
          Opis
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
            Podaj opis projektu.
          </p>
        )}
      </Stack>
    </Stack>
  );
}
