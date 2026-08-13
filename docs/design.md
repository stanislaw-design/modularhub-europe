---
name: modularhub-europe-design-system
source: brand-guidelines-v3 (docs/brand-guidelines-v3.md; tokens extended, not invented, from assets/tokens/brand-v3-tokens.css)
character: "Engineered confidence: a technical, documentary system for a cross-border industrial platform. Flat, cornered, precise — closer to a spec sheet or a customs manifest than a consumer marketing site. Navy carries trust and hierarchy, Passage Blue is the only color that means 'act here', and the three status colors are a reserved, separate language that never leaks into decoration."
tokens: "real values live in app/globals.css (@theme inline) and assets/tokens/brand-v3-tokens.css; read them there, never duplicated here"
contrast: "Foundation Navy on Warm White ~13.6:1; Passage Blue on Warm White ~5.3:1; white text on Passage Blue ~6.0:1 (all verified in brand-guidelines-v3.md section 14). Focus ring contrast (rgba(23,92,211,0.28) box-shadow) is flagged as likely below the 3:1 non-text minimum in WCAG 2.2 AA; owned by spec 0002's Follow-up, needs brand-owner sign-off (governance, section 15) before the token itself changes."
---

## Build mandate

You are a senior product designer building a demonstration prototype (Facade approach: full clickable interface on mock data). Every screen ships as a complete, professional product surface — brand, real Polish copy, a considered layout with hierarchy, all reachable states, no lone form floating on an empty page. This fundament (tokens, components, mock data, routing shells) is what every one of the thirteen prototype screens builds on; no screen should invent its own color, spacing, radius, or font-loading approach.

## Character & direction

- **Flat, not spatial.** The 3D brand language (section 9 of the guidelines) belongs to marketing renders and the v3 logo lockups, never to product UI. Interface elements are flat rectangles with small, deliberate radii.
- **Navy for trust, Blue for action.** Foundation Navy carries headings, body text, and hierarchy. Passage Blue is reserved for CTAs, links, and active steps — it is not a decorative accent. Electric Plane is reserved for large display graphics and edge-light effects only; it never appears as UI chrome or text below 18px on a light background.
- **Status is its own language.** `approved` / `conditional` / `blocked` (green / amber / red) are reserved product colors, never brand accents, and never the only signal — every status ships with text and an icon (`StatusPill`).
- **One message per view, generous breathing room.** The 8px spacing module and the 12-column digital grid (5–7% container margin) exist so screens don't get crowded; prefer more whitespace over a second competing call to action.
- **No dark mode.** The brand system is light-only (Warm White base); nothing in the guidelines or this build calls for a `.dark` variant.

## Composition patterns

- **Container**: centers content at `max-w-brand-max` (1440px, a chosen value — the guidelines specify the 12-column/5–7% margin rule but not a concrete max-width) with `px-[6%]` (mid-point of the 5–7% range).
- **Route shells**: `app/[locale]/klient/layout.tsx` and `app/[locale]/producent/layout.tsx` both wrap children in a skip link (`Przejdź do treści`) plus a single `<main id="main-content">` landmark inside `Container`. Neither renders navigation yet — that's owned by each path's first screen (klient: strona startowa, screen 4; producent: rejestracja, screen 11).
- **Vertical rhythm**: stack sections with the `Stack` layout primitive (`gap-brand-*` tokens) rather than ad hoc margins; use `Grid` (`grid-cols-12`) for anything that needs column alignment (comparison tables, multi-field forms).
- **Decision communication**: any screen that shows a status result should follow the guideline's decision pattern (section 12) — outcome, scope, source, date, next step — not just a bare pill.

## Component & usage rules (do's and don'ts)

All components live in `components/ui/` (barrel export `components/ui/index.ts`), styled with `tailwind-variants` (`tv()`), reading only registered tokens — no component hardcodes a hex color, a pixel radius, or an ad hoc spacing value.

| Component | Variants / props | Notes |
|---|---|---|
| `Button` | `variant`: primary / secondary / ghost · `size`: sm / md / lg · `as`: `"button"` \| `"a"` | Primary = filled Passage Blue, for the one main action per view. Secondary = outlined, Steel border. Ghost = text-only Passage Blue, for tertiary actions. `as="a"` renders a real anchor (e.g. the screen 4 hero CTA) with identical styling. |
| `Input`, `Textarea` | `invalid` boolean | Native HTML, full keyboard support for free. `radius-data` (4px) — functional data-entry fields, not marketing modules. |
| `Select` | `value`, `onChange`, `options`, `invalid`, `disabled` | The one form field that needs Headless UI (`Listbox`) — native `<select>` can't give it real custom styling with full keyboard support. Client component (`"use client"`); any screen using it must draw its own server/client boundary. |
| `Checkbox`, `Radio` | native props | Native inputs, `accent-brand-passage-blue`. |
| `Label` | `required` boolean | Always uppercase, `text-label` token, tracking `0.1em` (mid-point of the guideline's 0.08–0.14em range) — per section 8, tracking and uppercase are utility classes, not separate tokens. |
| `StatusPill` | `status`: approved / conditional / blocked | Always icon + text, never color alone (section 7). Uses `radius-data`, not a stadium pill, to stay inside the brand's flat/cornered language despite the component's name. |
| `Card` | `padding`: none / sm / md / lg | Generic shell only — 1px Steel border, `radius-card` (6px), no built-in content structure. |
| `Heading` | `level`: displayXl / h1 / h2 / h3 | `font-display` (Montserrat), maps to a real heading tag (`displayXl` renders as `<h1>` too — a page has one true H1; pick the level for the visual size you need, not to skip hierarchy). |
| `Text` | `variant`: bodyL / body / label · `tone`: default / muted · `measure` boolean | `tone="muted"` = Technical Graphite, for secondary copy and captions. `measure` caps line length at 68 characters (section 8) for long-form body copy. |
| `DataText` | `tone`: default / muted | `font-mono` (IBM Plex Mono), `tabular-nums` — for prices, dimensions, dates, document/module codes. |
| `Container`, `Grid`, `Stack` | see above | Layout primitives; every screen composes from these rather than raw flex/grid utility soup. |

**Don't**: introduce a fourth status color; use Electric Plane as a UI background or small text color; use Tailwind's native `ring-*` utilities for focus (the brand focus ring is a ready-made `box-shadow`, wired as the shared `.focus-ring` class in `app/globals.css`); build a new interactive primitive (dialog, tabs, table, timeline, file upload) here — those are owned by the screen spec that first needs them (screens 8/14, 10/16, 12), built on top of `Button` / `Card` / tokens, not from scratch.

**Deferred on purpose** (see spec 0002's Consequences): loading/skeleton states (mock data reads instantly, so this waits for the real-API stage); a `Producer` entity beyond `Project.producerId`/`producerName`; an order/status entity for the fulfilment timeline (screens 10, 16); per-country pricing (today `priceMin`/`priceMax` sit on `Project`, not per target country, even though transport cost realistically varies by destination).

## Responsive & accessibility direction

- **Standard**: WCAG 2.2 AA (brand-guidelines-v3.md section 14), enforced project-wide, not just on this fundament.
- **Keyboard & focus**: every interactive component carries the shared `.focus-ring` (a visible `box-shadow`, not a native `ring-*` utility); native elements (`Button`, `Input`, `Textarea`, `Checkbox`, `Radio`) get full keyboard support from semantic HTML; `Select` gets it from Headless UI's `Listbox`.
- **Landmarks**: every route inside `klient/` and `producent/` has exactly one `<main id="main-content">`, reachable by the "Przejdź do treści" skip link at the top of each path's layout.
- **Color**: status is always paired with text and an icon; Interior Light never carries meaning (max ~5% of any composition, material light only, per section 7).
- **Data model & mock fixtures**: `Project`, `Country` (`PL`/`DE`/`NL`), `EligibilityByCountry` in `lib/data/types.ts`; sample data in `lib/data/fixtures/`; async access functions (`getProjects`, `getProjectById`, `getCountries`, `getEligibility`) in `lib/data/*.ts` — same shape a real API will fill in later, so no screen that calls them needs to change when that happens.
