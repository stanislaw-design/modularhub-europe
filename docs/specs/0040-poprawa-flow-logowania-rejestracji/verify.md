# Verify: poprawa flow logowania i rejestracji · spec 0040 · updated 2026-09-15
_Steps derived from spec 0040 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Log out, load any customer page → header CTA reads "Załóż konto" and links to `/pl/registration`, on both the desktop pill and the mobile flyout menu → AC-1
- [ ] Visit `/pl/login` in the default (no error) state → a single "Załóż konto" link is shown, centered horizontally under the "Wyślij link" button, linking to `/pl/registration` → AC-2
- [ ] On `/pl/login`, compare the rendered width of the "Wyślij link" button against the e-mail input above it → identical width → AC-3
- [ ] Visit `/pl/registration` with no `role` param → step 1 shows both "Klient" and "Producent" choices → AC-4
- [ ] From step 1, click "Klient" → URL becomes `/pl/registration?role=client`, client form renders; click "Producent" → URL becomes `/pl/registration?role=producer`, producer form renders (with country + production-scale fields, no technology field) → AC-4, AC-8
- [ ] Visit `/pl/registration?callbackUrl=/pl/some-page` (no role) → pick a role → the resulting step-2 URL keeps `callbackUrl=/pl/some-page` → AC-4
- [ ] Visit `/pl/registration?role=client` with no `callbackUrl` and complete registration → after confirming the magic link, land on `/pl` → AC-4
- [ ] Visit `/pl/registration?role=producer` with no `callbackUrl` and complete registration → after confirming the magic link, land on `/pl/producer/panel/project` → AC-4
- [ ] On step 2 (either role), click "zmień rolę" → returns to `/pl/registration` (no `role` param), `callbackUrl` preserved if it was present → AC-5
- [ ] On the client step-2 form, the "Jestem inwestorem" checkbox sits above all other fields, with its short description text, and NIP/nazwa firmy fields are visible whether or not it's checked → AC-6
- [ ] Leave "Jestem inwestorem" unchecked and submit without NIP/nazwa firmy → succeeds → AC-6
- [ ] Check "Jestem inwestorem" and submit without NIP/nazwa firmy → blocked with a validation message → AC-6
- [ ] Register a client with "Jestem inwestorem" checked, NIP + nazwa firmy filled → confirm the magic link → `client.nip`/`client.company_name` are set and `client.b2b_verification_status = 'pending'` → AC-6, AC-7
- [ ] Register a client leaving NIP/nazwa firmy empty (checkbox unchecked) → confirm the magic link → `client.nip`/`company_name` are empty and `b2b_verification_status = 'not_submitted'` → AC-7
- [ ] On the producer step-2 form, confirm there is no "Technologia" field and there is a required "Skala produkcji" select (do 10 / powyżej 10 domów rocznie) → AC-8
- [ ] Register a producer, confirm the magic link → `producer.technology IS NULL` and `producer.production_scale` matches the selected option → AC-8
- [ ] View `/pl/producer/panel` for a producer account with no `technology` set → a graceful empty-state message is shown for the technology field, not blank or broken text → AC-9
- [ ] Visit the old `/pl/producer/registration` (with and without a `callbackUrl` query param) → redirects to `/pl/registration?role=producer` (callbackUrl preserved when present) → AC-10
- [ ] Click through the existing entry points that still point at `/producer/registration` (`SiteHeader`'s "Dołącz jako producent B2B" nav item, `BulkOrdersShowcase`'s producer tile, the `/producer` marketing page CTA, and the `proxy.ts`-redirected `producent/rejestracja`) → each lands on the shared wizard's producer step via the redirect → AC-10
- [ ] Confirm magic-link login, the `/klient/zapytanie` login gate, and the "unknown e-mail" `requestLogin` behavior from spec 0023 are all unchanged → AC-11

## Commands

- [ ] `npm run db:generate` then inspect the emitted SQL → only `ALTER TABLE producer ALTER COLUMN technology DROP NOT NULL` + `ADD COLUMN production_scale` (no destructive statements) → AC-8
- [ ] `npm run db:migrate` → query `information_schema.columns` for `producer.production_scale` and confirm `producer.technology` is nullable → confirms the migration is live, not just generated → AC-7, AC-8, AC-11
- [ ] `npx vitest run lib/db/schema.test.ts` → passes against the migrated schema → AC-7, AC-8, AC-11
- [ ] `npx vitest run components/klient/SiteHeader.test.tsx lib/i18n/messages.test.ts` → passes (CTA copy/href and locale key parity) → AC-1

## Acceptance-criteria coverage

- AC-1 … header CTA copy/href, desktop + mobile · covered by UI steps 1 and command step 4
- AC-2 … always-shown centered "Załóż konto" link on `/login` · covered by UI step 2
- AC-3 … "Wyślij link" button width matches e-mail input · covered by UI step 3
- AC-4 … `/registration` step routing, `role` param, `callbackUrl` preservation, per-role default callback · covered by UI steps 4-8
- AC-5 … "zmień rolę" link back to step 1 · covered by UI step 9
- AC-6 … investor checkbox gates NIP/nazwa firmy requirement, fields always visible · covered by UI steps 10-12
- AC-7 … investor checkbox reuses `client.nip`/`company_name`/`b2b_verification_status` · covered by UI steps 13-14
- AC-8 … producer form drops Technologia, adds required production scale · covered by UI steps 15-16
- AC-9 … producer panel graceful empty state for unset technology · covered by UI step 17
- AC-10 … old `/producer/registration` alias keeps working via redirect · covered by UI steps 18-19
- AC-11 … spec 0023 login/magic-link/gate mechanism unchanged · covered by UI step 20
