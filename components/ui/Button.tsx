import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "focus-ring inline-flex items-center justify-center gap-brand-1 rounded-marketing font-sans font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      primary:
        "bg-brand-passage-blue text-brand-action-foreground hover:bg-brand-electric-plane active:opacity-90",
      secondary:
        "border border-brand-steel bg-brand-warm-white text-brand-foundation-navy hover:bg-brand-steel/30",
      ghost: "text-brand-passage-blue hover:bg-brand-passage-blue/10",
    },
    size: {
      sm: "h-9 px-brand-2 text-body",
      md: "h-11 px-brand-3 text-body",
      lg: "h-12 px-brand-4 text-body-l",
    },
    surface: {
      v3: "",
      v5: "",
    },
  },
  compoundVariants: [
    {
      variant: "primary",
      surface: "v5",
      class: "bg-brand-v5-amber text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong",
    },
    {
      variant: "secondary",
      surface: "v5",
      class: "border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink hover:bg-brand-v5-line/40",
    },
    {
      // text-brand-v5-ink, not amber: amber-strong (#e89200) on white is
      // ~2.5:1, below WCAG's 4.5:1 text threshold (AC-9). Amber stays for the
      // hover wash and non-text accents only.
      variant: "ghost",
      surface: "v5",
      class: "text-brand-v5-ink hover:bg-brand-v5-amber/10",
    },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
    surface: "v3",
  },
});

type ButtonVariants = VariantProps<typeof button>;

interface ButtonAsButton extends ButtonVariants, ButtonHTMLAttributes<HTMLButtonElement> {
  as?: "button";
  children: ReactNode;
}

interface ButtonAsAnchor extends ButtonVariants, AnchorHTMLAttributes<HTMLAnchorElement> {
  as: "a";
  children: ReactNode;
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({ as = "button", variant, size, surface, className, children, ...props }: ButtonProps) {
  const classes = button({ variant, size, surface, className });

  if (as === "a") {
    return (
      <a className={classes} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
