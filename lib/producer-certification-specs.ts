import { z } from "zod";

// Spec 0065 AC-1, AC-9: walidacja certyfikatu firmy na granicy aplikacji
// (kolumna producer_certification w lib/db/schema.ts, CHECK w bazie pilnuje
// tylko spójności potwierdzenia, nie treści nazwy).
export const producerCertificationInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  issuer: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ProducerCertificationFormInput = z.input<typeof producerCertificationInputSchema>;
