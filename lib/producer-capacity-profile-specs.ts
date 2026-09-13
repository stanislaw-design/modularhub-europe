import { z } from "zod";

// Pola jsonb na producer_capacity_profile (spec 0037 AC-6), ten sam wzorzec
// walidacji na granicy aplikacji co lib/product-technical-specs.ts (spec
// 0022): kolumna Postgres zostaje zwykłym jsonb, kształt narzuca Zod tutaj.

export const leadTimeTierSchema = z.object({
  units: z.number().int().positive(),
  weeks: z.number().int().positive(),
});
export const leadTimeTiersSchema = z.array(leadTimeTierSchema);
export type LeadTimeTier = z.infer<typeof leadTimeTierSchema>;

// Powielone ręcznie z lib/db/schema.ts (completionStandardEnum), ten sam
// wzorzec co PRODUCT_FAMILIES w lib/product-technical-specs.ts: enum Postgres
// i ta lista muszą być zmieniane razem.
export const COMPLETION_STANDARDS = ["surowy-zamkniety", "deweloperski", "pod-klucz"] as const;
export const completionStandardsSupportedSchema = z.array(z.enum(COMPLETION_STANDARDS));

export const certificationsSchema = z.array(z.string().trim().min(1));
export const pastProjectReferencesSchema = z.array(z.string().trim().min(1));
