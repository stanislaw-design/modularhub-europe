"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScrollReveal, Stack } from "@/components/ui";
import type { FavoriteListEntry } from "@/lib/data/projects";
import { FavoriteCard } from "./FavoriteCard";
import { FavoriteCompareTable } from "./FavoriteCompareTable";

interface FavoritesGridProps {
  locale: string;
  favorites: FavoriteListEntry[];
  /** Wartość początkowa, już zwalidowana przez stronę serwerową (własne
   * ulubione, bez duplikatów, maksymalnie 3, spec 0024 Key invariants). */
  selectedIds: string[];
  maxSelected: number;
}

// Zaznaczenie do porównania trzyma lokalny stan (checkbox i tabela reagują od
// razu, ten sam wzorzec co ResultsSelection na /wyniki), zsynchronizowany na
// zewnątrz do parametru URL `compare` w tle (spec 0024 AC-6: przetrwa
// odświeżenie strony). Sterowanie wyłącznie przez sam parametr URL jako prop
// (bez lokalnego stanu) resetowało checkbox z powrotem zaraz po kliknięciu —
// `selected` nie zdążył się zmienić, zanim React wymusił ponowne
// wyrenderowanie po zdarzeniu onChange, więc kliknięcie wyglądało, jakby nic
// nie robiło, aż do zakończenia pełnej nawigacji.
export function FavoritesGrid({ locale, favorites, selectedIds: initialSelectedIds, maxSelected }: FavoritesGridProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  // Liczony wprost z bieżącego stanu (closure), nie przez funkcyjny setState:
  // router.replace jest efektem ubocznym, więc nie może żyć wewnątrz funkcji
  // aktualizującej setState — React może ją wywołać więcej niż raz albo w fazie
  // renderowania, zanim router jest gotowy przyjąć akcję ("Router action
  // dispatched before initialization").
  function toggle(id: string) {
    let next: string[];
    if (selectedIds.includes(id)) {
      next = selectedIds.filter((existing) => existing !== id);
    } else if (selectedIds.length >= maxSelected) {
      return;
    } else {
      next = [...selectedIds, id];
    }

    setSelectedIds(next);

    const params = new URLSearchParams();
    if (next.length > 0) params.set("compare", next.join(","));
    const query = params.toString();
    // replace, nie push: każde zaznaczenie/odznaczenie nie powinno dokładać
    // wpisu do historii przeglądarki (przycisk wstecz wracałby po jednym
    // checkboxie naraz).
    router.replace(`/${locale}/panel/favorites${query ? `?${query}` : ""}`, { scroll: false });
  }

  const limitReached = selectedIds.length >= maxSelected;
  const selectedFavorites = favorites.filter((entry) => selectedIds.includes(entry.project.id));

  return (
    <Stack gap={4}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-brand-4">
        {favorites.map((entry, index) => (
          <ScrollReveal
            key={entry.project.id}
            className="h-full"
            style={{ transitionDelay: `${Math.min(index * 60, 480)}ms` }}
          >
            <FavoriteCard
              entry={entry}
              locale={locale}
              selected={selectedIds.includes(entry.project.id)}
              selectionDisabled={limitReached && !selectedIds.includes(entry.project.id)}
              onToggleSelect={() => toggle(entry.project.id)}
            />
          </ScrollReveal>
        ))}
      </div>
      {selectedFavorites.length >= 2 && <FavoriteCompareTable favorites={selectedFavorites} />}
    </Stack>
  );
}
