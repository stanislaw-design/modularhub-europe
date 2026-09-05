"use client";

import { useEffect, useState } from "react";
import type { Country, CountryCode, EligibilityStatus, ProductFamily, Project } from "@/lib/data/types";
import { getAllLocalProducerProjects } from "@/lib/local-client-projects";
import { matchesResultsFilter, sortResults, type SortOption } from "@/lib/results-filters";
import type { SizeThreshold } from "@/lib/size-thresholds";
import { ScrollReveal, Stack } from "@/components/ui";
import { EmptyResults } from "./EmptyResults";
import { ResultCard } from "./ResultCard";
import { ResultsHeader } from "./ResultsHeader";
import { ShortlistActionBar } from "./ShortlistActionBar";

const MAX_SELECTED = 3;

export interface ResultItem {
  project: Project;
  countryName: string;
  eligibilityStatus?: EligibilityStatus;
  /** Doklejone lokalnie z localStorage producenta w tej przeglądarce (spec 0016,
   * AC-11), nigdy zaznaczalne, nie liczy się do zapytania. */
  localPreview?: boolean;
  /** Czy zalogowany klient już zapisał ten projekt do ulubionych (spec 0024 AC-2). */
  favorited?: boolean;
}

interface ResultsSelectionProps {
  serverItems: ResultItem[];
  locale: string;
  countries: Country[];
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
  family: ProductFamily;
  /** Kolejność bieżących wyników (spec 0026 AC-5): przekazywana tak, żeby domklejenie
   * lokalnych produktów producenta po zamontowaniu (poniżej) sortowało scaloną listę
   * tą samą regułą, nie tylko domyślną. */
  sort?: SortOption;
  /** Sesja istnieje i ma rolę client (spec 0024 Key invariants): serce staje
   * się przyciskiem zamiast linku do logowania. */
  isClientSession: boolean;
}

// Nagłówek i pusty stan (dawniej po stronie serwera w page.tsx) żyją teraz tutaj,
// bo ich prawdziwa liczba pozycji jest znana dopiero po doklejeniu lokalnych
// produktów producenta po zamontowaniu (spec 0016, AC-11, AC-12, AC-14). Brak
// lokalnych produktów (typowy przypadek) renderuje dokładnie to, co wcześniej
// renderował page.tsx, sprzed spec 0016.
export function ResultsSelection({
  serverItems,
  locale,
  countries,
  countryCode,
  sizeMin,
  sizeMax,
  family,
  sort,
  isClientSession,
}: ResultsSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [items, setItems] = useState<ResultItem[]>(serverItems);
  const [localAddedCount, setLocalAddedCount] = useState(0);

  useEffect(() => {
    const { projects: localProjects, eligibility: localEligibility } = getAllLocalProducerProjects();
    const eligibilityByProjectId = new Map(localEligibility.map((row) => [row.projectId, row.status]));
    const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

    const matching = localProjects.filter((project) =>
      matchesResultsFilter(
        project.floorAreaM2,
        eligibilityByProjectId.get(project.id),
        { countryCode, sizeMin, sizeMax, family },
        project.family
      )
    );

    const localItems: ResultItem[] = matching.map((project) => ({
      project,
      countryName: countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction,
      eligibilityStatus: eligibilityByProjectId.get(project.id),
      localPreview: true,
    }));

    // Zawsze liczony od serverItems (prop), nigdy od poprzedniego stanu items: powtórne
    // odpalenie tego samego efektu (dev-mode strict, albo nawigacja z nowym filtrem
    // przez router.push, spec 0026) ma dać ten sam wynik, nigdy duplikat.
    const merged = [...serverItems, ...localItems];
    const byId = new Map(merged.map((item) => [item.project.id, item]));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji/nawigacji, ten sam wzorzec co ProjectWizard
    setItems(sortResults(merged.map((item) => item.project), sort).map((project) => byId.get(project.id)!));
    setLocalAddedCount(localItems.length);
  }, [serverItems, countries, countryCode, sizeMin, sizeMax, family, sort]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  }

  const limitReached = selectedIds.length >= MAX_SELECTED;

  if (items.length === 0) {
    return <EmptyResults locale={locale} family={family} />;
  }

  return (
    <Stack gap={5}>
      <ResultsHeader count={items.length} family={family} countryCode={countryCode} />
      {localAddedCount > 0 && (
        <span role="status" aria-live="polite" className="sr-only">
          Dodano {localAddedCount} Twoich produktów do listy.
        </span>
      )}
      <div className={selectedIds.length > 0 ? "pb-24" : undefined}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-brand-4">
          {items.map(({ project, countryName, eligibilityStatus, localPreview, favorited }, index) => (
            <ScrollReveal
              key={project.id}
              className="h-full"
              style={{ transitionDelay: `${Math.min(index * 60, 480)}ms` }}
            >
              <ResultCard
                project={project}
                countryName={countryName}
                locale={locale}
                eligibilityStatus={eligibilityStatus}
                selected={selectedIds.includes(project.id)}
                selectionDisabled={limitReached && !selectedIds.includes(project.id)}
                onToggleSelect={localPreview ? undefined : () => toggle(project.id)}
                countryCode={countryCode}
                localPreview={localPreview}
                favorite={{ isClientSession, initialFavorited: favorited ?? false }}
              />
            </ScrollReveal>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <ShortlistActionBar
            locale={locale}
            selectedCount={selectedIds.length}
            maxSelected={MAX_SELECTED}
            projectIds={selectedIds}
            countryCode={countryCode}
            sizeMin={sizeMin}
            sizeMax={sizeMax}
          />
        )}
      </div>
    </Stack>
  );
}
