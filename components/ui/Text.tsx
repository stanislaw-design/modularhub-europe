import type { ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const text = tv({
  base: "font-sans",
  variants: {
    variant: {
      bodyL: "text-body-l",
      body: "text-body",
      label: "text-label uppercase tracking-[0.1em] font-medium",
    },
    tone: {
      default: "text-brand-foundation-navy",
      muted: "text-brand-technical-graphite",
    },
    measure: {
      true: "max-w-[68ch]",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
  },
});

const defaultTagByVariant = {
  bodyL: "p",
  body: "p",
  label: "span",
} as const;

interface TextProps extends VariantProps<typeof text> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Text({ as, variant = "body", tone, measure, className, children }: TextProps) {
  const Tag = as ?? defaultTagByVariant[variant];
  return <Tag className={text({ variant, tone, measure, className })}>{children}</Tag>;
}
