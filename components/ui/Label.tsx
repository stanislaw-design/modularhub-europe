import type { LabelHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const label = tv({
  base: "text-label uppercase tracking-[0.1em] font-medium text-brand-technical-graphite",
});

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label className={label({ className })} {...props}>
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
