import type { TextareaHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const textarea = tv({
  base: "focus-ring min-h-24 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 py-brand-1 text-body text-brand-foundation-navy placeholder:text-brand-technical-graphite/60 disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    invalid: {
      true: "border-status-blocked",
    },
  },
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={textarea({ invalid, className })}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
