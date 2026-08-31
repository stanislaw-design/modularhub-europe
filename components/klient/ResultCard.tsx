import { Clock3, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, Checkbox, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { isLocalProjectId } from "@/lib/local-client-projects";
import { getMockAssemblyPriceEur, getMockTransportPriceEur } from "@/lib/pricing";
import type { CountryCode, EligibilityStatus, Project } from "@/lib/data/types";

interface ResultCardProps {
  project: Project;
  countryName: string;
  /** Do budowy linku do /klient/projekt/[id] (spec 0020 AC-2). */
  locale: string;
  eligibilityStatus?: EligibilityStatus;
  selected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelect?: () => void;
  /** Target delivery country from /wyniki's `country` URL param. When
   * present, the price breaks down into dom/transport/montaż instead of the
   * flat priceMin–priceMax range (spec 0015 AC-14). */
  countryCode?: CountryCode;
  /** Doklejone lokalnie z localStorage producenta (spec 0016, AC-11): pokazuje
   * etykietę podglądu zamiast checkboxa zaznaczenia, bo ta ścieżka nie może dziś
   * wejść w zapytanie (serwer nie widzi localStorage producenta). Karta pozostaje
   * nieklikalna dla tych projektów, bo trasa /klient/projekt/[id] czyta tylko
   * katalog przykładowy (spec 0020 AC-8). */
  localPreview?: boolean;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Display name for the *target delivery* country (the countryCode prop),
// deliberately separate from the countryName prop (the project's country of
// production) — the two are different countries whenever a client searches
// a country other than where the house is built.
const targetCountryName: Record<CountryCode, string> = {
  PL: "Polski",
  DE: "Niemiec",
  NL: "Holandii",
};

const standardLabel = {
  "surowy-zamkniety": "Stan surowy zamknięty",
  deweloperski: "Standard deweloperski",
  "pod-klucz": "Pod klucz",
} as const;

function roomsLabel(count: number) {
  return count === 1 ? "pokój" : count >= 2 && count <= 4 ? "pokoje" : "pokoi";
}

export function ResultCard({
  project,
  countryName,
  locale,
  eligibilityStatus,
  selected,
  selectionDisabled,
  onToggleSelect,
  countryCode,
  localPreview,
}: ResultCardProps) {
  const transportPrice = countryCode ? getMockTransportPriceEur(countryCode) : null;
  const assemblyPrice = countryCode ? getMockAssemblyPriceEur(countryCode) : null;
  const totalPrice =
    transportPrice !== null && assemblyPrice !== null
      ? project.commercial.housePriceMinEur + transportPrice + assemblyPrice
      : null;
  const isClickable = !localPreview && !isLocalProjectId(project.id);
  const href = isClickable
    ? `/${locale}/klient/projekt/${project.id}${countryCode ? `?country=${countryCode}` : ""}`
    : undefined;

  return (
    <Card as="article" padding="none" className="relative flex h-full flex-col overflow-hidden">
      {href && (
        <Link
          href={href}
          className="focus-ring absolute inset-0 z-0 rounded-card"
          aria-label={`Zobacz szczegóły projektu ${project.name}`}
        />
      )}
      <div className="relative aspect-[3/2] overflow-hidden">
        <Image
          src={project.coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {onToggleSelect && !localPreview && (
          <label className="absolute right-brand-2 top-brand-2 z-10 flex items-center justify-center rounded-data bg-brand-warm-white/95 p-1.5 shadow-sm">
            <span className="sr-only">Zaznacz {project.name} do zapytania</span>
            <Checkbox
              checked={selected ?? false}
              disabled={selectionDisabled}
              onChange={onToggleSelect}
              title={selectionDisabled ? "Można zaznaczyć maksymalnie 3 projekty" : undefined}
            />
          </label>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        {localPreview && (
          <span className="w-fit rounded-data bg-brand-passage-blue/10 px-2 py-0.5 text-label font-medium uppercase tracking-[0.1em] text-brand-passage-blue">
            Twój dodany produkt (podgląd)
          </span>
        )}
        {eligibilityStatus === "conditional" && (
          <StatusPill status="conditional">Wymaga dodatkowych dokumentów</StatusPill>
        )}
        <div className="flex flex-col gap-1">
          <Heading level="h3" className="text-body-l">
            {project.name}
          </Heading>
          <Text tone="muted" className="flex items-center gap-1 text-data">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{project.producerName} · {countryName}</span>
          </Text>
        </div>
        <Text className="font-medium">
          {project.floorAreaM2} m² użytkowe · {project.rooms} {roomsLabel(project.rooms)} · {project.storeys} kond.
        </Text>
        <Text tone="muted" className="text-data">
          {project.constructionSystem} · {standardLabel[project.commercial.completionStandard]}
        </Text>
        <div className="mt-auto border-t border-brand-steel pt-brand-2">
          {project.priceOnRequest ? (
            <>
              <Text variant="label" tone="muted">Cena</Text>
              <DataText as="p" className="mt-1 text-body-l font-semibold">Wycena indywidualna</DataText>
              <Text tone="muted" className="mt-1 text-data">Ustalana bezpośrednio z producentem</Text>
            </>
          ) : totalPrice !== null && transportPrice !== null && assemblyPrice !== null ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-brand-1">
                <Text tone="muted" className="text-data">Dom</Text>
                <DataText>od {priceFormatter.format(project.commercial.housePriceMinEur)} €</DataText>
              </div>
              <div className="flex items-center justify-between gap-brand-1">
                <Text tone="muted" className="text-data">
                  Transport do {countryCode ? targetCountryName[countryCode] : countryName}
                </Text>
                <DataText>~{priceFormatter.format(transportPrice)} €</DataText>
              </div>
              <div className="flex items-center justify-between gap-brand-1">
                <Text tone="muted" className="text-data">Montaż</Text>
                <DataText>~{priceFormatter.format(assemblyPrice)} €</DataText>
              </div>
              <div className="mt-1 flex items-center justify-between gap-brand-1 border-t border-brand-steel pt-1">
                <Text variant="label" tone="muted">Razem</Text>
                <DataText className="text-body-l font-semibold">
                  od {priceFormatter.format(totalPrice)} €
                </DataText>
              </div>
            </div>
          ) : (
            <>
              <Text variant="label" tone="muted">Szacowany pakiet</Text>
              <DataText as="p" className="mt-1 text-body-l font-semibold">
                {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
              </DataText>
              <Text tone="muted" className="mt-1 text-data">Dom + standardowy transport + montaż</Text>
            </>
          )}
        </div>
        <Text tone="muted" className="flex items-center gap-1 text-data">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          {project.commercial.productionLeadTimeWeeksMin}–{project.commercial.productionLeadTimeWeeksMax} tyg. produkcji · {project.commercial.onSiteAssemblyDaysMin}–{project.commercial.onSiteAssemblyDaysMax} dni montażu
        </Text>
      </div>
    </Card>
  );
}
