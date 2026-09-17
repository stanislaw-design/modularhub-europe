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
    // bg-background/text-foreground paint explicitly rather than relying on
    // body's own background: body sits outside the klient route's theme-scoped
    // wrapper (ThemeProvider), so only elements inside this subtree see the
    // dark mode custom property overrides (spec 0043 AC-11 — producer/internal
    // never render inside that wrapper, so this is a no-op there).
    <main id="main-content" className="flex flex-1 flex-col bg-background text-foreground">
      <Container className="flex flex-1 flex-col pt-brand-5 pb-brand-4">{children}</Container>
    </main>
  );
}
