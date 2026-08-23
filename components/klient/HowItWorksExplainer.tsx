import { Heading, Text } from "@/components/ui";

const stages = [
  {
    number: "1",
    title: "Szukaj",
    description: "Wybierz kraj i metraż w wyszukiwarce, przejrzyj dopasowane domy.",
  },
  {
    number: "2",
    title: "Porównaj",
    description: "Zestaw do trzech projektów obok siebie: cena, metraż, standard.",
  },
  {
    number: "3",
    title: "Sprawdź zgodność",
    description: "Compliance Engine™ sprawdza dom pod kątem prawa Twojego kraju.",
  },
  {
    number: "4",
    title: "Zapytaj o oferty",
    description: "Wyślij jedno zapytanie do wybranych producentów naraz.",
  },
  {
    number: "5",
    title: "Odbierz dom",
    description: "Śledź produkcję, transport i montaż aż po odbiór kluczy.",
  },
];

// Whole-journey explainer, distinct from ClosingCta's three-step summary
// (spec 0015 AC-7), which covers only the inquiry step, not this end to end
// path from search to handover.
export function HowItWorksExplainer() {
  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Jak działa ModularHub</Heading>
          <Text tone="muted">Pięć kroków od pierwszego wyszukiwania do odbioru kluczy.</Text>
        </div>
        <ol className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-5">
          {stages.map((stage) => (
            <li key={stage.number} className="flex flex-col gap-brand-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-v5-amber font-mono text-body font-semibold text-brand-v5-amber-foreground">
                {stage.number}
              </span>
              <Text className="text-body-l font-semibold text-brand-v5-ink">{stage.title}</Text>
              <Text tone="muted">{stage.description}</Text>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
