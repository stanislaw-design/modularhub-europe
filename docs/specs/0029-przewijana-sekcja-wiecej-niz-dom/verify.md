# Verify: Sekcja "Więcej niż dom": przewijana witryna kategorii · spec 0029 · updated 2026-09-08

_Steps derived from spec 0029 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] On a `lg` (≥1024px) viewport, visit `/pl` and scroll into the "Więcej niż dom" section → the section pins (page stops scrolling the section itself) and the visible category's photo/name/description/offer card crossfades from spa modułowe to pergola as you keep scrolling, in that order → AC-1, AC-5
- [ ] Keep scrolling past the end of the pinned range → the page continues scrolling normally past the section (no dead-end scroll trap) → Key invariant (Feature design)
- [ ] Resize below `1024px` (or open on a phone) → the section does not pin; it is a normal horizontally swipeable strip showing the same two categories, with the same dots → AC-2
- [ ] On every breakpoint, a dot is visible per category, the current category's dot is visually marked current, and clicking/tapping a dot jumps straight to that category → AC-3
- [ ] On every breakpoint, the "next" arrow advances to the next category, wrapping from pergola back to spa modułowe → AC-4
- [ ] Each category's overlay shows, over its full-bleed photo: "Więcej niż dom" top left (unchanged, persists across categories), the category name + description bottom left, and an offer card bottom right with `rounded-v5-card` corners → AC-5
- [ ] Tab through the section with a keyboard → the offer card (its thumbnail image, price/count text, and "Zobacz oferty" link) is reachable, in document order, and an inactive/off-screen pinned slide's link is not reachable (no hidden focus trap) → AC-6, AC-9
- [ ] In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce" and reload → the section renders as the non-pinned touch carousel (same as the mobile fallback) on every breakpoint, with dots/arrow still usable and every offer link still reachable → AC-7
- [ ] Confirm there is exactly one `<h1>` on the page and the section's own heading is an `<h2>` → AC-9
- [ ] Resize the window narrower than the content and confirm no new horizontal scrollbar appears anywhere on the page (regression check for the `app/globals.css` `overflow-x` fix made during this build) → Consequences / Follow-up

## Commands

- [ ] `npm run test -- components/klient/CategoryShowcase.test.tsx` → all 7 tests pass (data boundary regression + dots/arrow + fallback link reachability) → AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- [ ] `npx tsc --noEmit` → no errors → build sanity
- [ ] `npm run build` → production build completes, `/pl`, `/en`, `/nl` prerender without error → build sanity

## Acceptance-criteria coverage

- AC-1 (desktop pin + crossfade order) … covered by UI step 1
- AC-2 (below-`lg` carousel fallback, same categories/dots) … covered by UI step 3
- AC-3 (dots: visible, current marked, clickable) … covered by UI step 4
- AC-4 (arrow: advances, wraps) … covered by UI step 5
- AC-5 (overlay layout: heading/name/description/offer card) … covered by UI steps 1, 6
- AC-6 (offer card keyboard/screen-reader reachable, no scroll/focus trap) … covered by UI step 7
- AC-7 (reduced-motion / no-IntersectionObserver fallback) … covered by UI step 8
- AC-8 (server-side data boundary unchanged, no new client fetch) … covered by Commands step 1 (regression mocks still pass)
- AC-9 (one real `<h1>`, logical tab order) … covered by UI steps 7, 9
