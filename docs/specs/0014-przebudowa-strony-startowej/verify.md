# Verify: strona startowa (hero marki) · spec 0014 · updated 2026-08-18

_Steps derived from spec 0014 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Visit `/pl/klient` → header shows full nav (Domy, Producenci, Projekty, Inspiracje, Jak to działa, O nas), language switcher, Ulubione, Zaloguj się, Zacznij → AC-1
- [ ] Click logo and "Domy" → both navigate to `/pl/klient`; click "Jak to działa" → navigates to `/pl/klient#jak-to-dziala` and scrolls to the closing CTA's numbered steps → AC-1
- [ ] Click "Zacznij" → navigates to `/pl/producent`; confirm Producenci/Projekty/Inspiracje/O nas/language switcher/Ulubione/Zaloguj się render as visibly disabled buttons (not links) → AC-1
- [ ] Hero renders on a dark navy background with a photo, a real (non-`sr-only`) `<h1>`, a supporting paragraph, 3 trust badges, and two buttons: "Znajdź swój dom" (amber) and "Dla producentów" (outline, → `/pl/producent`) → AC-2
- [ ] Click "Znajdź swój dom" → smooth-scrolls down to the search card → AC-2
- [ ] Search card shows 5 fields (Gdzie, Typ domu, Budżet, Powierzchnia, Dostawa) overlapping the hero's bottom edge; Typ domu/Budżet/Dostawa are visibly disabled with no dropdown behavior; Gdzie and Powierzchnia open real listboxes → AC-3
- [ ] With no country selected, "Szukaj domów" is disabled; select a country → button becomes enabled → AC-3
- [ ] Select country "Niemcy" and Powierzchnia "50–100 m²", click "Szukaj domów" → lands on `/pl/klient/wyniki?country=DE&sizeMin=50&sizeMax=100` → AC-4
- [ ] Select only a country (leave Powierzchnia on "Dowolna"), click "Szukaj domów" → lands on `/pl/klient/wyniki?country=<code>` with no `sizeMin`/`sizeMax` in the URL → AC-4
- [ ] Stats bar renders 5 items: 250+ producers, 1 000+ projects, 15 000+ clients, 25+ countries, 4,8/5 rating with stars and a review count → AC-5
- [ ] "Odkryj popularne kategorie domów" renders exactly 4 cards (image, name, illustrative count, arrow); clicking a card or "Zobacz wszystkie kategorie" navigates to `/pl/klient/wyniki` with no query params → AC-6
- [ ] "Dlaczego ModularHub Europe?" renders a label, heading, paragraph, "Dowiedz się, jak to działa" button (→ `#jak-to-dziala`), and 4 benefit tiles (Porównuj wygodnie / 100% przejrzystości / Compliance Engine™ / Oszczędzaj czas i pieniądze) → AC-7
- [ ] "Zaufaj nam wiodący producenci" bar renders only real producer names from the fixtures (Modulor Systems Sp. z o.o., Baltyk Modular Sp. z o.o., Karpaty Haus Sp. z o.o.) as styled text — no third-party logos/names from the reference image; "Zobacz wszystkich producentów" is visibly disabled → AC-8
- [ ] Closing CTA (dark bg, photo) renders "Otrzymaj 3 dopasowane oferty w 48 godzin", a paragraph, "Otrzymaj darmowe oferty" button, and 3 numbered steps; clicking the button scrolls back up to the search card → AC-9
- [ ] Bottom trust row renders 4 items (Bezpiecznie i pewnie / Niezależna platforma / Ekspercka pomoc / Wyprodukowane w Europie), each with an icon and short text → AC-10
- [ ] `/pl/klient` no longer renders "Polecane domy" or the old "Jak to działa" step grid; `/pl/klient/wyniki` still sorts featured projects first (unchanged) → AC-13

## Accessibility (AC-11)

- [ ] Exactly one real `<h1>` on the page (the hero headline)
- [ ] First `Tab` press focuses the "Przejdź do treści" skip link with a visible focus ring
- [ ] Every disabled placeholder (nav items, search card's Typ domu/Budżet/Dostawa, "Zobacz wszystkich producentów") carries a real `disabled` attribute
- [ ] Decorative images (`aria-hidden` overlays) have empty `alt`; meaningful images (hero, category cards) have descriptive `alt`
- [ ] Text on `--brand-v4-amber` fills (buttons, step numbers) uses `--brand-v4-amber-foreground` (dark navy), never white

## Responsive (AC-12)

- [ ] At 375px width: hero and search card stack vertically, stats bar wraps to 2 columns, category grid to 1–2 columns, benefit tiles to 1 column, producers bar scrolls horizontally, closing CTA stacks content above the image
- [ ] No horizontal page scroll at 375px width (`document.documentElement.scrollWidth` ≤ `clientWidth`)

## Commands

- [ ] `npm run build` → succeeds, no TypeScript errors
- [ ] `npm run lint` → clean
- [ ] `npm run test -- --run` → all unit/component tests pass (357 at time of writing)
- [ ] `npx playwright test e2e/wyniki.spec.ts` → all e2e tests pass, including the two rewritten home-page search-card regression tests

## Acceptance-criteria coverage

- AC-1 … header nav and real vs. disabled links · AC-2 … hero content and buttons · AC-3 … search card fields · AC-4 … search navigation contract · AC-5 … stats bar · AC-6 … category showcase · AC-7 … why-us section · AC-8 … trusted producers (real names only) · AC-9 … closing CTA and anchor target · AC-10 … trust footer row · AC-11 … accessibility · AC-12 … responsive layout · AC-13 … old sections removed, `featured` sort untouched
