"use client";

import { useState } from "react";
import type { CountryCode, EligibilityStatus, Project } from "@/lib/data/types";
import type { SizeThreshold } from "@/lib/size-thresholds";
import { ResultCard } from "./ResultCard";
import { ShortlistActionBar } from "./ShortlistActionBar";

const MAX_SELECTED = 3;

export interface ResultItem {
  project: Project;
  countryName: string;
  eligibilityStatus?: EligibilityStatus;
}

interface ResultsSelectionProps {
  items: ResultItem[];
  locale: string;
  countryCode?: CountryCode;
  sizeMin?: SizeThreshold;
  sizeMax?: SizeThreshold;
}

export function ResultsSelection({ items, locale, countryCode, sizeMin, sizeMax }: ResultsSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  }

  const limitReached = selectedIds.length >= MAX_SELECTED;

  return (
    <div className={selectedIds.length > 0 ? "pb-24" : undefined}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-brand-4">
        {items.map(({ project, countryName, eligibilityStatus }) => (
          <ResultCard
            key={project.id}
            project={project}
            countryName={countryName}
            eligibilityStatus={eligibilityStatus}
            selected={selectedIds.includes(project.id)}
            selectionDisabled={limitReached && !selectedIds.includes(project.id)}
            onToggleSelect={() => toggle(project.id)}
          />
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
  );
}
