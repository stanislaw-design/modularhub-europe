import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";

// Pasek nad każdym ekranem /internal/* (produkty, zapytania): samo
// wylogowanie, bez nawigacji — admin nie ma jeszcze wspólnego menu między
// ekranami (pełny panel to późniejsza funkcja, scope feature 18). Sesja/rola
// są nadal sprawdzane w każdej stronie z osobna (patrz AGENTS.md w
// internal/products/), ten layout tylko dokłada UI. Ten sam wzorzec przycisku
// co /klient/panel — patrz app/[locale]/klient/panel/layout.tsx.
export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-brand-steel">
        <Container className="flex justify-end py-brand-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-v5-muted transition-colors hover:text-brand-v5-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Wyloguj
            </button>
          </form>
        </Container>
      </div>
      {children}
    </>
  );
}
