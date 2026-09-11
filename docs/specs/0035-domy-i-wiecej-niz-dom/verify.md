# Verify: grupy wyszukiwania: domy i więcej niż dom · spec 0035 · updated 2026-09-11
_Steps derived from spec 0035 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Otwórz `/pl/klient` → karta wyszukiwania w hero pokazuje dokładnie dwa przyciski rodziny, "Domy" i "Więcej niż dom" (nie trzy) → AC-1
- [ ] W hero wybierz "Więcej niż dom", wybierz kraj, kliknij "Szukaj" → trafiasz na `/wyniki?country=...&family=wiecej-niz-dom`, wyniki łączą spa modułowe i pergolę → AC-2
- [ ] Na `/wyniki?family=wiecej-niz-dom&country=PL` kliknij podkategorię "Spa modułowe" w drugim poziomie `FamilyTabs` → wynik zawęża się do spa modułowego, `country=PL` zostaje zachowany w linku → AC-3
- [ ] Z widoku zawężonego do "Spa modułowe" kliknij "Wszystko" → wracasz do widoku łączonego `family=wiecej-niz-dom` → AC-3
- [ ] Na `/wyniki?family=wiecej-niz-dom` ani `CategoryFilterBar` (chipy atrybutów domu), ani `SubcategoryFilterBar` (chipy podkategorii) się nie renderują → AC-6
- [ ] Na `/wyniki?family=dom` `CategoryFilterBar` renderuje się jak dawniej; na `/wyniki?family=spa-modulowe` lub `?family=pergola` renderuje się `SubcategoryFilterBar` jak dawniej → AC-6
- [ ] W karcie wyszukiwania w hero pola Budżet i Powierzchnia mają te same opcje i zachowanie niezależnie od tego, czy aktywna jest "Domy" czy "Więcej niż dom" → AC-5
- [ ] Wejście na `/wyniki?family=nieznana-wartosc` łagodnie pada na `family=dom` (bez błędu, bez pustego ekranu) → AC-7
- [ ] Stare, zapisane linki `/wyniki?family=dom`, `/wyniki?family=spa-modulowe`, `/wyniki?family=pergola` nadal działają bez zmian → AC-7
- [ ] Przełącz stronę na `en` i `nl` (`/en/klient`, `/nl/klient`) → hero i `/wyniki` pokazują przetłumaczone etykiety grup, brak `MISSING_MESSAGE` w konsoli/logu serwera → AC-8

## Commands
- [ ] `npx vitest run lib/results-filters.test.ts lib/data/projects.test.ts components/klient/FamilyTabs.test.tsx components/klient/SearchCard.test.tsx components/klient/ResultsHeader.test.tsx components/klient/EmptyResults.test.tsx` → wszystkie testy przechodzą (126/126 przy ostatnim uruchomieniu) → AC-1, AC-2, AC-3, AC-4, AC-7, AC-8
- [ ] `npx tsc --noEmit -p tsconfig.json` → brak błędów typów → AC-4
- [ ] `npm run lint` (tylko zmienione pliki) → brak nowych błędów → —

## Acceptance-criteria coverage
- AC-1 (dwa przyciski w hero) · covered by UI step 1, `SearchCard.test.tsx`
- AC-2 (wybór "Więcej niż dom" → `/wyniki?family=wiecej-niz-dom`, wyniki połączone) · covered by UI step 2, `SearchCard.test.tsx`, `projects.test.ts` (`filters by the wiecej-niz-dom group`)
- AC-3 (doprecyzowanie/powrót do widoku łączonego, zachowanie country/size) · covered by UI steps 3-4, `FamilyTabs.test.tsx`
- AC-4 (jedno typowane miejsce, `FAMILY_GROUPS`) · covered by code review (`lib/product-family-groups.ts`), typecheck
- AC-5 (Budżet/Powierzchnia bez zmian) · covered by UI step 7, `SearchCard.test.tsx` ("keeps Budżet i Powierzchnia unchanged")
- AC-6 (widoczność `CategoryFilterBar`/`SubcategoryFilterBar` bez zmian) · covered by UI steps 5-6, istniejące `CategoryFilterBar.test.tsx`/`SubcategoryFilterBar.test.tsx` (niezmienione, nadal zielone)
- AC-7 (łagodny fallback na `dom`, stare linki działają) · covered by UI steps 8-9, `results-filters.test.ts` ("falls back to dom for an unknown family value")
- AC-8 (trzy locale, brak brakujących kluczy) · covered by UI step 10, `ResultsHeader.test.tsx`/`EmptyResults.test.tsx` (nowe testy `wiecej-niz-dom`), manualna weryfikacja żywego dev servera (patrz notatka w raporcie builda: `MISSING_MESSAGE` faktycznie złapany i naprawiony podczas tego builda)
