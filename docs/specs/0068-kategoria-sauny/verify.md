# Verify: kategoria sauny · spec 0068 · updated 2026-10-06
_Steps derived from spec 0068 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/pl/sauna`, `/en/sauna`, `/de/sauna`, `/nl/sauna` → each answers 200, lists the published saunas, has one h1 and a breadcrumb → AC-1, AC-3
- [ ] Open `/pl/sauna/<slug>` of an existing sauna → renders as before → AC-1
- [ ] Open `/pl/sauna?seatingMin=8&priceMax=5000` → 200, empty state, "Wyczyść filtry" points to `/pl/sauna` → AC-2
- [ ] View source of `/pl/sauna` → canonical `/pl/sauna`, hreflang for pl, en, de, nl, `ItemList` JSON-LD → AC-4
- [ ] View source of `/pl/sauna?seatingMin=4` → `noindex, follow`, canonical `/pl/sauna`, no JSON-LD → AC-4
- [ ] Open `/pl/results?family=spa-modulowe&spaSubcategory=sauna` → works as before → AC-5
- [ ] On `/pl`, tab "Więcej niż dom", click "Sauny" → lands on `/pl/sauna`; the other three links still go to `/pl/results?family=...` → AC-6
- [ ] Click "6+ miejsc" twice → first click narrows the list and sets `aria-current`, second click clears it → AC-7, AC-10
- [ ] Click each price chip → list narrows to that "od" price range → AC-8
- [ ] Click a producer chip, click it again → filters, then clears → AC-9
- [ ] Open `/pl/sauna?seatingMin=abc&priceMin=99&producer=abc` → 200, full list, no error → AC-10
- [ ] Select 2 saunas, click "Porównaj sauny" → `/pl/compare?products=...&kind=sauna` with an eleven row table; a fourth checkbox is disabled after three → AC-12, AC-13
- [ ] Open `/pl/compare?kind=sauna&products=<sauna>,<jacuzzi or removed id>` → second column "Ta sauna jest niedostępna", back link goes to `/pl/sauna` → AC-14
- [ ] Open `/pl/compare?products=<dom>,<dom>` with and without `kind=nonsense` → house comparison as before → AC-13

## Commands
- [ ] `npx vitest run lib/sauna-filters.test.ts lib/compare-rows.test.ts "app/[locale]/(customer)/sauna/page.test.tsx" "app/[locale]/(customer)/compare/page.test.tsx" components/klient/CompareSelectionBar.test.tsx components/klient/ResultsSelection.test.tsx components/klient/SearchCard.test.tsx` → all pass → AC-1 to AC-15
- [ ] `npx vitest run lib/data/projects.test.ts lib/results-filters.test.ts components/klient/ProjectCompareTable.test.tsx` (needs `DATABASE_URL`, dev) → pass without edits → AC-11, AC-15
- [ ] `npx playwright test e2e/kategoria-sauny.spec.ts` → 8 passed → AC-1, AC-7, AC-12, AC-13
- [ ] `npx tsc --noEmit` and `npx eslint` on the changed files → clean

## Acceptance-criteria coverage
- AC-1 … steps 1, 2 · AC-2 … step 3 · AC-3 … step 1 · AC-4 … steps 4, 5 · AC-5 … step 6 · AC-6 … step 7 · AC-7 … step 8 · AC-8 … step 9 · AC-9 … step 10 · AC-10 … steps 8, 11 · AC-11 … DB tests · AC-12 … step 12 · AC-13 … steps 12, 14 · AC-14 … step 13 · AC-15 … compare-rows test and ProjectCompareTable test
