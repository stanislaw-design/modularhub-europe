"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, DataText, Heading, Stack, StatusPill, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";
import { markCountryResolved } from "@/lib/gap-closure";
import { PLOT_ANALYSIS_PRICE_EUR } from "@/lib/pricing";

interface GapClosurePackageSectionProps {
  countryCode: CountryCode;
  mapHref: string;
}

type PackagePhase = "idle" | "paying" | "result";

const PAYMENT_DELAY_MS = 1200;
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export function GapClosurePackageSection({ countryCode, mapHref }: GapClosurePackageSectionProps) {
  const [phase, setPhase] = useState<PackagePhase>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "paying") return;
    timerRef.current = setTimeout(() => {
      markCountryResolved(countryCode);
      setPhase("result");
    }, PAYMENT_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, countryCode]);

  return (
    <Card as="div" padding="md">
      <Stack gap={3} align="start">
        <Heading level="h2">Kup pakiet domknięcia luk</Heading>
        <Text tone="muted" measure>
          Kupujemy w Twoim imieniu komplet brakujących dokumentów i deklarujemy kraj jako dopuszczony.
        </Text>
        <div className="flex items-baseline justify-between gap-brand-2">
          <Text as="span" variant="label" tone="muted">
            Cena pakietu
          </Text>
          <DataText>{priceFormatter.format(PLOT_ANALYSIS_PRICE_EUR)} €</DataText>
        </div>

        {phase === "idle" && (
          <Button type="button" onClick={() => setPhase("paying")} className="w-fit">
            Zapłać
          </Button>
        )}

        {phase === "paying" && (
          <div aria-live="polite" className="flex items-center gap-brand-2">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <Text tone="muted">Przetwarzanie płatności…</Text>
          </div>
        )}

        {phase === "result" && (
          <div aria-live="polite">
            <Stack gap={2} align="start">
              <StatusPill status="approved">Dopuszczone</StatusPill>
              <Text>Pakiet opłacony — kraj jest teraz dopuszczony.</Text>
              <Button as="a" href={mapHref} variant="secondary" className="w-fit">
                Wróć do mapy gotowości eksportowej
              </Button>
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}
