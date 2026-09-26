import { Download, FileText, HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Accordion, Heading, Text, type AccordionItem } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface ProjectDocumentsAndFaqProps {
  faq?: Project["faq"];
  documents?: Project["documents"];
}

// `Project.documents` niesie zdjęcia/rzuty (spec 0041 AC-9) i, od spec 0049
// AC-9, co najwyżej jeden plik PDF specyfikacji (purpose
// 'product_specification'). Pytania i odpowiedzi (`Project.faq`, jsonb bez
// własnej tabeli, ten sam wzorzec co roomLayout) są opcjonalne per produkt.
// Każdy z dwóch bloków (specyfikacja, FAQ) renderuje się niezależnie tylko
// gdy ma prawdziwą treść; cała sekcja znika, gdy oba są puste (spec 0054
// AC-7, AC-8).
export async function ProjectDocumentsAndFaq({ faq, documents }: ProjectDocumentsAndFaqProps) {
  const t = await getTranslations("ProjectDocumentsAndFaq");
  const faqItems: AccordionItem[] | undefined = faq?.map((item, index) => ({
    id: `faq-${index}`,
    question: item.question,
    answer: item.answer,
  }));
  const hasFaq = Boolean(faqItems && faqItems.length > 0);
  const specification = documents?.find((doc) => doc.purpose === "product_specification");

  if (!specification && !hasFaq) return null;

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>

      {specification && (
        <div className="flex flex-col gap-brand-2 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4">
          <div className="flex items-center gap-brand-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
              <FileText className="size-5 text-brand-v5-amber-strong" aria-hidden="true" />
            </span>
            <Heading level="h3" surface="v5" className="text-body-l">
              {t("documentsHeading")}
            </Heading>
          </div>
          <a
            href={specification.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-brand-2 rounded-data border-2 border-brand-v5-ink px-brand-3 py-brand-2 font-semibold transition-colors hover:bg-brand-v5-night hover:text-brand-v5-paper"
          >
            <Download className="size-4 shrink-0" aria-hidden="true" />
            <Text as="span" surface="v5" className="font-semibold">
              {t("downloadSpecificationLabel")}
            </Text>
          </a>
        </div>
      )}

      {hasFaq && (
        <div className="flex flex-col gap-brand-3">
          <div className="flex items-center gap-brand-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
              <HelpCircle className="size-5 text-brand-v5-amber-strong" aria-hidden="true" />
            </span>
            <Heading level="h3" surface="v5" className="text-body-l">
              {t("questionsHeading")}
            </Heading>
          </div>
          <Accordion items={faqItems!} />
        </div>
      )}
    </div>
  );
}
