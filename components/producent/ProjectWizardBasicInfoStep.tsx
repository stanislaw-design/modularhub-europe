import { Heading, Input, Label, Select, Stack, Textarea } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  FLOOR_AREA_MAX_M2,
  FLOOR_AREA_MIN_M2,
} from "@/lib/producer-project-draft";

interface ProjectWizardBasicInfoStepProps {
  draft: ProjectDraft;
  countries: Country[];
  showValidation: boolean;
  onChange: (patch: Partial<ProjectDraft>) => void;
}

export function ProjectWizardBasicInfoStep({
  draft,
  countries,
  showValidation,
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

  const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));

  return (
    <Stack gap={3}>
      <Heading level="h2">Informacje podstawowe</Heading>
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
