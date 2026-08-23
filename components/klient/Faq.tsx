import { Accordion, Heading, Text, type AccordionItem } from "@/components/ui";

const faqItems: AccordionItem[] = [
  {
    id: "faq-jak-dziala",
    question: "Jak dokładnie działa ModularHub?",
    answer:
      "Wyszukujesz domy dostępne w Twoim kraju, porównujesz do trzech projektów, sprawdzasz zgodność z prawem przez Compliance Engine™, a następnie wysyłasz jedno zapytanie do wybranych producentów zamiast pisać do każdego osobno.",
  },
  {
    id: "faq-koszt",
    question: "Czy korzystanie z platformy jest płatne?",
    answer:
      "Przeglądanie ofert, porównywanie i wysyłanie zapytań są bezpłatne. Płatny jest wyłącznie opcjonalny raport analizy działki pod konkretny projekt.",
  },
  {
    id: "faq-ceny",
    question: "Dlaczego cena to widełki, a nie jedna kwota?",
    answer:
      "Ostateczna cena zależy od standardu wykończenia, transportu do Twojej lokalizacji i zakresu montażu. Widełki pokazują realny zakres, zanim otrzymasz wiążącą ofertę od producenta.",
  },
  {
    id: "faq-zgodnosc",
    question: "Co sprawdza Compliance Engine™?",
    answer:
      "Konstrukcję, izolację, wentylację i wymaganą dokumentację danego domu w zestawieniu z przepisami budowlanymi kraju, do którego ma trafić — zanim wyślesz zapytanie do producenta.",
  },
  {
    id: "faq-producenci",
    question: "Skąd wiadomo, że producenci są sprawdzeni?",
    answer:
      "Każdy producent na platformie przechodzi weryfikację ModularHub, widoczną jako odznaka na jego karcie, zanim jego projekty pojawią się w wynikach wyszukiwania.",
  },
  {
    id: "faq-czas",
    question: "Ile czasu zajmuje otrzymanie ofert?",
    answer:
      "Zwykle do 48 godzin od wysłania zapytania — producenci odpowiadają bezpośrednio na adres podany w formularzu kontaktowym.",
  },
];

// Built on the shared Accordion (Disclosure-based, spec 0015 AC-12): first
// real use of that component in the project.
export function Faq() {
  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Najczęstsze pytania</Heading>
          <Text tone="muted">Nie znalazłeś odpowiedzi? Napisz do nas przez formularz kontaktowy.</Text>
        </div>
        <Accordion items={faqItems} className="max-w-[75ch]" />
      </div>
    </section>
  );
}
