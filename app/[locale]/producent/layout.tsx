import type { ReactNode } from "react";
import { RouteShell } from "@/components/RouteShell";

export default function ProducentLayout({ children }: { children: ReactNode }) {
  return <RouteShell>{children}</RouteShell>;
}
