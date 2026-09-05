import type { LabelHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const label = tv({
  base: "text-label uppercase tracking-[0.1em] font-medium text-brand-technical-graphite",
  variants: {
    surface: {
      v3: "",
      v5: "text-brand-v5-muted",
    },
  },
  defaultVariants: {
    surface: "v3",
  },
});

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  surface?: "v3" | "v5";
}

export function Label({ className, children, required, surface, ...props }: LabelProps) {
  return (
    <label className={label({ surface, className })} {...props}>
      {children}
      {required && (
        <span className="text-status-blocked" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
}
