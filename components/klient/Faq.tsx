import { getTranslations } from "next-intl/server";
import { Accordion, Heading, Text, type AccordionItem } from "@/components/ui";

// Built on the shared Accordion (Disclosure-based, spec 0015 AC-12): first
// real use of that component in the project.
export async function Faq() {
  const t = await getTranslations("Faq");
  const faqItems: AccordionItem[] = [
    { id: "faq-jak-dziala", question: t("howQuestion"), answer: t("howAnswer") },
    { id: "faq-koszt", question: t("costQuestion"), answer: t("costAnswer") },
    { id: "faq-ceny", question: t("priceQuestion"), answer: t("priceAnswer") },
    { id: "faq-zgodnosc", question: t("complianceQuestion"), answer: t("complianceAnswer") },
    { id: "faq-producenci", question: t("producersQuestion"), answer: t("producersAnswer") },
    { id: "faq-czas", question: t("timeQuestion"), answer: t("timeAnswer") },
  ];

  return (
    <section className="py-brand-5">
      <div className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("heading")}</Heading>
          <Text tone="muted">{t("subheading")}</Text>
        </div>
        <Accordion items={faqItems} className="max-w-[75ch]" />
      </div>
    </section>
  );
}
