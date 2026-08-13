import type { ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const heading = tv({
  base: "font-display font-semibold text-brand-foundation-navy",
  variants: {
    level: {
      displayXl: "text-display-xl font-bold",
      h1: "text-h1",
      h2: "text-h2",
      h3: "text-h3",
    },
  },
  defaultVariants: {
    level: "h2",
  },
});

const tagByLevel = {
  displayXl: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
} as const;

interface HeadingProps extends VariantProps<typeof heading> {
  className?: string;
  children: ReactNode;
}

export function Heading({ level = "h2", className, children }: HeadingProps) {
  const Tag = tagByLevel[level];
  return <Tag className={heading({ level, className })}>{children}</Tag>;
}
