import type { InputHTMLAttributes } from "react";
import { tv } from "tailwind-variants";

const checkbox = tv({
  base: "focus-ring size-5 rounded-data border border-brand-steel accent-brand-passage-blue disabled:cursor-not-allowed disabled:opacity-50",
});

type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return <input type="checkbox" className={checkbox({ className })} {...props} />;
}
