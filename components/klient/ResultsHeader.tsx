import { useTranslations } from "next-intl";
import { Heading, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";
import type { FamilyFilterValue } from "@/lib/product-family-groups";

interface ResultsHeaderProps {
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
export function ResultsHeader({ count, family, countryCode }: ResultsHeaderProps) {
  const t = useTranslations("ResultsHeader");
  const tCountry = useTranslations("CountryLocative");
  const tFamily = useTranslations("ProductFamilyNoun");
  const familyFew = tFamily(`${family}.few`);
  const familyForCount = tFamily(`${family}.${familyCountBucket(count)}`);

  return (
    <div className="flex flex-col gap-brand-1">
      <Heading level="h1" surface="v5">
        {count} {familyForCount}
        {countryCode ? t("eligibleSuffix", { country: tCountry(countryCode) }) : ""}
      </Heading>
      {!countryCode && (
        <Text tone="muted" surface="v5">
          {t("hint", { familyFew })}
        </Text>
      )}
    </div>
  );
}
