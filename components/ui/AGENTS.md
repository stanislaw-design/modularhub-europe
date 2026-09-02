# components/ui/

The generic, domain free design system primitives (`Button`, `Card`, `Input`, `Select`, `Checkbox`, `Radio`, `Textarea`, `Heading`, `Text`, `DataText`, `Label`, `Container`, `Grid`, `Stack`, `StatusPill`, `StageTimeline`, `Accordion`, `FileUpload`, `StarRating`, `ScrollReveal`, …) that `components/klient/` and `components/producent/` compose. Established by `docs/specs/0002-system-projektowy-i-fundament-ui/`.

## Conventions

- Variant styling goes through `tailwind-variants` (`tv()`), not raw conditional `className` strings or another variants library: define a `tv({ base, variants, defaultVariants })` const per component (see `Button.tsx`, `StageTimeline.tsx`'s `marker`/`connector`), export `VariantProps` where callers need to pass a variant through.
- All Tailwind classes reference brand tokens (`bg-brand-passage-blue`, `text-brand-foundation-navy`, `rounded-data`, `gap-brand-2`, …) from `assets/tokens/brand-v3-tokens.css`'s `@theme`, never a raw hex or an arbitrary Tailwind color.
- Icons come from `lucide-react` (see the `lucide-icons` skill), always with `aria-hidden="true"` when decorative next to text.
- Import via the barrel `@/components/ui` (`index.ts` re-exports every primitive); a consumer never deep imports `components/ui/Button` directly.
- `focus-ring` (a token class, not a Tailwind utility) is the one sanctioned visible focus style, applied in each interactive primitive's `base` variant, not re-implemented per screen.
- Accessibility is built into the primitive, not left to callers: `StageTimeline` sets `aria-current="step"` on the current item itself; a screen using it does not need to reproduce that logic.

## Agent skills

- [lucide-icons](../../.agents/skills/lucide-icons/): `aksuharun/skills`, icon usage conventions for every primitive that renders an icon
- [headlessui](../../.agents/skills/headlessui/): `bobmatnyc/claude-mpm-skills`, unstyled accessible component conventions (`Select`, `Accordion`, and similar interactive primitives)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
