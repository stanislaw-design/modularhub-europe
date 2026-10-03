# Verify: płatne opcje konfiguratora dla produktów katalogowych · spec 0059 · updated 2026-10-01
_Steps derived from spec 0059 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl/project/dampol-model-3` → page renders, right column shows "Opcje dodatkowe" with three groups (Poziom ocieplenia, Konstrukcja, Klimatyzacja), each with the real Dampol-priced options → AC-1
- [ ] Each group shows exactly one checked radio by default (the free/included option) → AC-2
- [ ] Click a priced option (e.g. "Pianka PIR 120/160mm (zalecane)") → URL gains `?opcje=<ids>`, the price card's total goes from 6297 € to 7259 € (base + 962 €), "Suma znanych pozycji" sub-line stays unaffected (cost-line-items only, unrelated metric) → AC-3
- [ ] Copy the resulting URL with `opcje` set, open it in a fresh tab → same options re-appear checked, same total price → AC-3
- [ ] Visit `/pl/project/dampol-model-3?opcje=does-not-exist,also-fake` → page renders normally, no error, price falls back to each group's default (6297 €) → AC-6
- [ ] Visit `/pl/project/dampol-model-3?opcje=<id-of-premium>,<id-of-standard>` (two ids from the same single group "Poziom ocieplenia") → only the first one wins, the second is silently dropped → AC-6
- [ ] Visit any existing product with zero assigned option groups (e.g. a `dom` family product) → page renders identically to before this spec, no "Opcje dodatkowe" section at all → AC-5
- [ ] On `/pl/project/dampol-model-3`, pick a non-default variant (e.g. "8 m x 3 m") → price card label reads "Cena · 8 m x 3 m" (variantLabel, not the generic "Wariant" completionStandard label) → AC-9
- [ ] With that non-default variant selected, click "Wyślij zapytanie" → link href contains `&wariant=<that variant's uuid>`, not `&wariant=katalogowy` → AC-9
- [ ] View page source / JSON-LD script tag on that same non-default-variant view → `offers.price` equals the selected variant's own price (e.g. 9159 for "8 m x 3 m"), not the product's cheapest variant (6297) → AC-9

## Commands
- [ ] `SELECT table_name FROM information_schema.tables WHERE table_name IN ('product_option_group','product_option','product_option_group_assignment')` against the dev Neon DB → all 3 rows returned → AC-8
- [ ] `npx vitest run lib/data/project-variants lib/db/queries components/klient/ProjectOptionsConfigurator "app/[locale]/(customer)/project/[slug]/page"` → all green → AC-1 through AC-9
- [ ] `npx tsc --noEmit` → clean → (build correctness, not tied to one AC)

## Acceptance-criteria coverage
- AC-1 … group+options render on `/project/[slug]` · covered by UI step 1, component test "renders a single group as a radiogroup"/"renders a multi group as independent checkboxes"
- AC-2 … single exclusive w/ default, multi independent, none default · covered by UI step 2, unit tests in `resolveSelectedProductOptions`
- AC-3 … `opcje` param, recomputed total, copyable link · covered by UI steps 3-4, unit tests in `toggleProductOption`
- AC-4 … priceOnRequest propagates from any selected option · covered by unit tests in `getSelectedProductOptionsPrice` ("propagates priceOnRequest from any single selected option")
- AC-5 … no-group product unchanged · covered by UI step 7, page test "renders without any options UI or price change when the product has no assigned option group"
- AC-6 … unknown/duplicate ids tolerated · covered by UI steps 5-6, unit tests "ignores unknown/stale option ids"/"resolves a single group with two ids from itself to the first"
- AC-7 … manual Neon MCP seed, end to end on Dampol Model 3 · covered by the Dampol Model 3 seed itself (dev DB) plus the live-server walkthrough done during this build
- AC-8 … migration verified on a disposable Neon branch before the real DB · covered by the `spec-0059-verify` branch check done during this build (CHECK/unique-index behavior confirmed, then deleted) plus the Commands table-existence query
- AC-9 … inquiry link/price label/JSON-LD keyed by variant.id for multi-variant catalog products · covered by UI steps 8-10, page tests "encodes the inquiry link's wariant by variant.id"/"uses the selected variant's own price"
