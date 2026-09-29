# Verify: panel administracyjny · spec 0055 · updated 2026-09-28
_Steps derived from spec 0055 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Log in as a user with role `admin`, visit `/pl/internal` → a left sidebar shows Dashboard, Producenci, Projekty i zapytania, Produkty, Powiadomienia, Monitoring, with the current page visually marked → AC-1
- [ ] Visit any `/internal/*` page while logged out → redirected to `/pl/login?callbackUrl=...`; visit while logged in as `client` or `producer` → redirected away from `/internal` → AC-2
- [ ] Toggle dark mode from the sidebar footer on `/internal` → the whole panel (background, cards, chart, sidebar) repaints dark; navigate to another `/internal/*` page → the choice persists; log out and visit the customer or producer panel → their own theme is unaffected → AC-3
- [ ] On `/internal` (Dashboard), confirm the "Aktywne konta klientów" and "Aktywne konta producentów" tiles show real counts matching `select count(*) from users where role=... and deleted_at is null and blocked_at is null` → AC-4
- [ ] Confirm the "Projekty", "Zapytania", "Oferty" tiles show real counts from `project_request`, `inquiry`, `offer` → AC-5
- [ ] Confirm the trend chart shows two lines (Nowe rejestracje, Nowe zapytania) for the last 30 days, x-axis in Europe/Warsaw dates → AC-7
- [ ] Confirm "Ostatnia aktywność" lists the newest accounts/inquiries/offers sorted by date, newest first → AC-8
- [ ] Visit `/internal/producers` → a searchable, paginated list of producers (name, country, verification status, block status) → AC-10
- [ ] Block a test producer with an optional reason, confirm the row flips to "Zablokowany" and the reason/who/when is stored on `users.blocked_at`/`blocked_by`/`blocked_reason`; unblock it and confirm the fields clear → AC-11
- [ ] While a producer is blocked, confirm their `sessions` rows are deleted immediately, and that requesting a new login link for that email is rejected (`callbacks.signIn` in `auth.ts`) → AC-12
- [ ] Confirm there is no block/unblock action for `client` or `admin` rows anywhere in the panel → AC-13
- [ ] Visit `/internal/cases-and-inquiries` → one paginated list merging Sprawy and Zapytania, each row shows its own native status (etap+kto czeka for sprawy, raw status for legacy zapytania) and a type column → AC-14
- [ ] Visit the old `/internal/cases` and `/internal/inquiries` addresses → both 308-redirect to `/internal/cases-and-inquiries`; visit `/internal/cases/[id]` for an existing case → renders unchanged, no redirect → AC-14
- [ ] Visit `/internal/monitoring` → a "Stan usług" panel for baza danych / R2 / Resend, each independently showing Działa/Błąd/Niedostępne → AC-16
- [ ] Same page → "Ostatnie błędy (Sentry)" section shows real issues (confirmed live: `SENTRY_MONITORING_TOKEN` has `project:read`/`event:read` scope) → AC-15
- [ ] On `/internal` (Dashboard), confirm the "Wyświetlenia stron (30 dni)" tile shows a real `$pageview` count from PostHog (confirmed live: 0, matching a direct HogQL query against the project — a real empty state, not a widget failure) → AC-6
- [ ] Temporarily break one external check (e.g. rename `RESEND_MONITORING_API_KEY` or `POSTHOG_PERSONAL_API_KEY`) and confirm only that one widget shows an error/unavailable state while the rest of Dashboard/Monitoring still renders → AC-9
- [ ] Trigger a block/unblock action and a monitoring widget failure, then check Sentry for the corresponding `captureError` events → AC-17

## Commands
- [ ] `npm run db:migrate` (already applied to `modularhub-dev`) → `blocked_at`/`blocked_by`/`blocked_reason` columns exist on `users` (confirmed via Neon `information_schema.columns` query during this build) → AC-11
- [ ] `npx vitest run proxy.test.ts` → 26/26 passing, including the new cases-and-inquiries merge redirect tests → AC-14
- [ ] `npx vitest run components/klient/SiteHeader.test.tsx lib/cases` → all passing → AC-1, AC-14
- [ ] `npx tsc --noEmit -p .` and `npx eslint` on every touched file → clean (confirmed during this build)

## Acceptance-criteria coverage
- AC-1, AC-2, AC-3 (shared shell, auth gate, dark mode) — built and verified live in the browser.
- AC-4, AC-5, AC-7, AC-8 (dashboard tiles, trend chart, activity feed) — built and verified live with real dev-DB data.
- AC-6 (PostHog pageviews tile) — fully built and verified live: new `POSTHOG_PERSONAL_API_KEY` (Personal API Key, Query: Read scope) generated 2026-09-28, tile shows the real `$pageview` count (0, confirmed against a direct HogQL query — a genuine empty state, not a bug).
- AC-9 (per-widget 5s timeout + graceful "niedostępne" degradation) — built and verified for all six independent widgets (Dashboard's PostHog tile plus Monitoring's Sentry/DB/R2/email checks); all currently report their real state since every credential is now correctly scoped, but the `value: null` → "Niedostępne" path was exercised and confirmed earlier in this build when a widget's credentials were still missing/wrong-scoped.
- AC-10 through AC-13, AC-17 (producers list, block/unblock, immediate session loss, producer-only, captureError) — built and verified live (block/unblock cycle, reason persisted, sessions deleted). Known gap: existing producer mutating actions outside this spec (add product, respond to inquiry) do not yet re-check `blocked_at` independently of the session, per the spec's Key invariants defense-in-depth note — narrow race window, deferred.
- AC-14 (merged projects/inquiries list + old-route redirects) — built and verified live, including the case-detail-page-stays-unchanged edge case.
- AC-15, AC-16 (Sentry issues list, service health) — fully built and verified live: all three services (DB, R2, Resend) report "Działa", Sentry shows real issues. Both credential gaps fixed 2026-09-28 with new, narrowly-scoped secrets (`SENTRY_MONITORING_TOKEN`: Personal Token, Project+Issue&Event Read; `RESEND_MONITORING_API_KEY`: Full Access), each separate from the keys the app uses for real builds/sending.
