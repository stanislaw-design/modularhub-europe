"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Container, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";
import type { SizeThreshold } from "@/lib/size-thresholds";

interface ShortlistActionBarProps {
  locale: string;
  selectedCount: number;
  maxSelected: number;
  projectIds: string[];
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

export function ShortlistActionBar({
  locale,
  selectedCount,
  maxSelected,
  projectIds,
  countryCode,
  sizeMin,
  sizeMax,
}: ShortlistActionBarProps) {
  const t = useTranslations("ShortlistActionBar");
  const router = useRouter();

  function handleSubmit() {
    const params = new URLSearchParams({ projects: projectIds.join(",") });
    if (countryCode) params.set("country", countryCode);
    if (sizeMin !== undefined) params.set("sizeMin", String(sizeMin));
    if (sizeMax !== undefined) params.set("sizeMax", String(sizeMax));
    router.push(`/${locale}/klient/zapytanie?${params.toString()}`);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-v5-line bg-brand-v5-surface/95 backdrop-blur">
      <Container className="flex items-center justify-between gap-brand-3 py-brand-2">
        <Text tone="muted" surface="v5">
          {t("selectedCount", { count: selectedCount, max: maxSelected })}
        </Text>
        <Button onClick={handleSubmit} surface="v5">
          {t("sendInquiry")}
        </Button>
      </Container>
    </div>
  );
}
