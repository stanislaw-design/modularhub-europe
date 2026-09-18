# Verify: przebudowa kreatora projektów · spec 0045 · updated 2026-09-18

_Steps derived from spec 0045 acceptance criteria. First section below scoped to milestone 3 ("Warianty i cennik", Build plan zadania 4-5: `lib/producer-product-variant-actions.ts` + `ProjectWizardVariantsStep`), plus the edit-path wiring pulled forward from zadanie 13 (`lib/db/queries.ts#getProducerVariantsForEdit`, `ProductEditWizard`). Second section (below) adds Build plan zadania 5 (dokończenie), 6-10, 12-13 (częściowo) — usunięcie starego kroku "Cena", układ pomieszczeń, FAQ, prawdziwe rzuty, logistyka/zgodność, certyfikaty, nowa bramka publikacji. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Producer panel → new project → complete kroki podstawowe/techniczne/pliki (krok "cena" został usunięty w zadaniu 12 — cena żyje teraz wyłącznie w "Warianty i cennik") → reach "Warianty i cennik" → add a variant with standard "Standard deweloperski" → card renders with a "Domyślny" badge (first variant auto-defaults) → AC-1, AC-3
- [ ] Fill price min/max, a cost line item (label + status), and a timeline stage's duration → click "Zapisz wariant" → "Zapisano." confirmation, no error banner → AC-1
- [ ] Add a second variant "Pod klucz" via "Klonuj" from the first variant → new card already shows the same cost line item(s) as a starting point → AC-2
- [ ] Click "Ustaw jako domyślny" on the second variant → "Domyślny" badge moves to it, disappears from the first → AC-3
- [ ] Delete a variant → its card disappears immediately, regardless of whether it was the default → AC-13
- [ ] As producer A, attempt to call the variant actions (e.g. via devtools) against producer B's variant/product → every action returns a denial, never another producer's data → AC-12
- [ ] Producer panel → edit an already-published product that has a variant (e.g. one backfilled by the spec 0045 migration) → open the "Warianty i cennik" step directly (every step is unlocked when editing) → its price/scope/cost items/timeline are pre-filled from the real, already-saved row, not empty → save again and confirm no duplicate cost line item is created (re-uses the existing item id) → AC-1, AC-12

## Commands

- [ ] `npx vitest run lib/producer-product-variant-actions.test.ts` → 23/23 pass against the real dev DB, including the AC-3 exactly-one-default regression and the AC-12 cross-producer ownership chain denials (variant, cost line item, timeline stage) → AC-1, AC-2, AC-3, AC-12, AC-13
- [ ] `npx vitest run components/producent/ProjectWizardVariantsStep.test.tsx components/producent/ProjectWizard.test.tsx components/producent/ProductEditWizard.test.tsx` → all pass → AC-1, AC-2, AC-3, AC-10, AC-13
- [ ] `npx vitest run lib/db/queries.test.ts` → includes `getProducerVariantsForEdit` real-DB tests (variant + cost items + timeline stages + EN/NL translations assembled per variant, not cross-mixed between two variants of the same product) → AC-1
- [ ] `npx tsc --noEmit` → clean

## Acceptance-criteria coverage

- AC-1 (1 to 3 variants, price min/max, scope description, cost line items, 5 timeline stages) · covered by the manual add/save steps and `ProjectWizardVariantsStep.test.tsx`
- AC-2 (clone copies cost items and timeline stages as a starting point) · covered by the manual clone step and `cloneVariant` real-DB test
- AC-3 (exactly one default, single UPDATE) · covered by the manual set-default step and the real-DB regression test asserting exactly one `is_default = true` row after switching
- AC-10 (EN/NL scope summary translation, upserted per variant) · covered by `updateVariantTranslation` real-DB test (upsert semantics, two locales as separate rows)
- AC-12 (full ownership chain, not just the nearest FK) · covered by cross-producer denial tests for `updateVariant`/`setDefaultVariant`/`deleteVariant`/`cloneVariant`/`upsertCostLineItem`/`deleteCostLineItem`/`upsertTimelineStage`
- AC-13 (delete always allowed, even the default variant, hard-deletes children) · covered by `deleteVariant` real-DB test and the manual delete step

Not covered here (out of scope for milestone 3, tracked separately in the spec's Build plan): AC-4/AC-5/AC-6/AC-7/AC-8/AC-9/AC-11/AC-14 (partial)/AC-15/AC-16/AC-17. Covered by the section below.

## UI / manual: rdzeń przebudowy (Build plan zadania 5-14, 2026-09-18)

- [ ] Producer panel → new project → basic info step → "Układ pomieszczeń" section → "Dodaj pomieszczenie" → fill name/area/function, toggle "Antresola" → add a second room → move it up with the ↑ button → order updates immediately → AC-5
- [ ] Same screen → fill an EN name for one room in the translations sub-section → click "Dalej" then "Wstecz" back to this step → the EN value is still there (not lost) → AC-5, AC-10
- [ ] New project → reach "Pliki" step (after basic info is saved, so `productId` exists) → upload a JPEG/PNG/WebP as a floor plan via the new uploader → it appears in the list labeled "Wszystkie warianty" (no variant selector shown yet, none exist for a brand-new product) → AC-7
- [ ] Edit an already-published product that has at least one variant → "Pliki" step → the floor plan uploader now shows a variant dropdown → upload a floor plan assigned to a specific variant → reload the edit page → the assignment persists → AC-7
- [ ] New project → "FAQ" step (after "Warianty i cennik") → add a question/answer, add a second, reorder with ↑/↓, remove one → AC-6
- [ ] "Dane techniczne" step → without selecting a family yet → the heading, "Gwarancja konstrukcyjna" field, and "Logistyka i zgodność" section (gwarancja montażu, opis serwisu, wymiary transportowe, wymagania żurawia, min. szerokość działki, "Kwalifikuje się do zgłoszenia uproszczonego") are all visible even though no family-specific field is → AC-8
- [ ] Set "Kwalifikuje się do zgłoszenia uproszczonego" to "Nieustalone" (default) → save → reopen the product for edit → it is still "Nieustalone", not silently "Nie" → AC-8
- [ ] New project, no variant added yet → "Podsumowanie" step → click "Zapisz projekt" → blocked with "Dodaj domyślny wariant z ceną minimalną przed publikacją." → AC-4
- [ ] Add a variant with a min price and mark it default → "Zapisz projekt" → publish succeeds → AC-4, AC-17
- [ ] Client-facing project page (`/pl/projekt/[id]`) for a published product whose producer has a `producer_capacity_profile` row with a non-empty `certifications` array → a "Certyfikaty" section renders with those values → AC-9
- [ ] Client-facing project page for a product whose producer has no `producer_capacity_profile` row at all → page renders normally, no "Certyfikaty" section, no error → AC-9
- [ ] Producer panel → edit an existing product created before this build (no `room_layout`/`faq` id yet) → basic info / FAQ steps load with an empty list, not a crash → AC-5, AC-6

## Commands: rdzeń przebudowy

- [ ] `npx tsc --noEmit` → clean
- [ ] `npx vitest run components/producent lib/producer-project-draft.test.ts lib/producer-product-actions.test.ts lib/db/queries.test.ts lib/data/projects.test.ts` → all pass
- [ ] `npx vitest run lib/i18n/messages.test.ts` → pl/en/nl/de key sets still match after removing `ProjectWizardPricingStep` and adding `ProjectWizardFaqStep`/`ProducerFloorPlanUploadStep`/new `ProjectWizardBasicInfoStep`/`ProjectWizardTechnicalStep`/`ProjectWizardSummaryStep` keys

## Acceptance-criteria coverage: rdzeń przebudowy

- AC-4 (publish blocked without a default variant with a min price) · covered by the manual publish-gate steps and `validatePublishReadiness` in `lib/producer-product-actions.ts`
- AC-5 (room layout: add/remove/reorder, stable client-generated id) · covered by the manual room layout steps, `roomLayoutSchema` (`lib/product-room-layout.ts`), `ProjectWizardBasicInfoStep.tsx`
- AC-6 (FAQ: add/remove/reorder) · covered by the manual FAQ steps, `faqSchema` (`lib/product-faq.ts`), `ProjectWizardFaqStep.tsx`
- AC-7 (real floor plan upload, same R2 mechanism as photos, optional per-variant assignment) · covered by the manual upload steps, `lib/product-photo-actions.ts#uploadFloorPlan`/`deleteFloorPlan`, `ProducerFloorPlanUploadStep.tsx`
- AC-8 (logistics/compliance section, declarative, no default) · covered by the manual logistics steps, `ProjectWizardTechnicalStep.tsx`
- AC-9 (certifications read from `producer_capacity_profile`, no new per-project field) · covered by the manual certifications steps, `lib/data/projects.ts#resolveProducerCertifications`
- AC-10 (EN/NL translation of room layout/FAQ entries, matched by id, may be partial) · covered by the room layout translation manual step, `alignRoomLayoutTranslation`/`alignFaqTranslation`/`sanitizeDraftForSave` unit tests (`lib/producer-project-draft.test.ts`)
- AC-11 (sequential progress bar only for a new draft, free navigation when editing) · already satisfied by existing code (`ProductEditWizard` initializes `maxReachedIndex` to the last step); not re-verified this round, no code changed
- AC-12 (ownership chain via `producerId` from session) · room layout/FAQ/logistics flow through the already-covered `createProducerProduct`/`updateProducerProduct` ownership check, not a new code path
- AC-16 (spec 0008 marked superseded) · already done in an earlier run, confirmed still in place
- AC-17 (old "Cena" step and `validatePublishReadiness` removed; `createProducerProduct`/`updateProducerProduct` stop writing `housePriceMinCents`/`priceMinCents`/`completionStandard`) · covered by the deleted `ProjectWizardPricingStep.tsx` and the rewritten `buildProductValues` in `lib/producer-product-actions.ts`

**Deviation from spec, flagged for review**: the spec's Feature design table names `updateRoomLayout`/`updateFaq`/`updateLogistics` as dedicated server actions. This build instead routes those fields through the already-existing `createProducerProduct`/`updateProducerProduct` (same pattern as `technicalSpecs`/`description`), since they are plain columns/jsonb on `product`, not separate child tables like `product_variant`. AC-12's ownership requirement is still met (same `producerId`-from-session check), just via the existing action rather than a new one — a deliberate scope reduction, not an oversight.

Not covered here (deferred to the "Poprawki z audytu" milestone, Build plan zadania 15-32, AC-18 through AC-41 — explicitly out of scope for this run at the engineer's request): autosave/flush-on-navigation, variant label + uniqueness retarget, step reorder, draft-relaxed technical validation, contextual help, cost-item categories/timeline duration+unit, price mode (od/stała/przedział/indywidualna), progress bar "needs attention"/optional states + error summary, summary step client-card preview + "fix X" links + per-file upload progress + undo-delete, analytics events, collapsed variant/room/FAQ cards, published-product edit warning, "Dodaj projekt" heading + hints, collapsed EN/NL tabs, per-variant tech field exception, photo/render/floor-plan type split, draft resume. Also not covered: `e2e/pierwszy-projekt.spec.ts` (named in Build plan zadanie 13) does not exist in the repo and was not created this round.
