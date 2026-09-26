# Verify: cena od zamiast zakresu wariantu · spec 0051 · updated 2026-09-24
_Steps derived from spec 0051 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. Note: this build session's Vitest run could not exercise the `real DB` describe blocks — the Neon project's usage quota was exhausted mid-session (HTTP 402), see memory `project_neon_quota_exhausted_2026_09`. Re-run those once the quota resets before trusting AC-4/AC-2/AC-8/AC-9's DB-backed coverage._

## UI / manual
- [ ] Producer wizard, "Warianty i cennik" step → only one price field ("Cena od (EUR)") shows per variant, no "cena max" field anywhere → AC-1, AC-9
- [ ] Same step, upload/paste pricing material with a single price and an included/excluded item list → AI proposal card shows one price field plus an editable cost-line-item list (label + status), never scope/excluded-scope text fields → AC-8
- [ ] Apply an AI proposal onto an *existing* variant whose cost line items already include a label the proposal also returns → the duplicate label is not added twice; a new label from the proposal is appended → AC-9
- [ ] Apply an AI proposal that creates a *new* variant → the new variant's cost line items are pre-filled from the proposal, `upsertCostLineItem` is not called until "Zapisz wariant" is clicked → AC-9 (Key invariant: AI never saves itself)
- [ ] `/wyniki` results list (ResultCard) → each card's price line shows up to 3 "w cenie" cost-line-item labels comma-separated, "+N więcej" when there are more than 3, and the fallback "Zakres do potwierdzenia" when a variant has zero "w cenie" items → AC-6
- [ ] `/compare` (ProjectCompareTable) → same up-to-3-labels/fallback behavior per selected variant → AC-6
- [ ] Favorites compare table → shows a single "od X €" price, never a "X–Y €" range → AC-13
- [ ] Project detail page (`/project/[id]`), price-on-request branch and priced branch → neither renders a scope-summary or excluded-scope line anymore → AC-7
- [ ] Project detail page → view page source, confirm the JSON-LD `offers` block is `{"@type": "Offer", "price": <priceMin>, ...}`, not `AggregateOffer`/`lowPrice`/`highPrice` → AC-13
- [ ] `ProjectCostComparisonTable` (full cost comparison, still the one place all cost line items show in full) → price header per variant is a single "od X €", no scope/excluded-scope text under it → AC-7
- [ ] "Tłumaczenia" step in either wizard → no "Warianty" section, no variant scope/excluded-scope fields, generating/saving translations never calls anything variant-related → AC-10

## Commands
- [ ] `SELECT conname FROM pg_constraint WHERE conrelid = 'product_variant'::regclass AND contype = 'c';` via Neon MCP against production → returns only `product_variant_price_on_request`, not `product_variant_price_order` → AC-2
- [ ] Raise `price_min_cents` above a variant's stale (still-present) `price_max_cents` value directly via SQL → succeeds without a CHECK violation → AC-2
- [ ] `npx tsc --noEmit -p .` → clean (was clean at the end of this session) → AC-12
- [ ] `npx vitest run` → all non-`real DB` suites green; re-run `real DB` suites once Neon quota resets and confirm no `HTTP 402` failures remain, all green → AC-11, AC-12
- [ ] Once quota resets: `lib/db/schema.test.ts` "product_variant price sync trigger" suite → confirms the trigger only reads/writes `price_min_cents`, never `price_max_cents` → AC-3
- [ ] Once quota resets: query all live `product_variant` rows' `price_min_cents` before/after comparison (none were touched by phase-1 migration, only constraints/trigger changed) → confirms zero variants lost their displayed "from" price → AC-4 (full 59-variant check deferred to phase 3's own migration step, per Migration plan)

## Acceptance-criteria coverage
- AC-1 (single price field, `price_max_cents` gone from app-level reads/writes) · covered by UI step 1, types/data-layer changes (`lib/data/types.ts`, `lib/data/projects.ts`) · code done, phase-3 column drop deferred.
- AC-2 (CHECK `product_variant_price_order` dropped before code stops writing max) · covered by Commands steps 1–2 · verified live on production via Neon MCP during the build.
- AC-3 (`price_sync_trigger` rewritten to stop deriving `price_max_cents`) · covered by Commands step 5 (pending quota reset) plus the same Neon MCP verification as AC-2.
- AC-4 (lossless migration, `price_min_cents` unchanged for all 59 variants) · covered by Commands step 6, only spot-checked (1 variant) during the build due to time/quota — full check recommended before closing this feature.
- AC-5 (`scope_summary`/`excluded_scope`/`product_variant_translation` fully removed) · deferred to migration phase 3 (Build plan task 10), intentionally not part of this run.
- AC-6 (up to 3 "w cenie" labels + fallback + "+N więcej") · covered by UI steps 5–6, unit tests in `lib/data/project-variants.test.ts`.
- AC-7 (`ProjectCostComparisonTable`/project detail page stop rendering scope/excluded-scope) · covered by UI steps 8, 10.
- AC-8 (`extractStandardsFromMaterial` returns `priceEur` + `costLineItems`, Polish labels) · covered by UI step 2, unit tests in `lib/producer-standards-extraction-actions.test.ts`; the live Azure OpenAI call itself was not exercised in this session (existing gap, predates this spec — see spec 0050 build notes).
- AC-9 (AI proposals merge into editable cost-line list, append-only, dedupe by label, never auto-save) · covered by UI steps 3–4, unit tests in `ProjectWizardVariantsStep.test.tsx`.
- AC-10 (translations step drops the variant section entirely) · covered by UI step 11, unit tests in `ProjectWizardTranslationsStep.test.tsx`/`lib/producer-project-translation-actions.test.ts`.
- AC-11 (results filter/sort already single-value) · no code change needed, confirmed by reading `lib/results-filters.ts` during the build; covered by the existing test suite (Commands step 4).
- AC-12 (no test/screen references removed fields/table/action) · covered by the repo-wide sweep done during the build (`priceMaxEur`/`priceMaxCents`/`scopeSummary`/`excludedScope`/`product_variant_translation`/`updateVariantTranslation`) and Commands steps 3–4.
- AC-13 (single price everywhere a range used to show, incl. JSON-LD) · covered by UI steps 7, 9.
