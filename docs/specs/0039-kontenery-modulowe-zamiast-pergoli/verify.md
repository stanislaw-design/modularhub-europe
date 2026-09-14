# Verify: kontenery modułowe zamiast pergoli · spec 0039 · updated 2026-09-14

_Steps derived from spec 0039 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Open producer wizard → step "Informacje podstawowe" → select family "Kontenery modułowe" → expect a "Podkategoria" select with exactly gastronomiczny/usługowy/mieszkalny options, no pergola options anywhere → AC-5
- [ ] Pick subcategory "gastronomiczne" → step "Dane techniczne" → expect exactly 9 fields (dimensions, structureMaterial, insulationType, foundationType, kitchenEquipmentType, extractionVentilation, electricalPower, waterSupplyType, wasteWaterHandling), none from uslugowe/mieszkalne → AC-4, AC-5
- [ ] Pick subcategory "mieszkalne" instead → expect exactly 10 fields including a checkbox-style "Łazienka" (bathroomIncluded), not a text/number input → AC-4, AC-5
- [ ] Save the product through to publish → confirm `technicalSpecs` in the DB matches the strict Zod shape for the chosen subcategory, and `containerSubcategory` is set → AC-4, AC-5
- [ ] Visit `/wyniki` (client search) → hero/search card and results family switcher show "Kontenery modułowe" where "Pergole" used to be, no leftover "Pergole" text anywhere → AC-6
- [ ] Visit `/wyniki?family=kontenery-modulowe` → `SubcategoryFilterBar` shows exactly three chips (Gastronomiczny / Usługowy / Mieszkalny), not four pergola chips → AC-6
- [ ] Visit `/wyniki?family=wiecej-niz-dom` → results/hero combine `spa-modulowe` and `kontenery-modulowe` products together, no `pergola` anywhere → AC-6, AC-7
- [ ] Visit `/wyniki?family=pergola&pergolaSubcategory=drewniana` (old bookmarked link) → falls back gracefully to the default (`family=dom`), no error page, no special-cased redirect → AC-8
- [ ] Repeat the same wizard/search checks in `en` and `nl` locales → no missing translation keys, no key names leaking into the UI → AC-10

## Commands

- [ ] `npx vitest run lib/product-technical-specs.test.ts` → all three container-subcategory shapes (gastronomiczne/uslugowe/mieszkalne) accept their own complete shape and reject each other's fields (strict, disjoint) → AC-4
- [ ] `npx vitest run lib/producer-project-draft.test.ts` → `CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY` has 9/7/10 fields per subcategory, boolean field completeness rule enforced → AC-4, AC-5
- [ ] `npx vitest run lib/product-family-groups.test.ts lib/results-filters.test.ts lib/data/projects.test.ts lib/db/queries.test.ts` → pass against the live production schema → AC-6, AC-7, AC-9
- [ ] Query production Neon (`modularhub`): `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'product_family'::regtype;` → returns exactly `dom`, `spa-modulowe`, `kontenery-modulowe`, no `pergola` → AC-1
- [ ] Query production Neon: `SELECT column_name FROM information_schema.columns WHERE table_name = 'product' AND column_name IN ('container_subcategory','pergola_subcategory');` → returns only `container_subcategory` → AC-2
- [ ] On production Neon, attempt `INSERT INTO product (producer_id, status, family, container_subcategory) SELECT id, 'draft', 'dom', 'mieszkalne' FROM producer LIMIT 1;` → rejected by `product_family_subcategory_match` → AC-3

## Acceptance-criteria coverage

- AC-1 (enum has exactly the three values) · covered by the production Neon query above
- AC-2 (`containerSubcategory` column replaces `pergolaSubcategory`) · covered by the production Neon query above
- AC-3 (`CHECK` guards the family/subcategory match) · covered by the rejected-insert query above, and already re-verified live during this build
- AC-4 (three disjoint Zod shapes per subcategory) · covered by `lib/product-technical-specs.test.ts`
- AC-5 (wizard step 1 subcategory + step 2 fields per subcategory, incl. `boolean` field type) · covered by the UI steps above and `lib/producer-project-draft.test.ts` / `ProjectWizardTechnicalStep.test.tsx`
- AC-6 (client search shows "Kontenery modułowe", 3 subcategory chips) · covered by the UI steps above and `lib/data/projects.test.ts`
- AC-7 (`FAMILY_GROUPS["wiecej-niz-dom"]` = spa-modulowe + kontenery-modulowe) · covered by `lib/product-family-groups.test.ts`
- AC-8 (old `pergola` links degrade gracefully) · covered by the UI step above
- AC-9 (migration safe, verified on a Neon branch before production) · already done during this build: verified on branch `spec-0039-kontenery-verify` (deleted after use), then applied to production and re-confirmed live
- AC-10 (works in pl/en/nl) · covered by the UI step above
