# components/ui/

The generic, domain free design system primitives (`Button`, `Card`, `Input`, `Select`, `Checkbox`, `Radio`, `Textarea`, `Heading`, `Text`, `DataText`, `Label`, `Container`, `Grid`, `Stack`, `StatusPill`, `StageTimeline`, `Accordion`, `FileUpload`, `StarRating`, `ScrollReveal`, `ThemeProvider`, `ThemeToggle`, …) that `components/klient/` and `components/producent/` compose. Established by `docs/specs/0002-system-projektowy-i-fundament-ui/`.

## Conventions

- Variant styling goes through `tailwind-variants` (`tv()`), not raw conditional `className` strings or another variants library: define a `tv({ base, variants, defaultVariants })` const per component (see `Button.tsx`, `StageTimeline.tsx`'s `marker`/`connector`), export `VariantProps` where callers need to pass a variant through.
- All Tailwind classes reference brand tokens (`bg-brand-passage-blue`, `text-brand-foundation-navy`, `rounded-data`, `gap-brand-2`, …) from `assets/tokens/brand-v3-tokens.css`'s `@theme`, never a raw hex or an arbitrary Tailwind color.
- Icons come from `lucide-react` (see the `lucide-icons` skill), always with `aria-hidden="true"` when decorative next to text.
- Import via the barrel `@/components/ui` (`index.ts` re-exports every primitive); a consumer never deep imports `components/ui/Button` directly.
- `focus-ring` (a token class, not a Tailwind utility) is the one sanctioned visible focus style, applied in each interactive primitive's `base` variant, not re-implemented per screen.
- Accessibility is built into the primitive, not left to callers: `StageTimeline` sets `aria-current="step"` on the current item itself; a screen using it does not need to reproduce that logic.
- `StageTimeline`'s v3 "completed" marker (`bg-brand-foundation-navy` + `text-brand-warm-white`) is not dark-mode-safe: both tokens invert independently under `.theme-klient` (spec 0043), so if this marker ever renders inside a dark customer screen it goes light-on-light. Currently safe only because no `components/klient/` screen imports `StageTimeline` (each has its own bespoke timeline); fix it the same way `components/klient/*.tsx`'s `v5-ink`→`v5-night` audit did (pin the fixed-dark pairing) before any future klient screen reuses it under dark mode.
- Headless UI's `Dialog` portals its panel to the end of `document.body`, not into the component tree it's declared in — dark mode's `.theme-klient` scoping (spec 0043) has to mirror its classes onto `document.body` itself (`ThemeProvider.tsx`) to reach it. Any other component that portals (a future `Menu`/`Popover` wrapped in an explicit `<Portal>`) needs the same consideration; a plain, non-portaled Headless UI `Menu`/`Listbox` does not.

## Agent skills

- [lucide-icons](../../.agents/skills/lucide-icons/): `aksuharun/skills`, icon usage conventions for every primitive that renders an icon
- [headlessui](../../.agents/skills/headlessui/): `bobmatnyc/claude-mpm-skills`, unstyled accessible component conventions (`Select`, `Accordion`, and similar interactive primitives)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
