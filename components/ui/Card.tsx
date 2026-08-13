import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const card = tv({
  base: "rounded-card border border-brand-steel bg-brand-warm-white",
  variants: {
    padding: {
      none: "",
      sm: "p-brand-2",
      md: "p-brand-3",
      lg: "p-brand-4",
    },
  },
  defaultVariants: {
    padding: "md",
  },
});

interface CardProps extends VariantProps<typeof card> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Card({ as: As = "div", padding, className, children }: CardProps) {
  return <As className={card({ padding, className })}>{children}</As>;
}
