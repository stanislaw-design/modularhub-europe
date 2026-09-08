"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("GapClosurePackageSection");
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
        <Heading level="h2">{t("heading")}</Heading>
        <Text tone="muted" measure>
          {t("intro")}
        </Text>
        <div className="flex items-baseline justify-between gap-brand-2">
          <Text as="span" variant="label" tone="muted">
            {t("priceLabel")}
          </Text>
          <DataText>{priceFormatter.format(PLOT_ANALYSIS_PRICE_EUR)} €</DataText>
        </div>

        {phase === "idle" && (
          <Button type="button" onClick={() => setPhase("paying")} className="w-fit">
            {t("payButton")}
          </Button>
        )}

        {phase === "paying" && (
          <div aria-live="polite" className="flex items-center gap-brand-2">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <Text tone="muted">{t("processingPayment")}</Text>
          </div>
        )}

        {phase === "result" && (
          <div aria-live="polite">
            <Stack gap={2} align="start">
              <StatusPill status="approved">{t("approvedStatus")}</StatusPill>
              <Text>{t("paidMessage")}</Text>
              <Button as="a" href={mapHref} variant="secondary" className="w-fit">
                {t("backToMap")}
              </Button>
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}
