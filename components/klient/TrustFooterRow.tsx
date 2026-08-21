import { Headset, Landmark, MapPinned, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui";

const items = [
  {
    icon: ShieldCheck,
    title: "Bezpiecznie i pewnie",
    description: "Twoje dane są u nas zawsze chronione.",
  },
  {
    icon: Landmark,
    title: "Niezależna platforma",
    description: "Działamy dla Ciebie, nie dla producentów.",
  },
  {
    icon: Headset,
    title: "Ekspercka pomoc",
    description: "Nasz zespół pomaga na każdym etapie.",
  },
  {
    icon: MapPinned,
    title: "Wyprodukowane w Europie",
    description: "Wspieramy europejską jakość i innowacje.",
  },
];

// This is the closing content of the home page specifically, not a site
// footer (contact/legal, deliberately deferred — docs/scope/scope.md); named
// TrustFooterRow rather than "Footer" for exactly that reason.
export function TrustFooterRow() {
  return (
    <section className="full-bleed bg-brand-v4-paper py-brand-4">
      <Container className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex items-start gap-brand-2">
            <Icon className="size-6 shrink-0 text-brand-v4-amber" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-body font-semibold text-brand-v4-ink">{title}</span>
              <span className="text-body text-brand-v4-muted">{description}</span>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
