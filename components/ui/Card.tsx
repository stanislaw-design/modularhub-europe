import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "@/lib/tv";

const card = tv({
  base: "rounded-card border border-brand-steel bg-brand-warm-white",
  variants: {
    padding: {
      none: "",
      sm: "p-brand-2",
      md: "p-brand-3",
      lg: "p-brand-4",
    },
    surface: {
      v3: "",
      v5: "rounded-v5-card border-brand-v5-line bg-brand-v5-surface",
    },
  },
  defaultVariants: {
    padding: "md",
    surface: "v3",
  },
});

interface CardProps extends VariantProps<typeof card> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Card({ as: As = "div", padding, surface, className, children }: CardProps) {
  return <As className={card({ padding, surface, className })}>{children}</As>;
}
