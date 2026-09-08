# 0029. Rationale

## Context

The current section (`components/klient/CategoryShowcase.tsx`) already fetches real data (each card links to a real featured project via `getFeaturedProjectByFamily`, with a real starting price, falling back to the unfiltered results list only when no example exists yet, spec 0022 AC-8). What changes is purely presentational: today it is a static two column grid (image left, text right, side by side), and the new direction is a single full bleed photo per category, with the label, description, and price/offer card layered on top, one category visible at a time, advancing as the page scrolls past the section.

This section only ever shows the outdoor/wellness families (spa modułowe, pergola); the house family already gets its own showcase higher on the page (`PopularHomes`) and is out of scope here, unchanged from today.

The project already ships the `motion` package (framer motion's current successor) for other scroll and entrance animations (`SearchCard.tsx`, `SearchSegment.tsx`, `WordRotate.tsx`), and an established `IntersectionObserver` based reveal pattern (`components/ui/ScrollReveal.tsx`) that degrades gracefully when `IntersectionObserver` is unavailable and honors `prefers-reduced-motion` through its own CSS class. Both are direct precedent for how this section should be built, so no new animation library is needed.

The home page's other full bleed photo section, `Hero.tsx`, already made and documented a specific choice for text over a photo: no dark scrim, legibility carried by the heading's own text shadow instead. That is the established brand pattern this section's overlaid label should follow, not a fresh decision.

## Options considered

### Option 1: Pinned scroll showcase with a touch carousel fallback below `lg` (chosen)

Desktop scroll pins the section and drives which category is visible; a `motion` `useScroll`/`useTransform` pair (targeting the section's own ref) computes progress and switches the active index, crossfading the photo/overlay. Below `lg`, and whenever `prefers-reduced-motion` or `IntersectionObserver` is unavailable, the same markup renders as a plain horizontally scrollable (`scroll-snap-x`) touch carousel with no pinning. Dots and an arrow control both breakpoints identically.

**Pros**:
- Matches the reference design's effect on desktop, where it reads best (large canvas, mouse/trackpad scroll).
- Reuses an already installed package (`motion`) and an already established accessibility fallback pattern (`ScrollReveal`'s `IntersectionObserver` guard and reduced motion respect), no new dependency.
- Keeps mobile on a well understood, low risk interaction (swipe carousel) instead of extending scroll hijacking to a context where it is known to misbehave (address bar collapse, variable viewport height, momentum scrolling conflicts).

**Cons**:
- Two code paths (pinned vs carousel) to build, test, and keep visually consistent.
- Pinning is more code than a plain carousel and needs care so it never traps scroll or breaks page level scroll restoration.

### Option 2: Autoplay carousel everywhere (no pinning, no scroll link)

Content changes on a timer, with dots and an arrow to override, on every breakpoint; the page scrolls normally, the section never pins.

**Pros**:
- Simplest to build and test, one code path for every breakpoint.
- Zero scroll hijacking risk anywhere, easiest to keep accessible.

**Cons**:
- Does not deliver what was actually asked for ("płynnie zmieniająca się zawartość ze scrollem", content that changes with scroll); an autoplay timer is a different, weaker effect than the reference design.
- Autoplay competes with the user's own reading pace and needs its own pause on hover/focus/visibility handling to stay accessible.

### Option 3: Horizontal in section scroll/drag on every breakpoint (no page pinning anywhere)

The whole section becomes a horizontally draggable/scrollable strip (desktop and mobile alike); the page itself always scrolls normally past the section.

**Pros**:
- One interaction model for every breakpoint, no pin/carousel split to maintain.
- Still literally "changes with scroll", just horizontal instead of tied to page (vertical) scroll.

**Cons**:
- Loses the specific effect from the reference image, where the page's own vertical scroll is what drives the change; a sideways drag reads as a normal carousel, not the more distinctive pinned reveal.
- The engineer's own answer named page scroll driven pinning as the desktop behavior; this option does not deliver that.

## Rationale

The engineer explicitly asked for page scroll driven content change ("płynnie zmieniająca się zawartość ze scrollem") and picked the pinned mechanic over an autoplay or in section horizontal scroll alternative, so Option 1 is the only one that delivers the actual request rather than a lookalike. Restricting the pinned effect to `lg` and above, with a plain touch carousel below it, follows directly from the engineer's own mobile answer and from `AGENTS.md`'s WCAG 2.2 AA requirement: scroll hijacking on a phone fights the browser chrome and momentum scrolling in ways a desktop trackpad does not have to contend with, so the safer, well understood pattern is used where it is actually safer. Reusing `motion` and the `ScrollReveal` degrade-gracefully pattern keeps this a zero new dependency change, in line with the project's existing conventions rather than introducing a dedicated carousel library for one section.
