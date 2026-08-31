import { Button, Heading, Stack, Text } from "@/components/ui";
import type { Country, ExportReadinessCountryStatus } from "@/lib/data/types";
import { ExportReadinessCountryRow } from "./ExportReadinessCountryRow";

interface ExportReadinessMapProps {
  locale: string;
  projectName: string | null;
  countries: Country[];
  entries: ExportReadinessCountryStatus[];
  /** Trasa do katalogu produktów, budowana z nip/countries/technology przekazanych
   * po zapisaniu produktu (spec 0016, AC-6); brak, gdy te parametry nie są obecne. */
  catalogHref: string | null;
}

const DISCLAIMER_TEXT =
  "To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana.";

export function ExportReadinessMap({
  locale,
  projectName,
  countries,
  entries,
  catalogHref,
}: ExportReadinessMapProps) {
  return (
    <Stack gap={4}>
      <Heading level="h1">
        {projectName ? `Gotowość eksportowa: „${projectName}”` : "Gotowość eksportowa"}
      </Heading>
      <Text tone="muted" measure>
        {DISCLAIMER_TEXT}
      </Text>
      {catalogHref && (
        <Button as="a" href={catalogHref} variant="secondary" className="w-fit">
          Zobacz swoje produkty
        </Button>
      )}
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
