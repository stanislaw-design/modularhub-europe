import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Heading, Text } from "@/components/ui";
import type { ProducerContentItem } from "@/lib/db/queries";

// Sekcje treści producenta na stronie produktu (spec 0081 AC-11): "Sposób współpracy" (kroki) i zastosowania
// komercyjne. Lista pusta oznacza, że producent nie ma tej treści, i wtedy nic się nie renderuje. Kolor to bursztyn
// marki (v5-amber), ten sam co przy zapytaniu hurtowym, żeby sekcje wyróżniały się na tle szarej reszty strony.
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-brand-2">
      <span aria-hidden="true" className="h-8 w-1.5 shrink-0 rounded-full bg-brand-v5-amber-strong" />
      <Heading level="h2" surface="v5" className="text-h3">
        {children}
      </Heading>
    </div>
  );
}

export function ProducerCollaborationSteps({ items, heading }: { items: ProducerContentItem[]; heading: string }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-brand-4">
      <SectionHeading>{heading}</SectionHeading>
      <ol className="grid gap-brand-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line border-t-4 border-t-brand-v5-amber-strong bg-brand-v5-surface p-brand-4"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-brand-v5-amber-strong text-body-l font-black text-white"
            >
              {index + 1}
            </span>
            <span className="text-body-l font-bold text-brand-v5-ink">{item.title}</span>
            {item.body && (
              <Text tone="muted" surface="v5">
                {item.body}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ProducerCommercialUses({
  items,
  heading,
  children,
}: {
  items: ProducerContentItem[];
  heading: string;
  // Przycisk zapytania hurtowego (BulkProductInquiryModal), przekazany ze strony.
  children?: ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-brand-4 rounded-v5-card border border-brand-v5-amber-strong/40 bg-brand-v5-amber/10 p-brand-4 lg:p-brand-5">
      <SectionHeading>{heading}</SectionHeading>
      <ul className="grid gap-brand-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface px-brand-3 py-brand-3"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber-strong text-white"
            >
              <Check className="size-5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-brand-v5-ink">{item.title}</span>
              {item.body && (
                <Text tone="muted" surface="v5" className="font-normal">
                  {item.body}
                </Text>
              )}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
