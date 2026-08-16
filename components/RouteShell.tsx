import type { ReactNode } from "react";
import { Container } from "@/components/ui";

interface RouteShellProps {
  children: ReactNode;
}

// Minimal shared shell for the klient/ and producent/ route segments: the
// <main> landmark. Real navigation belongs to each path's first screen
// (klient: strona startowa, producent: rejestracja), not here. The skip link
// is rendered by each layout, before any header, so it stays the first Tab
// stop; see components/SkipLink.tsx.
export function RouteShell({ children }: RouteShellProps) {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col py-brand-4">{children}</Container>
    </main>
  );
}
