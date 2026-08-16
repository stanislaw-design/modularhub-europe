# Verify: strona startowa · spec 0003 · updated 2026-08-13 (AC-8 skip-link clarified)
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl` → redirects to `/pl/klient`, header shows v2 logo linking to `/pl/klient` and "Zostań producentem" linking to `/pl/producent` → AC-1
- [ ] On `/pl/klient`, hero shows Kraj/od/do fields; the search-oriented h1 exists in the DOM (screen-reader only, no visible logo or headline) → AC-2
- [ ] "Szukaj" is disabled until a country is chosen; after picking Polska it enables, and clicking it navigates to `/pl/klient/wyniki?country=PL` (plus `sizeMin`/`sizeMax` only if set) → AC-3
- [ ] Pick "od" = 150 m² → "do" options narrow to 150/200 m² only; if "do" was already set below the new "od", it clears → AC-4
- [ ] "Polecane domy" shows exactly the fixtures with `featured: true` (4 of 6) as one-link cards (image, name, m², sypialnie, price range), no nested focusable elements inside a card → AC-5
- [ ] Click "Baltyk Studio 38" (38 m²) → lands on `/pl/klient/wyniki?sizeMax=50` (no `sizeMin`, no `country`); click "Modulor Family 90" (90 m²) → `sizeMin=50&sizeMax=100` → AC-6
- [ ] "Jak to działa" shows 4 numbered steps (wyszukaj, przeglądaj wyniki, wyślij zapytanie, śledź realizację) below the featured grid → AC-7
- [ ] Keyboard only: skip link, header link, Kraj/od/do (Headless UI Listbox), featured cards, step list are all reachable and operable (skip link's Tab position relative to the header links is not required to be first, per AC-8); exactly one real `<h1>` on the page → AC-8
- [ ] All copy is Polish, brand tone; no secondary element visually competes with the search action, except the disabled `CategoryFilterBar` category row (placeholder, not a competing action) → AC-9

## Commands
- [ ] `npx tsc --noEmit` → passes clean
- [ ] `npm run lint` → passes clean
- [ ] `npm run build` → `/pl` and `/pl/klient` both prerender successfully

## Acceptance-criteria coverage
- AC-1 … header + redirect step · AC-2 … hero content step · AC-3 … Szukaj enablement/navigation step · AC-4 … od/do filtering step · AC-5 … featured grid step · AC-6 … card rounding step (two examples) · AC-7 … how-it-works step · AC-8 … keyboard/H1 step · AC-9 … copy/CTA step
