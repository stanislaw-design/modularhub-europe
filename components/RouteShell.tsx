import type { ReactNode } from "react";
import { Container } from "@/components/ui";

interface RouteShellProps {
  children: ReactNode;
}

// Minimal shared shell for the klient/ and producent/ route segments: a skip
// link plus the <main> landmark. Real navigation belongs to each path's first
// screen (klient: strona startowa, producent: rejestracja), not here.
export function RouteShell({ children }: RouteShellProps) {
  return (
    <>
      <a
        href="#main-content"
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-brand-2 focus:top-brand-2 focus:z-50 focus:rounded-data focus:bg-brand-passage-blue focus:px-brand-2 focus:py-brand-1 focus:text-body focus:text-brand-warm-white"
      >
        Przejdź do treści
      </a>
      <main id="main-content" className="flex flex-1 flex-col">
        <Container className="flex flex-1 flex-col py-brand-4">{children}</Container>
      </main>
    </>
  );
}
