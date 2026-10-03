# Verify: tablica ogłoszeń B2B i odpowiadanie na nią · spec 0062 · updated 2026-10-02

_Steps derived from spec 0062 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Submit `/project-request` with a real-looking email domain + phone number → `project_request.trust_signal` is `complete`         → AC-1
- [ ] Submit `/project-request` with no phone number (or a disposable domain) → `trust_signal` is `new`, and no UI copy claims ModularHub verified the investor's identity → AC-1
- [ ] Log in as a producer with `producer_capacity_profile.volumeVerificationStatus = approved`, visit `/producer/panel/board` → see the paginated list of every `open`/`quoted` project_request (not just country-matched ones), each row showing trustSignal, country, project type, families, units, floor area, status — never `contactName`/`contactEmail`/`contactPhone` → AC-2
- [ ] Log in as a producer with no approved capacity profile, visit `/producer/panel/board` → see the not-approved empty state with a link to the capacity profile, no error, no redirect away from the route → AC-3
- [ ] Click a board row → land on `/producer/panel/board/[id]` with full quote-relevant detail (still no contact) and a quote form; submit a quote → see "Twoja wycena: Aktywna" on a revisit → AC-4
- [ ] As a second approved producer, submit a competing quote on the same request → both quotes exist; log in as the producer who submitted first and revisit `/producer/panel/board-quotes` → both producers' own submissions show with status `active` → AC-5
- [ ] Log in as the client who owns the `project_request`, visit `/panel/quotes` → see every received quote (both producers from the previous step) with the producer's name (always visible), price, lead time, notes, and an Accept button → AC-6
- [ ] Click Accept on one quote → `project_quote.contactRevealedAt` is set on that quote in the same write that flips it to `accepted`; revisit `/producer/panel/board-quotes` as the accepted producer → investor contact now shows on that one quote only → AC-7
- [ ] The other, non-accepted quote on the same request flips to `rejected` and never gets `contactRevealedAt` set → AC-8
- [ ] Grep the codebase for `project_request_target_producer`, `target_producer_status`, `autoTargetProducers`, `markProjectRequestViewedOrDeclined` → no hits outside historical `drizzle/meta/*_snapshot.json` and spec docs; confirm in Neon (`information_schema.tables` / `pg_type`) that the table and enum no longer exist → AC-9
- [ ] On `/project-request`, confirm a short hint appears under both "Lokalizacja" and "Dodatkowe uwagi" warning that every volume-verified producer sees these fields → AC-10
- [ ] Run the new/changed screens through a screen reader or axe check: one real `<h1>` per page, logical focus order, empty/error states communicated by icon plus text → AC-11
- [ ] In Neon, set a producer's `volumeVerificationStatus` back to `rejected` after they already have a submitted quote; as the client, call `acceptProjectQuote` on that quote directly → it still succeeds; the same producer's new `submitProjectQuote` call now fails → AC-12

## Commands

- [ ] `npx vitest run lib/project-quote-actions.test.ts lib/project-request-actions.test.ts lib/db/queries.test.ts components/producent/QuoteForm.test.tsx components/klient/AcceptQuoteButton.test.tsx` → all green → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-12, AC-13, AC-14, AC-15
- [ ] `npx tsc --noEmit` → clean
- [ ] `npm run build` → compiles, all 4 new routes (`/producer/panel/board`, `/producer/panel/board/[id]`, `/producer/panel/board-quotes`, `/panel/quotes`) listed in the route table
- [ ] Query `getOpenProjectRequestsForBoard`/`getProjectRequestForBoardDetail` response shape directly → confirm no `contactName`/`contactEmail`/`contactPhone` key present at all, even before acceptance → AC-2 (also covered by `lib/db/queries.test.ts`)
- [ ] Query `getProjectQuotesForProducer` for a producer with one accepted and one still-active quote → contact fields are `null` on the active row, populated only on the accepted (contactRevealedAt set) row → AC-15 (also covered by `lib/db/queries.test.ts`)

## Acceptance-criteria coverage

- AC-1 (trustSignal, no push) · AC-2 (board list, masked) · AC-3 (not-approved empty state) · AC-4 (board detail + quote) · AC-5 (own quotes screen) · AC-6 (client received-quotes + accept) · AC-7 (contactRevealedAt on accept) · AC-8 (reject siblings, no reveal) · AC-9 (table/enum/functions dropped) · AC-10 (visibility hints) · AC-11 (i18n + a11y) · AC-12 (revocation not retroactive) · AC-13 (submitProjectQuote auth inside the action) · AC-14 (cross-producer accepted-quote race guard) · AC-15 (getProjectQuotesForProducer SQL-level masking) — all covered above.
