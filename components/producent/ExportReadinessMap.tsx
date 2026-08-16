import { Heading, Stack, Text } from "@/components/ui";
import type { Country, ExportReadinessCountryStatus } from "@/lib/data/types";
import { ExportReadinessCountryRow } from "./ExportReadinessCountryRow";

interface ExportReadinessMapProps {
  locale: string;
  projectName: string | null;
  countries: Country[];
  entries: ExportReadinessCountryStatus[];
}

const DISCLAIMER_TEXT =
  "To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana.";

export function ExportReadinessMap({ locale, projectName, countries, entries }: ExportReadinessMapProps) {
  return (
    <Stack gap={4}>
      <Heading level="h1">
        {projectName ? `Gotowość eksportowa: „${projectName}”` : "Gotowość eksportowa"}
      </Heading>
      <Text tone="muted" measure>
        {DISCLAIMER_TEXT}
      </Text>
      <Stack gap={3}>
        {entries.map((entry) => {
          const countryName =
            countries.find((country) => country.code === entry.countryCode)?.name ?? entry.countryCode;
          return (
            <ExportReadinessCountryRow
              key={entry.countryCode}
              locale={locale}
              countryName={countryName}
              projectName={projectName}
              entry={entry}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
