# Verify: zapytania i oferty (producent) · spec 0012 · scope feature 15 · updated 2026-08-16
_No governing spec exists for this feature (scope entry has no "Zaprojektuj (spec)" task); steps derived from the scope's Done when line and the build itself._

## UI / manual
- [ ] Visit `/pl/producent/zapytania` → four mock inquiries render, each with project name, client name, delivery country, received date, the fixed request message, and a "Nowe zapytanie" badge
- [ ] Click "Przygotuj ofertę" on any inquiry → offer form opens with the same three line item template (cena domu, transport, montaż) as every other inquiry
- [ ] Confirm the transport field is disabled, shows a value, and cannot be typed into
- [ ] Change the delivery country across two different inquiries (e.g. `inq-001`, PL, versus `inq-002`, DE) → transport values differ, matching the country
- [ ] Edit cena domu and montaż, watch the "Razem" total update live
- [ ] Click "Wyślij ofertę" → confirmation view appears with the submitted values and a sent timestamp
- [ ] Return to `/pl/producent/zapytania` → that inquiry now shows "Oferta złożona" and its button reads "Zobacz ofertę"
- [ ] Reopen that inquiry's offer → shows the same submitted values in the read only summary, not the editable form (state persists via localStorage)
- [ ] Visit `/pl/producent/zapytania/oferta` with no `?zapytanie` → soft redirect to `/pl/producent/zapytania`, no error page
- [ ] Visit `/pl/producent/zapytania/oferta?zapytanie=does-not-exist` → same soft redirect
- [ ] From `/pl/producent` (producer home) → "Masz już konto? Sprawdź przychodzące zapytania" link lands on `/pl/producent/zapytania`

## Commands
- [ ] `npx eslint <changed files>` → clean (confirmed during build)
- [ ] `npm run build` → currently blocked by a pre existing, unrelated TypeScript error in `components/producent/ProjectWizardProgress.test.tsx` (feature 12 work, already uncommitted before this build); not caused by this feature.

## Acceptance-criteria coverage
- No numbered ACs (no spec). Scope "Done when": producer sees the inquiry list, can open the offer form in the shared template, and the transport field is read only → covered by all steps above.
