"use client";

import { useState } from "react";
import type { CountryCode, EligibilityStatus, ProductFamily, Project } from "@/lib/data/types";
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
  /** Czy zalogowany klient już zapisał ten projekt do ulubionych (spec 0024 AC-2). */
  favorited?: boolean;
}

interface ResultsSelectionProps {
  serverItems: ResultItem[];
  locale: string;
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
  family: ProductFamily;
  /** Sesja istnieje i ma rolę client (spec 0024 Key invariants): serce staje
   * się przyciskiem zamiast linku do logowania. */
  isClientSession: boolean;
}

// Nagłówek i pusty stan (dawniej po stronie serwera w page.tsx) żyją teraz tutaj
// (spec 0016 AC-14); serverItems są już przefiltrowane i posortowane przez
// page.tsx (getProjects + sortResults), więc ten komponent tylko je renderuje.
export function ResultsSelection({
  serverItems,
  locale,
  countryCode,
  sizeMin,
  sizeMax,
  family,
  isClientSession,
}: ResultsSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const items = serverItems;

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
      <div className={selectedIds.length > 0 ? "pb-24" : undefined}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-brand-4">
          {items.map(({ project, countryName, eligibilityStatus, favorited }, index) => (
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
                onToggleSelect={() => toggle(project.id)}
                countryCode={countryCode}
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
