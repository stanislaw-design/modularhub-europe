# Verify: wymiary zewnętrzne i wymagania fundamentowe w kreatorze · spec 0053 · updated 2026-09-25

_Steps derived from spec 0053 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Producer wizard (`/producer/panel/products/new`), step "Dane podstawowe": "Wymiary zewnętrzne" renders with no red asterisk (unlike Nazwa/Metraż/Kraj/Opis) → AC-1
- [x] Same step, fill "Wymiary zewnętrzne" with free text ("10.2m x 8.4m x 5.1m") → value persists, click Next advances to "Dane techniczne" without a validation error → AC-1
- [x] Step "Dane techniczne": "Wymagania fundamentowe" renders next to "Gwarancja konstrukcyjna" with no red asterisk; fill it with free text and click Next → advances to "Pliki" without a validation error → AC-2
- [x] Query the live database for the created product → `product.external_dimensions`/`product.foundation_options` hold exactly the entered values → AC-3
- [x] Reopen the product in `/producer/panel/products/[id]/edit` → both "Wymiary zewnętrzne" and "Wymagania fundamentowe" show the values just entered → AC-6
- [x] In the "Tłumaczenia" step of the same product, click "Wygeneruj ponownie" → "Wymagania fundamentowe" field appears next to "Opis projektu" for the active language tab and is filled with a real generated translation (Azure OpenAI, not a mock) → AC-4
- [x] Switch to the Dutch tab → a distinct, correctly translated NL value renders → AC-4
- [x] Save the "Tłumaczenia" step, then query the live database → `product_translation.foundation_options` holds correct EN/NL/DE values → AC-4
- [x] Visit the client project card (`/pl/project/[id]`) for this product → "Wymiary zabudowy" and "Wymagania fundamentu" (Działka i dostawa + Technologia i konstrukcja sections) show the real entered values instead of "Do uzupełnienia" → AC-7
- [x] Visit the same project card on `/en/project/[id]` → "Foundation requirements" shows the EN translation generated above → AC-4, AC-7
- [x] Open an existing, already-published product that predates this feature (`external_dimensions`/`foundation_options` both `null` in the live DB) on its client card → still shows "Do uzupełnienia" for both, unchanged from today's behavior → AC-8
- [ ] Manually edit the EN "Wymagania fundamentowe" translation to a custom value, save, reload, confirm it survives a regenerate — not exercised this run (reuses the existing `description` AC-33 protection mechanism unchanged; same code path, not re-proven live for this specific field)
- [ ] Open a pre-existing empty-field product in the edit wizard under its own producer's session — blocked (ownership gate correctly denied the throwaway test session); the equivalent empty-but-functional render was already observed on the newly created product before its fields were filled in

## Commands

- [x] `npx tsc --noEmit -p .` → passes with no errors
- [x] `npx vitest run lib/producer-project-draft.test.ts components/producent/ProjectWizardTranslationsStep.test.tsx components/producent/ProjectWizardBasicInfoStep.test.tsx components/producent/ProjectWizard.test.tsx components/producent/ProductEditWizard.test.tsx components/producent/ProjectWizardTechnicalStep.test.tsx lib/producer-product-actions.test.ts lib/db/queries.test.ts lib/data/projects.test.ts lib/producer-project-translation-actions.test.ts components/klient/ProjectLogistics.test.tsx` → 194/194 pass → AC-1 to AC-8
- [x] Neon MCP `describe_table_schema` on `product_translation` (project `modularhub-dev`, id `bold-tree-78265613`) → confirms `foundation_options text NULL` column exists live → AC-4

## Acceptance-criteria coverage

- AC-1 (externalDimensions in "Dane podstawowe", optional) — covered by UI steps 1–2, `ProjectWizardBasicInfoStep.tsx`
- AC-2 (foundationOptions in "Dane techniczne" logistics section, optional) — covered by UI step 3, `ProjectWizardTechnicalStep.tsx`
- AC-3 (both save via createProducerProduct/updateProducerProduct) — covered by UI step 4, `lib/producer-product-actions.ts` buildProductValues
- AC-4 (foundationOptions EN/NL/DE translation, same mechanism as description) — covered by UI steps 6–8, 10, `generateProjectTranslations`/`ProjectWizardTranslationsStep.tsx`
- AC-5 (externalDimensions has no translation variants) — covered by `ProjectDraft`/`ProducerProductFields` shape (no `externalDimensions{En,Nl,De}` fields exist)
- AC-6 (edit wizard prefills both fields + 3 translation variants) — covered by UI step 5, `getProducerProductForEdit`
- AC-7 (client card shows real values, translated, PL fallback) — covered by UI steps 9–10, `mapRowToProject`/`resolveTranslatedText`
- AC-8 (pre-existing published products keep placeholder, no backfill) — covered by UI step 11
