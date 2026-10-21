import { z } from "zod";
import { PRODUCER_TECHNOLOGIES } from "@/lib/producer-technologies";

// Spec 0074 AC-11, AC-15: walidacja zmiany danych firmy po stronie serwera. Edytowalne są
// tylko nazwa i technologia; NIP, kraj i status weryfikacji nie przechodzą przez ten schemat.
const TECHNOLOGY_VALUES = PRODUCER_TECHNOLOGIES.map((technology) => technology.value) as [
  (typeof PRODUCER_TECHNOLOGIES)[number]["value"],
  ...(typeof PRODUCER_TECHNOLOGIES)[number]["value"][],
];

export const producerCompanyInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nazwa firmy musi mieć co najmniej 2 znaki.")
    .max(120, "Nazwa firmy może mieć najwyżej 120 znaków."),
  technology: z.enum(TECHNOLOGY_VALUES, { message: "Wybierz technologię z listy." }),
});

// Wejście akcji to dane z przeglądarki, więc technologia bywa pusta albo spoza listy: schemat to odrzuca.
export type ProducerCompanyFormInput = { name: string; technology: string | null };
