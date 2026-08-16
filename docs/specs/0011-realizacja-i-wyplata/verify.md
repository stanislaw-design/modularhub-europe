# Verify: realizacja i wypłata (producent) · spec 0011 · scope feature 16 · updated 2026-08-16
_No governing spec exists for this feature (scope entry has no "Zaprojektuj (spec)" task); steps derived from the scope's Done when line and the build itself._

## UI / manual
- [ ] Visit `/pl/producent/realizacje` → list shows one card per order (project name, producer, floor area) with a stage badge → matches "oś statusu ... dla tego samego zamówienia"
- [ ] From that list, open an order still before odbiór (Modulor Family 90, montaż) → 4-stage axis (produkcja, transport, montaż, odbiór) renders, no "Weryfikacja firmy i wypłata" button yet
- [ ] Compare `/pl/producent/realizacja?project=prj-modulor-family-90` against `/pl/klient/realizacja?project=prj-modulor-family-90` → same stage statuses, dates, and documents for produkcja/transport/montaż
- [ ] Open a delivered order (Karpaty Alpine 104) → "Zamówienie odebrane" banner and "Weryfikacja firmy i wypłata" button appear
- [ ] Click through to `/pl/producent/weryfikacja-firmy?project=prj-karpaty-alpine-104` → required documents list renders, with a file upload control
- [ ] Choose a mock file and submit → confirmation message appears; reloading the page keeps the submitted state (localStorage)
- [ ] Visit `/pl/producent/weryfikacja-firmy?project=prj-modulor-family-90` directly (order not yet delivered) → soft redirect back to the realizacja axis, no error page
- [ ] Visit `/pl/producent/realizacja` with no `?project` → soft redirect to `/pl/producent/realizacje`, no error page
- [ ] From `/pl/producent` (producer home) → "Masz już zamówienie w realizacji? Sprawdź status i wypłatę" link lands on `/pl/producent/realizacje`

## Commands
- [ ] `npx eslint <changed files>` → clean (confirmed during build)
- [ ] `npm run build` → currently blocked by a pre-existing, unrelated TypeScript error in `components/producent/ProjectWizardProgress.test.tsx` (feature 12 work, already uncommitted before this build); not caused by this feature. Re-run once that file is fixed to confirm a fully clean build.

## Acceptance-criteria coverage
- No numbered ACs (no spec). Scope "Done when": axis consistent with the client's for the same order → covered by steps 2–3; company verification screen shows required documents without real verification → covered by steps 4–6.
