import type { InputHTMLAttributes } from "react";
import { tv } from "@/lib/tv";

const checkbox = tv({
  base: "focus-ring size-5 rounded-data border border-brand-steel accent-brand-passage-blue disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    surface: {
      v3: "",
      v5: "border-brand-v5-line accent-brand-v5-amber-strong",
    },
  },
  defaultVariants: {
    surface: "v3",
  },
});

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  surface?: "v3" | "v5";
}

export function Checkbox({ className, surface, ...props }: CheckboxProps) {
  return <input type="checkbox" className={checkbox({ surface, className })} {...props} />;
}
