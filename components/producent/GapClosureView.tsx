"use client";

import { useEffect, useState } from "react";
import { Button, Card, Heading, Stack, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";
import { isCountryResolved } from "@/lib/gap-closure";
import { GapClosurePackageSection } from "./GapClosurePackageSection";
import { GapClosureUploadSection } from "./GapClosureUploadSection";

interface GapClosureViewProps {
  countryCode: CountryCode;
  countryName: string;
  projectName: string | null;
  mapHref: string;
}

const DISCLAIMER_TEXT =
  "To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana.";

export function GapClosureView({ countryCode, countryName, projectName, mapHref }: GapClosureViewProps) {
  // Odczyt po zamontowaniu — przy pierwszym renderze może na moment mignąć
  // pełny widok, zanim przełączy się na komunikat (spec 0010, Consequences).
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
    setResolved(isCountryResolved(countryCode));
  }, [countryCode]);

  return (
    <Stack gap={4}>
      <Heading level="h1">
        Domknij luki: {countryName}
        {projectName ? ` — „${projectName}”` : ""}
      </Heading>
      <Text tone="muted" measure>
        {DISCLAIMER_TEXT}
      </Text>

      {resolved ? (
        <Card as="div" padding="md">
          <Stack gap={2} align="start">
            <Text>Ten kraj jest już domknięty — luki zostały uzupełnione poprzez zakup pakietu.</Text>
            <Button as="a" href={mapHref} variant="secondary" className="w-fit">
              Wróć do mapy gotowości eksportowej
            </Button>
          </Stack>
        </Card>
      ) : (
        <Stack gap={4}>
          <GapClosureUploadSection mapHref={mapHref} />
          <GapClosurePackageSection countryCode={countryCode} mapHref={mapHref} />
        </Stack>
      )}
    </Stack>
  );
}
