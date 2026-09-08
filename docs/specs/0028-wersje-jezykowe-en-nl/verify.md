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
