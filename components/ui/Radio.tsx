import type { InputHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const radio = tv({
  base: "focus-ring size-5 border border-brand-steel accent-brand-passage-blue disabled:cursor-not-allowed disabled:opacity-50",
});

type RadioProps = InputHTMLAttributes<HTMLInputElement>;

export function Radio({ className, ...props }: RadioProps) {
  return <input type="radio" className={radio({ className })} {...props} />;
}
