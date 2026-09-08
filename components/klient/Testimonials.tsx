import { getTranslations } from "next-intl/server";
import { Heading, StarRating, Text } from "@/components/ui";

// Static mocked reviews, same Facade spirit as the old StatsBar's stats
// array (spec 0015 AC-11) — not real submitted reviews.
export async function Testimonials() {
  const t = await getTranslations("Testimonials");
  const testimonials = [
    { name: "Anna K.", country: t("countryPl"), rating: 5, quote: t("quote1") },
    { name: "Michael R.", country: t("countryDe"), rating: 5, quote: t("quote2") },
    { name: "Lotte V.", country: t("countryNl"), rating: 4, quote: t("quote3") },
    { name: "Piotr S.", country: t("countryPl"), rating: 5, quote: t("quote4") },
    { name: "Sophie B.", country: t("countryDe"), rating: 4, quote: t("quote5") },
  ];

  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("heading")}</Heading>
          <Text tone="muted">{t("subheading")}</Text>
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
