import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const grid = tv({
  base: "grid grid-cols-12",
  variants: {
    gap: {
      1: "gap-brand-1",
      2: "gap-brand-2",
      3: "gap-brand-3",
      4: "gap-brand-4",
    },
  },
  defaultVariants: {
    gap: 3,
  },
});

interface GridProps extends VariantProps<typeof grid> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Grid({ as: As = "div", gap, className, children }: GridProps) {
  return <As className={grid({ gap, className })}>{children}</As>;
}
