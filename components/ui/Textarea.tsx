import type { TextareaHTMLAttributes } from "react";
import { tv } from "@/lib/tv";

const textarea = tv({
  base: "focus-ring min-h-24 w-full rounded-data border border-brand-steel bg-brand-warm-white px-brand-2 py-brand-1 text-body text-brand-foundation-navy placeholder:text-brand-technical-graphite/60 disabled:cursor-not-allowed disabled:opacity-50",
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

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  surface?: "v3" | "v5";
}

export function Textarea({ className, invalid, surface, ...props }: TextareaProps) {
  return (
    <textarea
      className={textarea({ invalid, surface, className })}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
