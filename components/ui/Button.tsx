import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: "focus-ring inline-flex items-center justify-center gap-brand-1 rounded-marketing font-sans font-medium transition-opacity disabled:pointer-events-none disabled:opacity-50",
  variants: {
    variant: {
      primary: "bg-brand-passage-blue text-brand-warm-white hover:opacity-90 active:opacity-80",
      secondary:
        "border border-brand-steel bg-brand-warm-white text-brand-foundation-navy hover:bg-brand-steel/30",
      ghost: "text-brand-passage-blue hover:bg-brand-passage-blue/10",
    },
    size: {
      sm: "h-9 px-brand-2 text-body",
      md: "h-11 px-brand-3 text-body",
      lg: "h-12 px-brand-4 text-body-l",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
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

export function Button({ as = "button", variant, size, className, children, ...props }: ButtonProps) {
  const classes = button({ variant, size, className });

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
