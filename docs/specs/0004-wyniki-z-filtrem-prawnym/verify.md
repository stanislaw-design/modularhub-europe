# Verify: Wyniki z filtrem prawnym (klient) · spec 0004 · updated 2026-08-13
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl/klient/wyniki` with no query params → all 6 mock projects render, header reads "6 domów" with no country named, discreet hint about choosing a country is shown → AC-1, AC-3, AC-9
- [ ] Visit `/pl/klient/wyniki?country=DE&sizeMin=50&sizeMax=100` → only projects eligible (`approved`/`conditional`) in DE with `floorAreaM2` in [50,100] show (Modulor Family 90 with badge, Modulor Compact 56, Karpaty Ridge 72 with badge), sorted featured-first then by ascending `priceMin` → AC-1, AC-2, AC-4, AC-7, AC-12
- [ ] Visit `/pl/klient/wyniki?country=FR&sizeMin=50` → invalid country silently ignored (no error, all countries considered), `sizeMin` still filters out Baltyk Studio 38 (38 m²), 5 results shown → AC-5, AC-6
- [ ] Visit `/pl/klient/wyniki?sizeMin=150&sizeMax=50` → reversed range, both values dropped, all 6 projects shown unfiltered by size → AC-6
- [ ] Visit `/pl/klient/wyniki?country=NL` → "Baltyk Studio 38" shows the "Wymaga dodatkowych dokumentów" badge (conditional in NL); "Karpaty Alpine 104" (blocked in NL) does not appear → AC-2, AC-7
- [ ] Visit `/pl/klient/wyniki?country=NL&sizeMin=200` → no projects match; empty-state card renders with a "Wyczyść filtry" action instead of an empty grid → AC-10
- [ ] On the results page, use the filter bar to change Kraj/Metraż od/Metraż do and click Szukaj → URL query params update and the result list refreshes accordingly → AC-11
- [ ] `CategoryFilterBar` renders between the filter bar and the results header/grid, all its buttons disabled (same placeholder as the home page) → AC-13
- [ ] Each result card (not a link) shows: photo, name, price range (home+transport+assembly total), producer name + country of production, floor area + bedroom count → AC-7, AC-8
- [ ] Keyboard-only pass: Tab reaches skip link → header nav → filter bar fields (Kraj, Metraż od, Metraż do, Szukaj) in order → CategoryFilterBar is skipped (disabled) → every focused interactive element shows the `.focus-ring` box-shadow; page has exactly one real `<h1>` (in `ResultsHeader`) → AC-14
- [ ] From `/pl/klient` (home), click a "Polecane domy" card → navigates to `/pl/klient/wyniki` with the size range matching that project's `floorAreaM2` (regression check on the `Hero.tsx` → `SearchSegment` extraction)

## Commands
- [ ] `npm run build` → compiles cleanly, `/[locale]/klient/wyniki` listed as a dynamic (ƒ) route → AC-1
- [ ] `npx tsc --noEmit` → no type errors
- [ ] `npm run lint` → no lint errors

## Acceptance-criteria coverage
- AC-1 … route + searchParams read, covered by the no-params and DE/50/100 steps
- AC-2 … country eligibility filter (approved/conditional shown, blocked hidden), covered by DE and NL steps
- AC-3 … no country = no legal filter, covered by the no-params step
- AC-4 … size range filter (closed interval), covered by the DE/50/100 step
- AC-5 … invalid country ignored, covered by the `country=FR` step
- AC-6 … invalid/reversed size values ignored per-field, covered by the `country=FR&sizeMin=50` and reversed-range steps
- AC-7 … card contents + conditional badge, covered by the card-contents and NL badge steps
- AC-8 … card is not a link, covered by the card-contents step
- AC-9 … header count (Polish plural) + country naming + hint, covered by the no-params and DE/50/100 steps
- AC-10 … empty state with action, covered by the `country=NL&sizeMin=200` step
- AC-11 … filter bar updates URL and results, covered by the filter-bar interaction step
- AC-12 … sort order (featured first, then price ascending), covered by the DE/50/100 step
- AC-13 … `CategoryFilterBar` placement, covered by its own step
- AC-14 … accessibility (one H1, focus order, focus-ring), covered by the keyboard-only pass
