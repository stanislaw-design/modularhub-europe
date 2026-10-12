import { tv, type VariantProps } from "@/lib/tv";

// Kolorowa pigułka kategorii (nie statusu: do statusów jest StatusPill).
// Barwa z --chip-* (app/globals.css); tekst to ta barwa zmieszana z tokenem
// tekstu motywu, żeby kontrast trzymał się i w jasnym, i w ciemnym trybie.
const pill = tv({
  base: "inline-flex items-center whitespace-nowrap rounded-full border px-brand-2 py-0.5 text-data font-medium " +
    "border-[color-mix(in_oklab,var(--chip)_40%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--chip)_16%,transparent)] " +
    "text-[color-mix(in_oklab,var(--chip)_55%,var(--brand-foundation-navy))]",
  variants: {
    tone: {
      sky: "[--chip:var(--chip-sky)]",
      teal: "[--chip:var(--chip-teal)]",
      violet: "[--chip:var(--chip-violet)]",
      pink: "[--chip:var(--chip-pink)]",
      lime: "[--chip:var(--chip-lime)]",
      sand: "[--chip:var(--chip-sand)]",
    },
  },
  defaultVariants: { tone: "sky" },
});

export const TAG_TONES = ["sky", "teal", "violet", "pink", "lime", "sand"] as const;
export type TagTone = (typeof TAG_TONES)[number];

interface TagPillProps extends VariantProps<typeof pill> {
  children: string;
  className?: string;
}

export function TagPill({ tone, className, children }: TagPillProps) {
  return <span className={pill({ tone, className })}>{children}</span>;
}
