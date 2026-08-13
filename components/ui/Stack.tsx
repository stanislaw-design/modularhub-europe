import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const stack = tv({
  base: "flex",
  variants: {
    direction: {
      row: "flex-row",
      column: "flex-col",
    },
    gap: {
      1: "gap-brand-1",
      2: "gap-brand-2",
      3: "gap-brand-3",
      4: "gap-brand-4",
      5: "gap-brand-5",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: 2,
    align: "stretch",
  },
});

interface StackProps extends VariantProps<typeof stack> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Stack({ as: As = "div", direction, gap, align, className, children }: StackProps) {
  return <As className={stack({ direction, gap, align, className })}>{children}</As>;
}
