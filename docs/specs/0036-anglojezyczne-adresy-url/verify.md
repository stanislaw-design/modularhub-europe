# Verify: anglojęzyczne adresy URL i strona główna klienta bez segmentu klient · spec 0036 · updated 2026-09-12

_Steps derived from spec 0036 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl` → renders the full customer home page directly (Hero, PopularHomes, ComplianceEngineShowcase, HowItWorksExplainer, CompareHomesTeaser, ProducerShowcase, ClosingCta, Faq, FloatingSearchButton), no redirect in the network tab → AC-2
- [ ] Visit `/en` and `/nl` → same behaviour, correct locale content, locale prefix kept → AC-1
- [ ] From `/pl`, click through the whole customer journey and confirm each screen renders at its new English address: results, inquiry, plot, project/[id], fulfillment, registration, panel/profile, panel/favorites, panel/inquiries, panel/inquiries/[id], login → AC-1
- [ ] Visit `/pl/producer` → click through registration, panel, panel/project, panel/products, panel/products/[id]/edit, panel/inquiries, panel/inquiries/[id], fulfillment, fulfillments, gap-closure, export-readiness, company-verification → each renders at its new `/producer/...` address → AC-3
- [ ] Sign in as admin, visit `/pl/internal/inquiries` and `/pl/internal/products` → both render, content stays exclusively Polish regardless of session locale → AC-4
- [ ] Visit `/pl/klient/wyniki?sizeMin=80` → 308 redirect to `/pl/results?sizeMin=80`, query string preserved → AC-5
- [ ] Visit `/pl/producent/panel/produkty/prod-1/edytuj` → 308 redirect to `/pl/producer/panel/products/prod-1/edit`, id untouched → AC-5
- [ ] Visit `/en/internal/zapytania` → a single 308 redirect straight to `/pl/internal/inquiries`, never through an intermediate `/pl/internal/zapytania` → AC-4, AC-5
- [ ] View page source/metadata for `/en/project/<id>` → `alternates.languages` carries the new addresses for pl, en, nl plus `x-default` → AC-7
- [ ] Confirm SiteHeader (with its nav and account menu) renders identically on `/` and on every other customer route, ProducerHeader renders only on `/producer/*`, neither leaks into the other's routes or into `/internal/*` → AC-9

## Commands
- [ ] `npx vitest run` → all customer/producer/internal/proxy tests pass (671/672 at build time; the one pre-existing failure, `lib/product-family-groups.test.ts`, is unrelated to this spec) → AC-5, AC-6 (unit coverage)
- [ ] `npx playwright test` → all e2e specs pass against the new addresses → AC-8
- [ ] `npm run build` → succeeds; the printed route list shows only the new English segments (`/[locale]`, `/[locale]/results`, `/[locale]/producer/...`, `/[locale]/internal/inquiries`, etc.), no route collision between the `(customer)` group and `producer`/`internal` → AC-1, AC-3, AC-4, AC-9
- [ ] Repo-wide search for old segment literals (`/klient`, `/logowanie`, `/producent`, old internal segments) as navigational literals (href, redirect, router.push, page.goto, toHaveURL/toHaveAttribute), outside `docs/specs/**` and `docs/scope/**`, and outside `@/components/klient/`/`@/components/producent/` import paths → zero hits → AC-6

## Acceptance-criteria coverage
- AC-1 … covered by the customer-journey click-through and the build's route list · AC-2 … covered by the `/pl` home page step · AC-3 … covered by the producer click-through · AC-4 … covered by the internal admin steps (content stays Polish, single-hop redirect) · AC-5 … covered by the three redirect steps plus `proxy.test.ts` (dedicated redirect unit coverage) · AC-6 … covered by the repo-wide literal search · AC-7 … covered by the project detail metadata step · AC-8 … covered by `vitest run` and `playwright test` · AC-9 … covered by the shared-layout step
