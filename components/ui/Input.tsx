import type { InputHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const input = tv({
  base: "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy placeholder:text-brand-technical-graphite/60 disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    invalid: {
      true: "border-status-blocked",
    },
  },
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={input({ invalid, className })}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
