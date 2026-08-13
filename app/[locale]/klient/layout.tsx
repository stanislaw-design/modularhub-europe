import type { ReactNode } from "react";
import { RouteShell } from "@/components/RouteShell";

export default function KlientLayout({ children }: { children: ReactNode }) {
  return <RouteShell>{children}</RouteShell>;
}
