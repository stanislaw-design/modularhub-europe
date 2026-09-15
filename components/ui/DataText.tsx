import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "@/lib/tv";

const dataText = tv({
  base: "font-mono text-data tabular-nums text-brand-foundation-navy",
  variants: {
    tone: {
      default: "text-brand-foundation-navy",
      muted: "text-brand-technical-graphite",
    },
    surface: {
      v3: "",
      v5: "",
    },
  },
  compoundVariants: [
    { tone: "default", surface: "v5", class: "text-brand-v5-ink" },
    { tone: "muted", surface: "v5", class: "text-brand-v5-muted" },
  ],
  defaultVariants: {
    tone: "default",
    surface: "v3",
  },
});

interface DataTextProps extends VariantProps<typeof dataText> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function DataText({ as: As = "span", tone, surface, className, children }: DataTextProps) {
  return <As className={dataText({ tone, surface, className })}>{children}</As>;
}
