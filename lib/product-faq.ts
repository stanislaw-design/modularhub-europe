import { z } from "zod";

// FAQ produktu (product.faq, spec 0041 Context/spec 0042 Feature design).
// Walidacja Zod na granicy aplikacji byla otwartym Follow-up, domknieta tu
// (spec 0045 AC-6). Ten sam wzorzec stabilnego `id` co roomLayout
// (lib/product-room-layout.ts, AC-5), zeby reorder/usuniecie nigdy nie
// gubily dopasowania z tlumaczeniem (product_translation.faq, AC-10).
export const faqRowSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
  })
  .strict();
export type FaqRow = z.infer<typeof faqRowSchema>;

export const faqSchema = z.array(faqRowSchema);
export type Faq = z.infer<typeof faqSchema>;

// Tlumaczenie EN/NL (product_translation.faq, AC-10): dopasowane po `id` z
// faqSchema powyzej, moze byc krotsze niz polska wersja (tlumaczenie
// czesciowe); brakujacy wpis renderuje sie jako polski tekst (AC-10),
// rozwiazywane po stronie odczytu, nie tutaj.
export const faqTranslationRowSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
  })
  .strict();
export type FaqTranslationRow = z.infer<typeof faqTranslationRowSchema>;

export const faqTranslationSchema = z.array(faqTranslationRowSchema);
export type FaqTranslation = z.infer<typeof faqTranslationSchema>;
