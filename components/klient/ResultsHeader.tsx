import { useTranslations } from "next-intl";
import { Text } from "@/components/ui";
import { CategoryHeading } from "./CategoryHeading";
import type { CountryCode } from "@/lib/data/types";
import type { FamilyFilterValue } from "@/lib/product-family-groups";

interface ResultsHeaderProps {
  locale: string;
  count: number;
  family: FamilyFilterValue;
  countryCode?: CountryCode;
}

export function familyCountBucket(count: number): "one" | "few" | "many" {
  if (count === 1) return "one";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) return "few";
  return "many";
}

// Only ever rendered from ResultsSelection ("use client"), so it's already
// part of the client bundle regardless of its own directive — useTranslations
// (client safe), never getTranslations (server only, and this file's only
// caller can't render a nested async Server Component anyway).
// Nazwa rodziny w nagłówku to ta sama etykieta, co w przełączniku rodzin (FamilyTabs).
const FAMILY_TITLE_KEY = {
  dom: "home",
  "wiecej-niz-dom": "more",
  "spa-modulowe": "spa",
  "kontenery-modulowe": "containers",
  "outdoor-tv": "outdoorTv",
} as const satisfies Record<FamilyFilterValue, string>;

export function ResultsHeader({ locale, count, family, countryCode }: ResultsHeaderProps) {
  const t = useTranslations("ResultsHeader");
  const tCountry = useTranslations("CountryLocative");
  const tFamily = useTranslations("ProductFamilyNoun");
  const tTabs = useTranslations("FamilyTabs");
  const familyFew = tFamily(`${family}.few`);

  return (
    <div className="flex flex-col gap-brand-1">
      <CategoryHeading locale={locale} title={tTabs(FAMILY_TITLE_KEY[family])} count={count} />
      <Text tone="muted" surface="v5">
        {countryCode
          ? t("eligibleLine", { country: tCountry(countryCode) })
          : family === "outdoor-tv"
            ? t("hintOutdoorTv")
            : t("hint", { familyFew })}
      </Text>
    </div>
  );
}
