import { z } from "zod";

// Co musi zapewnić klient, niezależnie od wybranego standardu (spec 0050
// AC-23, product.client_requirements): katalog gotowych pozycji plus własne.
// Ten sam wzorzec stabilnego `id` co roomLayout/faq (lib/product-room-layout.ts,
// lib/product-faq.ts), żeby dopasowanie z tłumaczeniem (product_translation.client_requirements,
// AC-28, budowane w zadaniu 9) nigdy nie gubiło się przy reorderze/usunięciu.
export const CLIENT_REQUIREMENT_CATALOG_KEYS = [
  "fundament",
  "przygotowanie-dzialki",
  "dojazd-dla-transportu",
  "miejsce-dla-dzwigu",
  "przylacza",
  "formalnosci",
  "prace-poza-zakresem-producenta",
] as const;
export type ClientRequirementCatalogKey = (typeof CLIENT_REQUIREMENT_CATALOG_KEYS)[number];

// label jest zawsze obecny, także dla pozycji katalogowych (custom: false) —
// wypełniany kanoniczną polską etykietą przy zaznaczeniu (patrz
// CLIENT_REQUIREMENT_CATALOG_LABELS w lib/producer-project-draft.ts), nie
// wpisywany ręcznie. Dla tłumaczenia (product_translation.client_requirements,
// AC-28) tylko wpisy custom: true niosą własną etykietę — pozycje katalogowe
// tłumaczą się z katalogu opcji, nie z tej kolumny (spec 0050 Szkic modelu danych).
export const clientRequirementRowSchema = z
  .object({
    id: z.string().min(1),
    key: z.enum(CLIENT_REQUIREMENT_CATALOG_KEYS).nullable(),
    label: z.string().min(1),
    custom: z.boolean(),
  })
  .strict();
export type ClientRequirementRow = z.infer<typeof clientRequirementRowSchema>;

export const clientRequirementsSchema = z.array(clientRequirementRowSchema);
export type ClientRequirements = z.infer<typeof clientRequirementsSchema>;

// Tłumaczenie własnych pozycji (product_translation.client_requirements, AC-28,
// zadanie 9): dopasowane po `id` do wpisów custom: true z clientRequirementsSchema
// powyżej. Pozycje katalogowe (custom: false) nie mają tu odpowiednika —
// tłumaczą się z katalogu opcji przy odczycie, nie z tej tabeli.
export const clientRequirementTranslationRowSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();
export type ClientRequirementTranslationRow = z.infer<typeof clientRequirementTranslationRowSchema>;

export const clientRequirementTranslationSchema = z.array(clientRequirementTranslationRowSchema);
export type ClientRequirementTranslation = z.infer<typeof clientRequirementTranslationSchema>;
