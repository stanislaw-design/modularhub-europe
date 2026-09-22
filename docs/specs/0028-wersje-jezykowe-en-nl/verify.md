# Verify: wersje językowe (EN/NL) i przełącznik języka · spec 0028 · updated 2026-09-07

_Steps derived from spec 0028 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones. This build session shipped the routing foundation, the switcher, hreflang on the one `generateMetadata` page, the `product_translation` migration, and its read side — not full UI text extraction or the producer write path. See `docs/scope/produkcja.md` feature 25 for exactly what's done vs pending._

## UI / manual

- [ ] `/pl/klient` renders unchanged (default Polish UI) → AC-1 (fundament)
- [ ] `/en/klient` renders; `SiteHeader` nav/labels ("Homes", "Get started", "Favorites", "Sign in") are English → AC-1 (partial — `SiteHeader`/`ProducerHeader` only, most page content is still Polish)
- [ ] `/de/klient` (unrecognized locale) redirects to `/pl/klient`, not a 404 → AC-3
- [ ] `/en/internal/zapytania` and `/nl/internal/zapytania` redirect to `/pl/internal/zapytania` (admin panel stays Polish-only) → AC-1 (admin boundary)
- [ ] Request with no `NEXT_LOCALE` cookie and `Accept-Language: en` redirects `/` → `/en`; a second request from the same browser (cookie now set) does not re-redirect even if the header changes → AC-2
- [ ] On `/pl/klient/wyniki?sizeMin=80`, open the language switcher in `SiteHeader` and pick English → lands on `/en/klient/wyniki?sizeMin=80` (same filters, same results) → AC-4
- [ ] Language switcher is present and works the same way in `ProducerHeader` on `/pl/producent` → AC-4
- [ ] `<html lang>` matches the active locale on `/pl/...`, `/en/...`, `/nl/...` → AC-10
- [ ] A product with no EN/NL translation row still shows its Polish name/description on `/en/klient/wyniki` and `/en/klient/projekt/[id]` (no blank field) → AC-6
- [ ] Producer project wizard's basic-info step has EN/NL language tabs next to the Polish fields, and a saved translation shows on `/en`/`/nl` → AC-5 — **deliberately deferred, not built**: producer decided (2026-09-07) to keep the wizard and product catalog (features 12/18) on `localStorage`/mock for now; real products in the database stay "sample/pilot," managed manually via Neon MCP, with real self-service producer save as a possible future decision, not this one
- [x] All published real products have EN/NL description backfilled via Neon MCP → AC-7 (scope widened beyond Budman/Cocomodule) — **done 2026-09-07**: all 53 published products across all 6 producers (Baltyk Modular, Budman House, Cocomodule, Karpaty Haus, Modulor Systems, Steel House) have `product_translation` rows for `en`/`nl`; `name` intentionally left untranslated (falls back to the Polish model name, same as AC-6's no-translation fallback) per producer decision

## Commands

- [ ] `npm run test` → `lib/i18n/messages.test.ts` passes (pl/en/nl catalogs have identical key sets) → AC-9
- [ ] `npx tsc --noEmit` → clean
- [ ] `npm run db:generate` (schema unchanged since this migration) then confirm via Neon MCP `describe_table_schema product_translation` → table live with `UNIQUE(product_id, locale)` → AC-5, AC-6 (schema)
- [ ] Fetch `/en/klient/projekt/<real product id>` → response contains `<link rel="alternate" hreflang="pl|en|nl|x-default">` with correct per-locale URLs → AC-8

## Acceptance-criteria coverage

- AC-1: partial — routing fundament + admin boundary done and verified; full page-by-page UI text extraction pending (~74 production files still hardcode Polish text)
- AC-2: done — Accept-Language detection + cookie persistence, verified via curl
- AC-3: done — unrecognized locale segment redirect, verified via curl
- AC-4: done — switcher works in both headers, preserves path + query params, verified in a real browser (Playwright)
- AC-5: deliberately deferred — producer product creation/edit stays mock/`localStorage`-only (features 12/18); the real DB-backed save path is a possible future decision, not part of this build
- AC-6: done (read side) — fallback-to-Polish verified live (products with no translation row still show Polish text on `/en`); also verified for `name`, which is never translated by design
- AC-7: done (widened) — all 53 published products backfilled, not just Budman/Cocomodule
- AC-8: done — hreflang + `x-default` on the one `generateMetadata` page, verified live
- AC-9: done — catalog consistency test passing
- AC-10: done — `<html lang>` driven by `setRequestLocale`, unchanged mechanism now fed by next-intl's locale resolution

# Verify addendum: automatic AI translation · updated 2026-09-22

_Steps derived from spec 0028's AC-11 to AC-17 (added 2026-09-22). This session shipped the migration, the optional-payload/AC-15 protection, the Azure OpenAI call, the per-field ownership orchestration, DE tab wiring end to end, and the one-time backfill (Build plan tasks 19-25, all done). Per the engineer's explicit instruction, the backfill (task 24) was translated directly by the agent, not Azure OpenAI — future translations (new/edited products going forward) go through the Azure OpenAI mechanism built in this same session; see `scripts/backfill-ai-translations-2026-09-22.ts`.__

## UI / manual

- [ ] Producer creates a new product with only a Polish name/description filled in, saves; within a few seconds `/en/producer/panel/products/<id>/edit`, `/nl/...`, `/de/...` (open the basic-info step's language tabs) show an AI-drafted name/description, still editable → AC-11, AC-12
- [ ] On the client side, `/en/results`, `/nl/results`, `/de/results` and the product detail page show the AI-drafted text for that product (not blank, not Polish) once generation lands → AC-11
- [ ] Producer manually edits only the English name, saves from the basic-info step (tabs step); Polish description is then changed and saved from a later step (e.g. technical) → after generation, English name is unchanged (producer-owned), but English/Dutch/German description picks up a fresh AI translation of the new Polish text → AC-13
- [ ] Producer edits and saves a later wizard step (not basic info) without touching the translation tabs → `product_translation` name/description for en/nl/de are unchanged (not nulled, not touched) → AC-15
- [ ] German tab (`nameDe`/`descriptionDe`) in the basic-info step: fill in, save, reopen the edit page → values persist and are visible in the DE tab → AC-16
- [ ] Temporarily misconfigure `AZURE_OPENAI_ENDPOINT` (or otherwise force a failure) and save a new product → save still succeeds (no error to the producer); once config is restored, the next save of the same product generates the missing translation → AC-14

## Commands

- [ ] `npx tsc --noEmit` → clean
- [ ] `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run lib/producer-product-actions.test.ts` → 4/4 passing (regeneration rule incl. first-save/stale/producer-owned, AC-15 payload omission, AC-14 failure-doesn't-block-save) → AC-11, AC-13, AC-14, AC-15
- [ ] Neon MCP `describe_table_schema product_translation` → confirms `ai_generated_name`/`ai_generated_description`/`ai_translated_from_name`/`ai_translated_from_description` columns live → AC-11, AC-13, AC-17 (schema)

## Acceptance-criteria coverage (addendum)

- AC-11: done — generation wired via `after()` on both `createProducerProduct`/`updateProducerProduct`, verified by the automated test; live UI check still recommended
- AC-12: done — result lands in `product_translation.name`/`description`, editable via the existing wizard tabs (no new UI needed, they already write there)
- AC-13: done — ownership computed per field (`aiGeneratedName`/`aiGeneratedDescription` vs. stored value), verified by the automated test (manual edit survives a sibling field's regeneration)
- AC-14: done — failure caught and reported via `captureError`, save unaffected, verified by the automated test
- AC-15: done — `buildProducerSavePayload` (`lib/producer-project-draft.ts`) sends translation keys only from the "podstawowe" step; verified by the automated test. Known, documented edge case in `ProductEditWizard`: jumping directly to "Podsumowanie" via the step nav without a "Next" click on the basic-info step first won't persist a translation edited there — needs one visit through "Next".
- AC-16: done — `nameDe`/`descriptionDe` wired through `ProjectDraft`, the save payload, `getProducerProductForEdit`, `producerProductToDraft`, and a third wizard tab; not live-verified in a browser this session
- AC-17: done — one-time backfill for the current catalog (88 published products; 43 with no translation at all, plus one partial row) run via `scripts/backfill-ai-translations-2026-09-22.ts`, translated by the agent directly (engineer's explicit instruction) rather than Azure OpenAI; verified via Neon MCP that all 88 published products now have a complete EN/NL/DE description, each new row's `description` equals its `ai_generated_description` (correctly reads as AI-owned for future regeneration) and `ai_translated_from_description` holds the Polish source used. `name` intentionally stays untranslated on every row (engineer confirmed keeping the existing precedent), so a future name-translation decision is still open, not silently foreclosed.
