# 0029. Redesign the "Więcej niż dom" section as a pinned, photo led showcase

**Date**: 2026-09-08
**Status**: In Progress

## Summary

The "Więcej niż dom" (more than a house) section on the client home page shows the spa and pergola product families as two side by side cards next to a text column. This decision replaces it with a full bleed photo showcase: as the visitor scrolls the page, the section pins in place and the photo, label, description, and offer card smoothly change from spa to pergola. Dots and an arrow button let people jump between them by hand too. On phones the pinned scroll effect is skipped in favor of a normal touch carousel, since scroll driven pinning does not translate well to small screens.

## Requirements

**User stories**:
- As a visitor browsing the home page, I want to see the spa and pergola offerings presented as a real, browsable showcase (not just two flat cards) so that I get a premium first impression and can reach a real offer quickly.
- As a visitor on a phone, I want the same content in a touch friendly form (not a scroll hijacking effect) so that the section does not fight my normal scrolling.
- As a keyboard or reduced motion user, I want to move between categories without relying on the pinned scroll effect so that the section stays usable and accessible.

**Acceptance criteria**:
- **AC-1**: On desktop (`lg` breakpoint and above), the section pins in place while the user scrolls past it, and the visible category (photo, label, description, offer card) advances smoothly as scroll progresses, cycling through spa modułowe then pergola in that order.
- **AC-2**: Below the `lg` breakpoint, the section does not pin or hijack page scroll. It instead behaves as a normal horizontally swipeable touch carousel showing the same two categories, with the same dots.
- **AC-3**: A row of dots (one per category) is always visible, shows the current category, and is independently clickable/tappable to jump straight to that category, on every breakpoint.
- **AC-4**: A "next" arrow control is present and moves to the next category (wrapping from the last back to the first) on every breakpoint, independent of scroll position.
- **AC-5**: Each category's overlay shows, over its full bleed photo: the section heading top left ("Więcej niż dom", today's `heading` translation key, unchanged text), the category name and description bottom left, and an offer card bottom right holding the same real data as today (real featured project photo/price when one exists, product count badge as fallback), using `rounded-v5-card` for the offer card's corners, consistent with this component's existing card rounding.
- **AC-6**: The offer card, its image, and its price/count remain fully keyboard focusable and screen reader announced as a real link to the featured project (or to `/wyniki` in the fallback case), exactly as today; the pin/scroll mechanism never traps focus or scroll.
- **AC-7**: When `prefers-reduced-motion` is set, or when `IntersectionObserver`/scroll tracking is unavailable, the section renders without the pinning effect (same fallback as AC-2, the touch carousel presentation) so the content and its dot/arrow controls are always reachable without relying on animation.
- **AC-8**: The section keeps today's data boundary: the DB call (`getProductFamilyCounts`) and the mock project catalog call (`getFeaturedProjectByFamily`) still happen once, server side, in `CategoryShowcase`, and are passed down as typed props; no new client side data fetch is introduced.
- **AC-9**: One real `<h1>` per page is untouched; this section's heading stays an `<h2>`, and the pinned/carousel presentation does not break the page's logical focus order (tab order follows document order, not visual/scroll position).

## Decision

**Chosen option**: Option 1: Pinned scroll showcase with a touch carousel fallback below `lg`.

**Implementation skills**: none of the installed community skills materially shape this decision beyond what `AGENTS.md` and existing components already establish (Tailwind v4 tokens, `lucide-react` icons); no skill file was consulted.

## Feature design

**Data model sketch**: none. No new entity, field, or table. The section keeps consuming `getProductFamilyCounts()` (`lib/db/queries`) and `getFeaturedProjectByFamily()` (`lib/data/projects`) exactly as today; only the presentation of that same data changes.

**State transitions**: the section holds one piece of client side UI state, the active category index (0 = spa modułowe, 1 = pergola). Transitions: scroll progress crossing a threshold (desktop, `lg` and above) advances or retreats the index; a dot click jumps directly to its index; the arrow click advances to `(index + 1) % categories.length`. No transition is ever blocked; every state is reachable from every other state through the dots.

**Key invariants**:
- Exactly one category is the "active" one at any time; its dot is the one marked current.
- The photo, label, description, and offer card always belong to the same category (never a mismatched combination mid transition, beyond the crossfade itself).
- The section never prevents the page from continuing to scroll past it once the last category's pin range is exhausted (no dead end scroll trap).
- Data fetching stays server side only; the new client side piece is UI state (active index), never a data fetch.

**Security model**: unchanged from today; this is a public, unauthenticated marketing section with no new read or write surface.

**Configuration required**: none. No new environment variables, feature flags, or credentials.

**Critical test scenarios** (each maps to an acceptance criterion in Requirements):
- Happy path: on a `lg` viewport, scrolling through the section's pinned range shows spa modułowe first, then pergola, each with its own real featured project data, verifies **AC-1**, **AC-5**, **AC-8**.
- Mobile path: on a viewport below `lg`, the section renders as a swipeable carousel (no pin) with the same two categories and dots, verifies **AC-2**, **AC-3**.
- Manual control: clicking a dot jumps straight to that category on both breakpoints; clicking the arrow advances one category, wrapping from the last to the first, verifies **AC-3**, **AC-4**.
- Accessibility fallback: with `prefers-reduced-motion` set (or `IntersectionObserver` stubbed out, matching `ScrollReveal.test.tsx`'s existing pattern if any), the section renders the non pinned carousel form and every offer card link remains reachable by keyboard and correctly labeled, verifies **AC-6**, **AC-7**, **AC-9**.
- Regression: the existing pluralization, zero count, fallback to `/wyniki`, and real featured project price behaviors from `CategoryShowcase.test.tsx` still hold under the new markup, verifies **AC-5**, **AC-8**.

## Build plan

This project's build approach is Facade (root `AGENTS.md`): a fully clickable UI is built first on the data already available, with the real backend wired up later where it does not yet exist. Here the backend (real product counts and featured projects) already exists from spec 0022, so there is no facade/backend split left to sequence; the plan is a single, small UI replacement in place.

1. Split the data fetch from the presentation: keep `CategoryShowcase` (`components/klient/CategoryShowcase.tsx`) as the async server component doing today's `getProductFamilyCounts`/`getFeaturedProjectByFamily` calls, and add a new `"use client"` child component that receives the assembled `categories` array as a typed prop and owns the pin/carousel/dots/arrow interaction, satisfies **AC-8**.
2. Build the desktop pinned mechanic in the new client component: a `motion` `useScroll` bound to the section's own ref, `useTransform` (or an equivalent progress to index mapping) driving the active index, crossfading photo/overlay content between categories, satisfies **AC-1**, **AC-5**.
3. Build the shared dots and arrow controls (both breakpoints, both interaction modes), wired to the same active index state used by the pinned mechanic and the carousel, satisfies **AC-3**, **AC-4**.
4. Build the `lg` and below fallback: a `scroll-snap-x` touch carousel rendering the same category markup with no pinning, reusing `ScrollReveal`'s `IntersectionObserver`/`prefers-reduced-motion` guard pattern to also select this path on desktop when reduced motion is requested or `IntersectionObserver` is unavailable, satisfies **AC-2**, **AC-7**.
5. Apply the overlay layout to each category's full bleed photo: heading top left, category name and description bottom left, offer card bottom right in `rounded-v5-card`, no dark scrim (text shadow only, matching `Hero.tsx`), satisfies **AC-5**, **AC-6**.
6. Wire `app/[locale]/klient/page.tsx` to the same `CategoryShowcase` import (no slot change; the component keeps its name and position), verifies the replacement is a drop in swap, satisfies **AC-1** through **AC-9** together.
7. Update `components/klient/CategoryShowcase.test.tsx` for the new markup (dots, arrow, active category assertions) while keeping its existing data boundary mocks and regression coverage (pluralization, zero counts, fallback href, real featured project price), plus add the reduced motion/no `IntersectionObserver` fallback scenario, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**, and the Build plan's own regression requirement.

## Consequences

**Positive**:
- The home page's outdoor/wellness section goes from a flat two card grid to a distinctive, premium feeling showcase, matching the direction the engineer wants for the site's first impression.
- No new dependency, no new data model, no new backend surface; the change is contained to one component and its test.
- The accessible fallback (dots, arrow, non pinned carousel) is not an afterthought bolted on later, it is the same code path already required for mobile, so accessibility and small screen support come for free from AC-2/AC-7 rather than as separate work.

**Negative / tradeoffs**:
- Two rendering paths (pinned vs carousel) inside one component add real complexity and testing surface compared to today's single static grid.
- Pinned scroll effects are easy to get subtly wrong (jumpy transitions, a pin range that outlives its content, scroll restoration glitches on back navigation); this needs careful manual verification in a real browser, not just unit tests.
- With only two categories today, the pinned effect's pin range is short; if a third family is ever added later without revisiting this section, the per category scroll distance and crossfade timing may need retuning.

**Neutral**:
- The section's heading, description, and pricing copy (`messages/{pl,en,nl}.json`, `CategoryShowcase` namespace) are unchanged; only their layout and reveal mechanism change.
- `CategoryShowcase` stays the entry component name; the new client piece is an internal child, not a new top level export other screens need to know about.

## Follow-up

- [x] No scope feature currently links this spec — enrolled as [Produkcja #26](../../scope/produkcja.md).
- [ ] If a third outdoor/wellness family is ever added, revisit the pin range and crossfade timing chosen in Build plan task 2, they were tuned for exactly two categories.
- [ ] The pre existing, out of scope contrast issue on `--brand-v5-amber-strong` text noted against `CategoryShowcase.tsx` in spec 0027's Follow-up should be checked against whatever text color this redesign ends up using for the "view offer" affordance, since the whole visual treatment changes here. (The build kept the same `text-brand-v5-amber-strong` on `bg-brand-v5-surface`, same contrast as before — not fixed, not worsened.)
- [x] Build also fixed an app-wide, pre-existing CSS bug uncovered by this feature: `app/globals.css`'s `html, body { overflow-x: hidden }` broke `position: sticky` for any descendant expecting to stick against the real viewport (overflow-x/overflow-y coupling plus a skipped propagation rule turned `body` into its own inert scroll container). Fixed by keeping the rule on `body` only. See `rationale.md` for nothing further — this was discovered during the build, not part of the original design, and is recorded here and in `docs/scope/produkcja.md` feature 26.
