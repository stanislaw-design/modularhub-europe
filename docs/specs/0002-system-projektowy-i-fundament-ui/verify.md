# Verify: system projektowy i fundament UI · spec 0002 · updated 2026-08-13

_Steps derived from spec 0002 (and its children) and the scope's "Done when" criteria for feature 3. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Run `npm run dev`, open `/pl` → page renders on Warm White background with Foundation Navy text; body text visibly uses Inter, no flash of unstyled/system font → DW-1 (design.md pokrywa typografię)
- [ ] Temporarily render each `components/ui` component on a page (Button all variants, Input, Select, Textarea, Checkbox, Radio, Label, StatusPill, Card, Heading all levels, Text, DataText, Container/Grid/Stack) → every one renders with brand tokens (no hardcoded colors/radii), no console errors → DW-1 / DW-2
- [ ] Tab through a page containing the interactive components → every one (Button, Input, Textarea, Checkbox, Radio, Select) shows the shared visible focus ring on `:focus-visible` → DW-2 (komponenty bazowe obsługują focus)
- [ ] Focus the `Select` component and operate it with keyboard only: Enter/Space opens it, Arrow keys move through options, Enter selects, Escape closes and returns focus to the button → DW-2 (obsługa klawiatury)
- [ ] Add a temporary `page.tsx` under `app/[locale]/klient/` (or `producent/`), load it, press Tab once → "Przejdź do treści" skip link appears first and is visually hidden before focus; activating it moves focus into `<main id="main-content">` → DW-3 (routing gotowe, WCAG 2.2 AA skip link)
- [ ] Call `getProjects()`, `getProjects({ countryCode: "DE" })`, `getProjectById(<id>)`, `getCountries()`, `getEligibility(<projectId>, "NL")` from a server component or script → each resolves (they're `async`), `getProjects({ countryCode })` excludes projects whose `EligibilityByCountry.status` is `"blocked"` for that country → DW-3 (dane mockowe gotowe do użycia)
- [ ] Read `docs/design.md` → covers typography scale, color roles, spacing, container/grid, and the full component inventory, and points at `app/globals.css` / `assets/tokens/brand-v3-tokens.css` for real values rather than duplicating them → DW-1

## Commands

- [ ] `npm run build` → compiles, TypeScript passes, static generation succeeds → DW-1/DW-2/DW-3 (no build regressions)
- [ ] `npm run lint` → no errors → code quality gate

## Acceptance-criteria coverage

- DW-1 (`design.md` pokrywa typografię/kolor/spacing/komponenty na bazie istniejących wytycznych marki) … covered by the dev-server render check, the design.md read, and `npm run build`
- DW-2 (komponenty bazowe obsługują focus i klawiaturę) … covered by the focus-ring tab check and the `Select` keyboard check
- DW-3 (routing i dane mockowe gotowe do użycia przez wszystkie ekrany) … covered by the skip-link check and the `lib/data` function calls
