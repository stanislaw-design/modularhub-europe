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
    <section id="faq" className="scroll-mt-brand-6 py-brand-6">
      <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-12 lg:gap-brand-5">
        <div className="flex flex-col gap-2 lg:sticky lg:top-brand-6 lg:col-span-4 lg:self-start">
          <Heading level="h2">{t("heading")}</Heading>
          <Text tone="muted" className="max-w-[36ch]">
            {t("subheading")}
          </Text>
        </div>
        <Accordion items={faqItems} variant="ruled" className="lg:col-span-8" />
      </div>
    </section>
  );
}
