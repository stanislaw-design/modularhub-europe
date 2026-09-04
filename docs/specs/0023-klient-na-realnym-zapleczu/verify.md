# Verify: klient na realnym zapleczu · spec 0023 · updated 2026-09-03

_Steps derived from spec 0023 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Seed a real producer + published `dom` product via Neon MCP (with `cover_image_url` set) → row visible in `product`/`producer` tables → AC-1 (not yet done — needs real data from you)
- [ ] Visit `/pl/klient/rejestracja`, submit a new email → "Sprawdź swoją skrzynkę" shown, `pending_registration` row created with role `client` → AC-2
- [ ] Click the emailed magic link (or, until Resend is configured, insert the verification token manually and hit its callback URL) → `users`+`client` rows created, `pending_registration` row deleted, session cookie set → AC-2
- [ ] Visit `/pl/producent/rejestracja`, submit a new email + NIP/kraj/technologia → same "check email" flow → `users`+`producer` rows created on confirmation, with the submitted NIP/technology/country → AC-3
- [ ] Visit `/pl/klient/wyniki` while logged out → shows only published `dom` products, one seeded product visible → AC-4
- [ ] Click the "Spa modułowe" / "Pergole" tabs on `/wyniki` → URL gets `?family=spa-modulowe` / `?family=pergola`, `EmptyResults` shown (no seeded data yet), no error → AC-4
- [ ] While logged out, visit `/pl/klient/zapytanie?projects=<id>` → redirected to `/pl/logowanie?callbackUrl=...` → log in → lands back on the original zapytanie URL with the same product selection → AC-5
- [ ] Log in as a producer or as the admin account and visit `/pl/klient/zapytanie` directly → redirected away, inquiry form never shown → AC-5
- [ ] As a logged-in client, submit an inquiry → new `inquiry`+`inquiry_item` rows appear, linked to the client's own `client.id` → AC-6
- [ ] Temporarily break the DB connection (or use `/check verify`'s failure-injection convention) and submit → inline error + "Ponów wysyłanie" shown, form fields keep their values → AC-7
- [ ] Click "Ponów wysyłanie" after a transient failure → exactly one `inquiry` row exists for that submission (same `idempotency_key`), not two → AC-8
- [ ] Log in as the seeded admin account (after manually setting `users.role = 'admin'`, see below) and visit `/pl/internal/zapytania` → table of all inquiries shown → AC-9
- [ ] Visit `/pl/internal/zapytania` as a client or logged out → redirected away, no data shown → AC-9
- [ ] View a `ResultCard`/`InquiryConfirmationCard` for a product with `cover_image_url` left null → placeholder icon shown, no crash → AC-10
- [ ] Request a login link for an email with no `users` row and no `pending_registration` row → "Nie znaleźliśmy konta..." message shown, no email sent, no empty `users` row created → AC-11
- [ ] After a real producer/product is seeded (AC-1), manually set that seed account's `users.role` to `admin` via Neon MCP, then confirm the `/internal/zapytania` check above with that real account → AC-9 (not yet done — needs the seed step first)

## Commands

- [ ] `npx tsc --noEmit` → passes clean
- [ ] `npm run lint` → no errors/warnings in app-owned files (`.agents/`/`.claude/` bundled skill files carry pre-existing, unrelated findings)
- [ ] `npm run test` → all suites pass (475/475 as of this build, plus 2 pre-existing unrelated failures in `.agents/skills/dev-rfc` and `.claude/skills/dev-rfc`'s own `bun:test`-based script tests)
- [ ] `npm run build` → production build succeeds, `/api/auth/[...nextauth]`, `/[locale]/logowanie`, `/[locale]/klient/rejestracja`, `/[locale]/producent/rejestracja`, `/[locale]/internal/zapytania` all present in the route list

## Acceptance-criteria coverage

- AC-1: seed step — pending, needs real producer data from you
- AC-2, AC-3: registration + magic-link login, `pending_registration` staging, `createUser` adapter hook — covered above
- AC-4: `/wyniki` reads `product`/`producer` from the database, `family` URL switch, empty-state fallback — covered above
- AC-5: session gate on `/klient/zapytanie` with `callbackUrl` round-trip and role-based redirect — covered above
- AC-6: `submitInquiry` persists `inquiry`+`inquiry_item` linked to the session's `client.id` — covered above
- AC-7: inline error + retry, form state preserved — covered above
- AC-8: idempotency key generated on mount, unique constraint + `onConflictDoNothing` — covered above
- AC-9: `/internal/zapytania`, admin-only — covered above; the "mark an account admin" half is pending, same as AC-1
- AC-10: `coverImageUrl` graceful fallback on `ResultCard`/`InquiryConfirmationCard` — covered above
- AC-11: `requestLogin` refuses an unknown email instead of calling `signIn` — covered above
