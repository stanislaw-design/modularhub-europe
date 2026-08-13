import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const dataText = tv({
  base: "font-mono text-data tabular-nums text-brand-foundation-navy",
  variants: {
    tone: {
      default: "text-brand-foundation-navy",
      muted: "text-brand-technical-graphite",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

interface DataTextProps extends VariantProps<typeof dataText> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function DataText({ as: As = "span", tone, className, children }: DataTextProps) {
  return <As className={dataText({ tone, className })}>{children}</As>;
}
