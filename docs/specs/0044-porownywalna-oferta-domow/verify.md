# Verify: porównywalna oferta domów · spec 0044 · updated 2026-09-17

_Steps derived from spec 0044 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

**Scope built this run**: Section A (karta na wynikach) and Section B (wybór i widok porównania), minus the five cost-category rows (AC-8, explicitly deferred by the spec's own Plan realizacji #5 pending a data-mapping decision). Section C (panel producenta, AC-11–13) is not built yet.

## UI / manual

- [ ] On `/results`, open a "dom" family product whose default variant has a real price and `scopeSummary` → the price block shows the variant's name/standard and that scope text right next to the price → AC-1
- [ ] On `/results`, open a "dom" family product whose default variant has a price but no `scopeSummary` → the price block shows "Zakres do potwierdzenia" instead of hiding the line → AC-2
- [ ] On `/results`, a product with no real variant (or `priceOnRequest`) shows "Wycena indywidualna" and no per-m² price → AC-2
- [ ] A product with at least one `product_floor_plan` document shows a "Rzut dostępny" link on its `ResultCard`; clicking it lands on `/project/[id]?zakladka=rzut` (with `country` preserved when set) → AC-3
- [ ] A product with no floor-plan document shows no such link → AC-3
- [ ] On `/results` (family = dom), each card shows a "Porównaj" checkbox separate from the "select for inquiry" checkbox; toggling one never affects the other → AC-4
- [ ] Selecting a non-"dom" family (e.g. "Więcej niż dom") shows no compare checkbox anywhere → AC-4
- [ ] Selecting 1 home shows the compare bar with "Do porównania: 1/3" and a disabled "Porównaj domy" button → AC-5
- [ ] Selecting 2–3 homes enables "Porównaj domy"; clicking it navigates to `/compare?products=id1,id2[,id3]` (plus `country` if set) → AC-5
- [ ] Copying the resulting `/compare` URL into a fresh, logged-out browser tab reproduces the exact same comparison → AC-5
- [ ] `/compare` with 2 real, published "dom" products renders up to 3 columns, each with photo/no-photo state, name (linking to `/project/[id]`), producer, price or "Wycena indywidualna", scope or "Zakres do potwierdzenia" → AC-6
- [ ] For a product with 2+ real variants, its column shows a variant picker; clicking a different standard updates only that column's price/scope/standard and adds `?v_<id>=<standard>` to the URL, leaving other columns and params untouched → AC-6
- [ ] Row set present: powierzchnia użytkowa, powierzchnia zabudowy, sypialnie, łazienki, kondygnacje, wymiary zewnętrzne, standard wykończenia, czas produkcji i montażu, dostępność rzutu; missing values read "Nie podano", never `0`/blank/guessed → AC-7 (minus the 5 cost-category rows, deferred)
- [ ] "Pokaż tylko różnice" hides only rows where every column has an equal, known value; any row with a missing value in any column stays visible → AC-9
- [ ] On a narrow viewport, the table scrolls horizontally while the row-label column stays pinned, keeping each value legible against its model → AC-9
- [ ] Visiting `/compare?products=<validId>,<removedOrUnpublishedId>` keeps the valid column, marks the other "Niedostępny" with a hint and a working "Wróć do wyników" link → AC-10
- [ ] Visiting `/compare` with 0 or 1 id, or with every id invalid/unavailable, redirects to `/results` → AC-5, AC-10
- [ ] Keyboard-only pass: tab through the compare checkboxes, the compare bar's Clear/Compare buttons, the variant picker links, and the "only differences" checkbox — every control is reachable and shows a visible focus ring → AC-15

## Commands

- [ ] `npx vitest run lib/data/project-variants.test.ts lib/compare.test.ts components/klient/ResultCard.test.tsx components/klient/ResultsSelection.test.tsx components/klient/ProjectCompareTable.test.tsx "app/[locale]/(customer)/compare/page.test.tsx"` → all green → AC-1–AC-7, AC-9, AC-10
- [ ] `npx tsc --noEmit` → clean → all ACs (type-level contract)

## Acceptance-criteria coverage

- AC-1, AC-2 … covered by `ResultCard.test.tsx` + `project-variants.test.ts` (`getProjectPriceDisplay`) and the manual price/scope steps above
- AC-3 … covered by `ResultCard.test.tsx` floor-plan tests and the manual link steps
- AC-4 … covered by `ResultsSelection.test.tsx` compare-selection tests and the manual independence/family-gating steps
- AC-5 … covered by `compare.test.ts` (`parseCompareProjectIds`) and `page.test.tsx`'s redirect tests, plus the manual URL-shareability step
- AC-6 … covered by `ProjectCompareTable.test.tsx`'s variant-picker test and the manual per-column switching step
- AC-7 … covered by `ProjectCompareTable.test.tsx`'s row-rendering test; cost-category rows explicitly NOT covered (deferred, see spec Plan realizacji #5)
- AC-8 … NOT built this run (needs its own data-mapping decision first, per spec's Ryzyka section)
- AC-9 … covered by `ProjectCompareTable.test.tsx`'s onlyDifferences test and the manual mobile-scroll step
- AC-10 … covered by `page.test.tsx`'s unavailable/removed/wrong-family/redirect tests
- AC-11–AC-13 (panel producenta) … NOT built this run
- AC-14 … currency/formatting unchanged (no new PLN conversion added); price-per-m² not shown, so nothing to break
- AC-15 … structural coverage (semantic `<table>`, `.focus-ring` on every new control, `aria-current`/`aria-label` on the variant picker); no automated a11y audit run — the manual keyboard pass above is the actual check
