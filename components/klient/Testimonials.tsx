import { Heading, StarRating, Text } from "@/components/ui";

// Static mocked reviews, same Facade spirit as the old StatsBar's stats
// array (spec 0015 AC-11) — not real submitted reviews.
const testimonials = [
  {
    name: "Anna K.",
    country: "Polska",
    rating: 5,
    quote:
      "Zapytanie do trzech producentów wysłałam w jeden wieczór, zamiast pisać do każdego osobno. Odpowiedzi przyszły w dwa dni.",
  },
  {
    name: "Michael R.",
    country: "Niemcy",
    rating: 5,
    quote:
      "Sprawdzenie zgodności z niemieckimi przepisami przed wysłaniem zapytania oszczędziło mi tygodni korespondencji z prawnikiem.",
  },
  {
    name: "Lotte V.",
    country: "Holandia",
    rating: 4,
    quote:
      "Podobało mi się, że od razu widziałam rozbitą cenę — dom, transport, montaż — a nie jeden tajemniczy zakres.",
  },
  {
    name: "Piotr S.",
    country: "Polska",
    rating: 5,
    quote:
      "Porównanie trzech projektów obok siebie pokazało mi, że dopłacałem za metry, których nie potrzebowałem.",
  },
  {
    name: "Sophie B.",
    country: "Niemcy",
    rating: 4,
    quote: "Platforma niezależna od producentów, więc czułam, że doradzają mi, a nie sprzedają.",
  },
];

export function Testimonials() {
  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Co mówią nasi klienci</Heading>
          <Text tone="muted">Opinie ilustracyjne, w oczekiwaniu na pierwszych klientów.</Text>
        </div>
        <ul className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.name}
              className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3"
            >
              <StarRating rating={testimonial.rating} />
              <Text className="text-body-l text-brand-v5-ink">“{testimonial.quote}”</Text>
              <Text tone="muted" className="mt-auto text-data">
                {testimonial.name} · {testimonial.country}
              </Text>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
