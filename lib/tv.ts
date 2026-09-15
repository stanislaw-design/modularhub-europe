import { createTV } from "tailwind-variants";

export type { VariantProps } from "tailwind-variants";

// This project's custom font-size scale (app/globals.css @theme:
// text-display-xl/h1/h2/h3/body-l/body/data/label) uses names tailwind-merge
// (tv()'s internal conflict resolver) doesn't recognize as font-size utilities.
// It falls back to bucketing them as ambiguous text-* classes, which collide
// with a text-color class applied later in the same tv() call (e.g. Heading's
// `text-h1` + a `surface` variant's `text-brand-v5-ink` silently drops
// `text-h1`, collapsing the element to its inherited font size). Registering
// these names under Tailwind's own "font-size" class group fixes every
// component built on `tv()` at once, instead of the raw-tag workaround
// scattered through ProjectRequestFlow/BulkOrdersShowcase before this existed.
export const tv = createTV({
  twMergeConfig: {
    extend: {
      classGroups: {
        "font-size": [
          "text-display-xl",
          "text-h1",
          "text-h2",
          "text-h3",
          "text-body-l",
          "text-body",
          "text-data",
          "text-label",
        ],
      },
    },
  },
});
