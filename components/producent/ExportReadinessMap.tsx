import { getTranslations } from "next-intl/server";
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

export async function ExportReadinessMap({
  locale,
  projectName,
  countries,
  entries,
  catalogHref,
}: ExportReadinessMapProps) {
  const t = await getTranslations("ExportReadinessMap");
  return (
    <Stack gap={4}>
      <Heading level="h1">
        {projectName ? t("headingWithProject", { project: projectName }) : t("heading")}
      </Heading>
      <Text tone="muted" measure>
        {t("disclaimer")}
      </Text>
      {catalogHref && (
        <Button as="a" href={catalogHref} variant="secondary" className="w-fit">
          {t("viewProducts")}
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
