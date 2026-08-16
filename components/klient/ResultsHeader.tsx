import { Heading, Text } from "@/components/ui";
import type { CountryCode } from "@/lib/data/types";

interface ResultsHeaderProps {
  count: number;
  countryCode?: CountryCode;
}

// Fixed closed set (PL/DE/NL, per CountryCode) — locative case ("w Niemczech") has no general
// rule in Polish, so each is spelled out rather than derived.
const COUNTRY_LOCATIVE: Record<CountryCode, string> = {
  PL: "w Polsce",
  DE: "w Niemczech",
  NL: "w Holandii",
};

function pluralizeDomy(count: number): string {
  if (count === 1) return "dom";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) return "domy";
  return "domów";
}

export function ResultsHeader({ count, countryCode }: ResultsHeaderProps) {
  return (
    <div className="flex flex-col gap-brand-1">
      <Heading level="h1">
        {count} {pluralizeDomy(count)}
        {countryCode ? ` dopuszczonych ${COUNTRY_LOCATIVE[countryCode]}` : ""}
      </Heading>
      {!countryCode && (
        <Text tone="muted">
          Wybierz kraj w pasku wyżej, żeby zobaczyć, które domy są tam dopuszczone prawnie.
        </Text>
      )}
    </div>
  );
}
