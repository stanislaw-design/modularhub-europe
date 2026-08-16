import type { ReactNode } from "react";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { Country, ProjectDraft } from "@/lib/data/types";

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

export function ProjectWizardSummaryStep({ draft, countries }: ProjectWizardSummaryStepProps) {
  const countryName =
    countries.find((country) => country.code === draft.countryOfProduction)?.name ?? "—";

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
      </SummaryGroup>

      <SummaryGroup title="Konstrukcja i izolacja">
        <SummaryRow label="Układ ścian" value={draft.wallBuildUp} />
        <SummaryRow label="Izolacja" value={draft.insulation} />
        <SummaryRow label="Współczynniki przenikania ciepła" value={draft.heatTransferCoefficients} />
      </SummaryGroup>

      <SummaryGroup title="Instalacje i okna">
        <SummaryRow label="Klasa okien" value={draft.windowClass} />
        <SummaryRow label="Wentylacja" value={draft.ventilation} />
        <SummaryRow label="Źródło ciepła" value={draft.heatSource} />
      </SummaryGroup>

      <SummaryGroup title="Odporność">
        <SummaryRow label="Odporność ogniowa" value={draft.fireResistance} />
        <SummaryRow label="Odporność wiatrowa" value={draft.windResistance} />
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
