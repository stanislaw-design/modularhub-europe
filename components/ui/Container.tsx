import type { ElementType, ReactNode } from "react";
import { tv } from "tailwind-variants";

const container = tv({
  base: "mx-auto w-full max-w-brand-max px-[6%]",
});

interface ContainerProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Container({ as: As = "div", className, children }: ContainerProps) {
  return <As className={container({ className })}>{children}</As>;
}
