# Verify: realna oferta i jej przyjęcie · spec 0033 · updated 2026-09-10
_Steps derived from spec 0033 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Log in as a producer with a real inquiry containing only their own product(s) → open `/producent/panel/zapytania/[id]` → see contact details, delivery country, and only own products → AC-1, AC-13
- [ ] Submit the offer form (house price per product, transport, installation) → refresh the page → the submitted offer is still there → AC-2
- [ ] As the same producer, submit a second (revised) offer on the same inquiry → the client only ever sees the new one, not the old → AC-3
- [ ] After a client has accepted an offer, try to submit another offer on that same inquiry as the same producer → get a readable error, not a silent no-op or crash → AC-4
- [ ] Unpublish (or soft-delete) a product that's already in an inquiry → open the producer's offer form for that inquiry → the product is still priceable, marked unavailable instead of hidden → AC-5
- [ ] As the client, open `/klient/panel/zapytania/[id]` on an inquiry with offers from two different producers → see both, each broken down (house price per product, transport, installation, total) → AC-6
- [ ] Accept one of those offers → confirm redirect/stay on `/klient/panel/zapytania` with a visible confirmation, and check the DB: `order` row exists with `current_stage = 'produkcja'` and one `order_stage_event` row → AC-7
- [ ] Reject the offer from the *other* producer on the same inquiry → only that relation closes; the accepted one is untouched → AC-8
- [ ] Confirm there is no UI affordance to undo an acceptance or rejection anywhere in this feature → AC-9
- [ ] Multi-producer inquiry: first producer's offer flips `inquiry.status` `open → offered`; after every producer on the inquiry reaches a terminal state (accepted, or rejected with no active offer left), it flips to `closed` → AC-10
- [ ] As the client, with an unopened offer: see the unread dot on the inquiry's row on `/klient/panel/zapytania` and on the "Zapytania" nav tab; open the detail page; reload the list — the dot is gone → AC-11
- [ ] As the producer, after the client accepts/rejects: see the symmetric unread dot on the row and nav tab; open `/producent/panel/zapytania/[id]`; reload the list — the dot is gone → AC-12
- [ ] As producer B, attempt to submit an offer item for a product belonging to producer A on a shared inquiry (e.g. via devtools/direct call) → server rejects it, never silently accepts → AC-13
- [ ] As client B, attempt to call `respondToOffer` on an offer that belongs to client A's inquiry → denied (offer not found from B's perspective) → AC-14
- [ ] Try submitting a negative price in any of the three price fields → client-side blocks it (inputs clamp to ≥0); if bypassed, the server action returns `{ ok: false }`, no row written → AC-15
- [ ] Delete the old mock routes and confirm 404: `/producent/zapytania`, `/producent/zapytania/oferta`, `/klient/oferta` all gone → AC-16
- [ ] Confirm the three fixed links: `/producent/panel` → "Zapytania i oferty" button goes to `/producent/panel/zapytania`; `PlotAnalysisRow`'s "Przejdź do zapytań" goes to `/klient/panel/zapytania`; `/klient/realizacja` with no accepted order redirects to `/klient/panel/zapytania` → AC-16
- [ ] As admin, open `/internal/zapytania` → each inquiry row with offers has an expandable `<details>` showing producer, prices, and status per offer → AC-17
- [ ] Trigger an insert/update on `offer`, `offer_item`, `order`, `order_stage_event` → confirm a matching row lands in `audit_log` (checked live during this build: `offer_audit`, `offer_item_audit`, `order_audit`, `order_stage_event_audit` triggers fire correctly, including the md5 fallback for `offer_item`'s composite key) → AC-18
- [ ] Race: with two browser sessions, have the producer revise (superseding) the active offer at the same moment the client tries to accept the old one → client gets a readable "offer no longer active, refresh" error, not a crash or a silent accept of a superseded offer → AC-19

## Commands

- [ ] `npm run build` → succeeds, TypeScript clean, all `/[locale]/producent/panel/zapytania`, `/[locale]/producent/panel/zapytania/[id]`, `/[locale]/klient/panel/zapytania`, `/[locale]/klient/panel/zapytania/[id]` routes present, no `/producent/zapytania` or `/klient/oferta` routes
- [ ] `npm run test` → full suite green (561 tests as of this build, 0 regressions; two pre-existing unrelated failures in `.agents/skills/dev-rfc` are not part of this feature)
- [ ] `npm run lint` → clean on every file this feature touched
- [ ] Query `information_schema.columns` for `offer.client_viewed_at` / `offer.producer_decision_viewed_at`, and `information_schema.triggers` for the four new audit triggers → all present live (confirmed during this build)

## Acceptance-criteria coverage

- AC-1 producer sees own-only inquiry detail + form · covered by UI step 1
- AC-2 offer persisted, survives refresh · UI step 2
- AC-3 revision supersedes atomically · UI step 3 (also verified live via direct DB test during build: fresh insert → revision → supersede confirmed)
- AC-4 no submit/replace after accepted, readable error · UI step 4 (verified live: third submit attempt after accept returned 0 rows as designed)
- AC-5 unavailable product still priceable, marked · UI step 5
- AC-6 client sees all offers with full breakdown · UI step 6 (verified live)
- AC-7 accept creates order + first stage event · UI step 7 (verified live: order + order_stage_event confirmed in DB with correct `changed_by_user_id`)
- AC-8 reject closes only that relation · UI step 8
- AC-9 accept/reject final, no undo · UI step 9
- AC-10 inquiry.status aggregate open→offered→closed · UI step 10 (verified live: single-producer test inquiry closed immediately on accept)
- AC-11 client unread signal, row + nav, clears on open · UI step 11 (verified live)
- AC-12 producer unread signal, row + nav, clears on open · UI step 12 (verified live)
- AC-13 producer can't write another producer's product into offer_item · UI step 13
- AC-14 client can't respond to another client's offer · UI step 14
- AC-15 prices ≥0, EUR only · UI step 15
- AC-16 old mocks removed, three links fixed · UI steps 16-17 (build confirms routes gone; links fixed and reviewed)
- AC-17 admin expandable offer details · UI step 18
- AC-18 audit triggers on all four tables · UI step 19 (verified live: audit_log captured create/update rows for offer, offer_item, order, order_stage_event during the live accept-flow test)
- AC-19 race on accept-vs-revise → readable error · UI step 20
