import type { InputHTMLAttributes } from "react";
import { tv } from "@/lib/tv";

const input = tv({
  base: "focus-ring h-11 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 text-body text-brand-foundation-navy placeholder:text-brand-technical-graphite/60 disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    invalid: {
      true: "border-status-blocked",
    },
    surface: {
      v3: "",
      v5: "border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink placeholder:text-brand-v5-muted/70",
    },
  },
  compoundVariants: [
    {
      invalid: true,
      surface: "v5",
      class: "border-status-blocked",
    },
  ],
  defaultVariants: {
    surface: "v3",
  },
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  surface?: "v3" | "v5";
}

export function Input({ className, invalid, surface, ...props }: InputProps) {
  return (
    <input
      className={input({ invalid, surface, className })}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
