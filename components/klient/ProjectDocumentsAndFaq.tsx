import { FileText, HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Accordion, Heading, StatusPill, Text, type AccordionItem } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface ProjectDocumentsAndFaqProps {
  faq?: Project["faq"];
}

// Sekcja renderuje się zawsze, mimo że dziś żadna z dwóch połówek nie ma
// jeszcze pewnego źródła danych: `Project.documents` niesie wyłącznie
// zdjęcia/rzuty (spec 0041 AC-9), nie dokumenty do pobrania (karta
// katalogowa, gwarancja) — ta połowa zawsze pokazuje placeholder. Pytania i
// odpowiedzi (`Project.faq`, jsonb bez własnej tabeli, ten sam wzorzec co
// roomLayout) są opcjonalne per produkt: wypełnione renderują się przez
// współdzielony Accordion (jak na stronie głównej, `Faq.tsx`), puste albo
// brak pokazuje ten sam placeholder co dokumenty. Świadomy wyjątek od reguły
// "brak danych, brak sekcji" (spec 0042 AC-12 zakładał tę sekcję w kolejności
// stron, nigdy jej nie zbudował), ten sam wzorzec placeholderu co
// ProjectLogistics.
export async function ProjectDocumentsAndFaq({ faq }: ProjectDocumentsAndFaqProps) {
  const t = await getTranslations("ProjectDocumentsAndFaq");
  const faqItems: AccordionItem[] | undefined = faq?.map((item, index) => ({
    id: `faq-${index}`,
    question: item.question,
    answer: item.answer,
  }));

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>

      <div className="flex flex-col gap-brand-2 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4">
        <div className="flex items-center gap-brand-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
            <FileText className="size-5 text-brand-v5-amber-strong" aria-hidden="true" />
          </span>
          <Heading level="h3" surface="v5" className="text-body-l">
            {t("documentsHeading")}
          </Heading>
        </div>
        <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
        <Text tone="muted" surface="v5" className="text-data">
          {t("documentsPlaceholder")}
        </Text>
      </div>

      <div className="flex flex-col gap-brand-3">
        <div className="flex items-center gap-brand-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
            <HelpCircle className="size-5 text-brand-v5-amber-strong" aria-hidden="true" />
          </span>
          <Heading level="h3" surface="v5" className="text-body-l">
            {t("questionsHeading")}
          </Heading>
        </div>
        {faqItems && faqItems.length > 0 ? (
          <Accordion items={faqItems} />
        ) : (
          <div className="flex flex-col gap-brand-2 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4">
            <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
            <Text tone="muted" surface="v5" className="text-data">
              {t("questionsPlaceholder")}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
