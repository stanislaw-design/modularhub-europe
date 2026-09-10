# Verify: panel producenta · spec 0032 · updated 2026-09-10
_Steps derived from spec 0032 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Visit `/pl/producent/panel` with no session → redirected to `/pl/logowanie?callbackUrl=/pl/producent/panel` → AC-1
- [ ] Log in as a `client` session, visit `/pl/producent/panel` → redirected to `/pl/klient/panel` → AC-1
- [ ] Log in as an `admin` session, visit `/pl/producent/panel` → redirected to `/pl/internal/zapytania` → AC-1
- [ ] Register a new producer at `/pl/producent/rejestracja`, confirm the magic link → lands on `/pl/producent/panel/projekt` (the wizard), not the old mock form → AC-9
- [ ] Visit `/pl/producent` while logged in as `producer` → redirected straight to `/pl/producent/panel` → AC-10
- [ ] Visit `/pl/producent` with no session → marketing content with "Zarejestruj się" / "Zaloguj się" CTAs, no NIP form → AC-10
- [ ] `/pl/producent/panel` shows the logged-in producer's own company data (name, NIP, delivery countries, technology, verification status) from the database → AC-2
- [ ] `/pl/producent/panel/produkty` with zero products shows a friendly empty state with an "Dodaj produkt" button, not an error → AC-3
- [ ] Complete the wizard for a new product without uploading a photo → blocked on the Summary step with a clear message, product stays unpublished → AC-4
- [ ] Complete the wizard with at least one photo → product appears immediately as `published` in `/pl/producent/panel/produkty` and on `/pl/wyniki` → AC-4
- [ ] Edit an existing own product via `/pl/producent/panel/produkty/[id]/edytuj`, save changes → visible immediately, stays `published` → AC-5
- [ ] Attempt to edit another producer's product by editing the `id` in the URL → redirected to the product list, not the foreign product's data → AC-5, AC-13
- [ ] Delete an own product via the confirmation modal → disappears from the panel list and from `/pl/wyniki`; row still exists in the database with `deletedAt` set → AC-6
- [ ] Upload, delete, and set a cover photo on an own product from the wizard's files step → works; attempt the same against another producer's product (e.g. by calling the action with a foreign `productId`) → denied → AC-7, AC-13
- [ ] `/pl/producent/panel/zapytania` shows an inquiry that includes both the producer's own product and another producer's product → only the producer's own product name is listed → AC-8
- [ ] The old mock routes `/pl/producent/produkty`, `/pl/producent/projekt` return 404 (removed) → AC-12
- [ ] The four demo screens (`/pl/producent/gotowosc-eksportowa`, `/pl/producent/weryfikacja-firmy`, `/pl/producent/realizacje`, nested `/domykanie-luk`/`/realizacja`, and `/pl/producent/zapytania`) each show a "wersja demonstracyjna" notice and are reachable from a link on `/pl/producent/panel` → AC-11
- [ ] A save error (simulate a DB failure, or trigger the publish-without-photo block) shows an inline message with the entered data still present, not lost → AC-14
- [ ] Keyboard-only pass over the new/changed panel screens: one true H1 per page, logical focus order, visible focus ring, the delete-product modal traps focus and closes on Esc → AC-15

## Commands

- [ ] `npm run typecheck` (or `npx tsc --noEmit`) → passes
- [ ] `npm run lint` → no new errors/warnings introduced by this feature's files
- [ ] `npm run test` → all suites pass, including `lib/product-photo-actions.test.ts` (real DB, producer + admin ownership cases)
- [ ] `npm run build` → production build succeeds, route list includes `/producent/panel`, `/producent/panel/produkty`, `/producent/panel/produkty/[id]/edytuj`, `/producent/panel/projekt`, `/producent/panel/zapytania`, and excludes `/producent/produkty`, `/producent/projekt`

## Acceptance-criteria coverage

- AC-1 … session gate redirects (client/admin/anonymous) · covered by UI steps 1-3
- AC-2 … company data on panel home · covered by UI step 7
- AC-3 … own product list + empty state · covered by UI step 8
- AC-4 … create + publish, blocked without photo · covered by UI steps 9-10
- AC-5 … edit own product, ownership-checked · covered by UI steps 11-12
- AC-6 … soft delete via confirmation modal · covered by UI step 13
- AC-7 … photo upload/delete/cover, ownership-checked · covered by UI step 14
- AC-8 … own inquiries only, no foreign product names · covered by UI step 15
- AC-9 … registration lands in the wizard · covered by UI step 4
- AC-10 … marketing root + producer-session redirect · covered by UI steps 5-6
- AC-11 … four demo screens marked + linked from panel · covered by UI step 17
- AC-12 … old mock path removed · covered by UI step 16, Commands step 4
- AC-13 … producerId always from session, never the URL · covered by UI steps 12, 14
- AC-14 … save error keeps entered data · covered by UI step 18
- AC-15 … WCAG 2.2 AA on new/changed screens · covered by UI step 19
