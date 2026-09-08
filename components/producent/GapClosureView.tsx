"use client";

import { useTranslations } from "next-intl";
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

export function GapClosureView({ countryCode, countryName, projectName, mapHref }: GapClosureViewProps) {
  const t = useTranslations("GapClosureView");
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
        {projectName
          ? t("headingWithProject", { country: countryName, project: projectName })
          : t("heading", { country: countryName })}
      </Heading>
      <Text tone="muted" measure>
        {t("disclaimer")}
      </Text>

      {resolved ? (
        <Card as="div" padding="md">
          <Stack gap={2} align="start">
            <Text>{t("alreadyResolved")}</Text>
            <Button as="a" href={mapHref} variant="secondary" className="w-fit">
              {t("backToMap")}
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
