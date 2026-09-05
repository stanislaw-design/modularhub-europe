import { Heading, Text } from "@/components/ui";
import type { CountryCode, ProductFamily } from "@/lib/data/types";

interface ResultsHeaderProps {
  count: number;
  family: ProductFamily;
  countryCode?: CountryCode;
}

// Fixed closed set (PL/DE/NL, per CountryCode) — locative case ("w Niemczech") has no general
// rule in Polish, so each is spelled out rather than derived.
const COUNTRY_LOCATIVE: Record<CountryCode, string> = {
  PL: "w Polsce",
  DE: "w Niemczech",
  NL: "w Holandii",
};

// Fixed closed set (dom/spa-modulowe/pergola, per ProductFamily, spec 0023 AC-4):
// each family's noun forms by count ("1 X" / "2-4 X" / "5+ X") plus the plural
// used in the "wybierz kraj" hint. "Spa" is an invariant Polish loanword (does
// not decline by count), so its three count forms are identical. Exported so
// EmptyResults (spec 0026 AC-11) reuses the same forms instead of duplicating them.
export const FAMILY_NOUN: Record<ProductFamily, { one: string; few: string; many: string }> = {
  dom: { one: "dom", few: "domy", many: "domów" },
  "spa-modulowe": { one: "spa modułowe", few: "spa modułowe", many: "spa modułowych" },
  pergola: { one: "pergola", few: "pergole", many: "pergoli" },
};

function pluralizeFamily(family: ProductFamily, count: number): string {
  const forms = FAMILY_NOUN[family];
  if (count === 1) return forms.one;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) return forms.few;
  return forms.many;
}

export function ResultsHeader({ count, family, countryCode }: ResultsHeaderProps) {
  return (
    <div className="flex flex-col gap-brand-1">
      <Heading level="h1" surface="v5">
        {count} {pluralizeFamily(family, count)}
        {countryCode ? ` dopuszczonych ${COUNTRY_LOCATIVE[countryCode]}` : ""}
      </Heading>
      {!countryCode && (
        <Text tone="muted" surface="v5">
          Wybierz kraj w pasku wyżej, żeby zobaczyć, które {FAMILY_NOUN[family].few} są tam dopuszczone
          prawnie.
        </Text>
      )}
    </div>
  );
}
