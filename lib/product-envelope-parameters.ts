import { z } from "zod";

// Spec 0075 AC-1, AC-2: parametry izolacji przegród produktu. Wartości enumów
// są te same co w lib/db/schema.ts (envelopeElementEnum i pozostałe).
export const ENVELOPE_ELEMENTS = ["wall", "roof", "floor_ground", "floor_air", "window", "glazing", "door"] as const;
export const ENVELOPE_QUANTITIES = ["u_value", "rc_value"] as const;
export const ENVELOPE_METHODS = ["calculation", "lab_test", "manufacturer_declaration"] as const;
export const FOUNDATION_STATUSES = ["permanent", "temporary"] as const;

export type EnvelopeElement = (typeof ENVELOPE_ELEMENTS)[number];
export type EnvelopeQuantity = (typeof ENVELOPE_QUANTITIES)[number];
export type EnvelopeMethod = (typeof ENVELOPE_METHODS)[number];
export type FoundationStatus = (typeof FOUNDATION_STATUSES)[number];

// Okno, szyba i drzwi mają tylko U (Uw, Ug, Ud); Rc dotyczy przegród pełnych.
export const ELEMENTS_WITH_U_ONLY: readonly EnvelopeElement[] = ["window", "glazing", "door"];

export const U_VALUE_RANGE = { min: 0.05, max: 6 } as const;
export const RC_VALUE_RANGE = { min: 0.1, max: 20 } as const;
export const METHOD_NOTE_MAX_LENGTH = 300;

export const ENVELOPE_UNIT: Record<EnvelopeQuantity, string> = {
  u_value: "W/m²K",
  rc_value: "m²K/W",
};

export function isQuantityAllowedForElement(element: EnvelopeElement, quantity: EnvelopeQuantity): boolean {
  return quantity === "u_value" || !ELEMENTS_WITH_U_ONLY.includes(element);
}

export function isValueInRange(quantity: EnvelopeQuantity, value: number): boolean {
  const range = quantity === "u_value" ? U_VALUE_RANGE : RC_VALUE_RANGE;
  return value >= range.min && value <= range.max;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Wartości wpisane po polsku przecinkiem ("0,22") zamieniamy na liczbę, żeby
// formularz producenta nie odrzucał naturalnego zapisu.
const valueField = z.preprocess(
  (raw) => (typeof raw === "string" ? Number(raw.trim().replace(",", ".")) : raw),
  z.number().finite(),
);

export const productEnvelopeParameterInputSchema = z
  .object({
    element: z.enum(ENVELOPE_ELEMENTS),
    quantity: z.enum(ENVELOPE_QUANTITIES),
    value: valueField,
    method: z.enum(ENVELOPE_METHODS),
    methodNote: z
      .string()
      .trim()
      .max(METHOD_NOTE_MAX_LENGTH, "Notatka może mieć najwyżej 300 znaków.")
      .nullish()
      .transform((note) => (note ? note : null)),
    asOfDate: z
      .string()
      .regex(ISO_DATE, "Podaj datę w formacie RRRR-MM-DD.")
      .refine((date) => !Number.isNaN(Date.parse(`${date}T00:00:00Z`)), "Podaj poprawną datę."),
  })
  .superRefine((input, ctx) => {
    if (!isQuantityAllowedForElement(input.element, input.quantity)) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Dla okna, szyby i drzwi podaj wartość U." });
      return;
    }
    if (!isValueInRange(input.quantity, input.value)) {
      const range = input.quantity === "u_value" ? U_VALUE_RANGE : RC_VALUE_RANGE;
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `Wartość ${input.quantity === "u_value" ? "U" : "Rc"} musi mieścić się między ${range.min} a ${range.max}.`,
      });
    }
  });

export type ProductEnvelopeParameterInput = z.input<typeof productEnvelopeParameterInputSchema>;
export type ParsedProductEnvelopeParameter = z.output<typeof productEnvelopeParameterInputSchema>;

// Spec 0075 AC-4: tylko dom i kontener mieszkalny dostają parametry przegród
// i status posadowienia. Jedyne miejsce kontroli po stronie aplikacji (baza
// pilnuje tego dla foundation_status, ale nie dla wierszy tabeli parametrów).
export function supportsEnvelopeParameters(product: {
  family: string;
  containerSubcategory?: string | null;
}): boolean {
  return (
    product.family === "dom" ||
    (product.family === "kontenery-modulowe" && product.containerSubcategory === "mieszkalne")
  );
}

// Spec 0075 AC-8: kraje, dla których administrator wpisuje ocenę zgodności.
// Globalny CountryCode (lib/data/types.ts) zostaje PL, DE, NL: BE, IT i FR
// nie są krajami dostawy.
export const COMPLIANCE_COUNTRY_CODES = ["PL", "DE", "NL", "BE", "IT", "FR"] as const;
// Kraje obecne w słowniku tylko dla ocen zgodności, nie jako kraje dostawy.
export const COMPLIANCE_ONLY_COUNTRY_CODES = ["BE", "IT", "FR"] as const;
export type ComplianceCountryCode = (typeof COMPLIANCE_COUNTRY_CODES)[number];

// Przepisy do wyboru na kraj; `rule` w bazie zostaje wolnym tekstem, więc
// dotychczasowe wartości (np. "bbl") działają dalej, a "inny" to wolny tekst.
export const COMPLIANCE_RULES_BY_COUNTRY: Record<ComplianceCountryCode, readonly { value: string; label: string }[]> = {
  PL: [{ value: "wt-2021", label: "Warunki techniczne (WT 2021)" }],
  DE: [{ value: "geg", label: "GEG (Gebäudeenergiegesetz)" }],
  NL: [
    { value: "bbl", label: "Bbl (Besluit bouwwerken leefomgeving)" },
    { value: "bng", label: "BENG" },
  ],
  BE: [{ value: "epb", label: "EPB (przepisy regionalne)" }],
  IT: [{ value: "dm-2015", label: "DM 26.06.2015 (wymagania minimalne)" }],
  FR: [{ value: "re2020", label: "RE2020" }],
};

export const COMPLIANCE_RULE_OTHER = "__other";

// Spec 0075 AC-11, AC-13: przełącznik sekcji "Izolacja przegród" na stronie produktu
// i wierszy w porównaniu (wzorzec HOME_SECTIONS ze spec 0073). Zostaje false do czasu
// merytorycznej weryfikacji tekstów wyjaśnień (spec 0075 Follow-up).
export const ENVELOPE_SECTION_ENABLED = false;

// Spec 0075 AC-14: granice notki o progu 50 m². To zapas na różnicę między
// powierzchnią netto a obrysem, nie wartość prawna.
export const FLOOR_AREA_NOTE_MIN_M2 = 40;
export const FLOOR_AREA_NOTE_MAX_M2 = 60;

// Symbol wielkości: okno, szyba i drzwi mają własne (Uw, Ug, Ud), reszta U albo Rc.
export function envelopeSymbol(element: EnvelopeElement, quantity: EnvelopeQuantity): "U" | "Rc" | "Uw" | "Ug" | "Ud" {
  if (quantity === "rc_value") return "Rc";
  if (element === "window") return "Uw";
  if (element === "glazing") return "Ug";
  if (element === "door") return "Ud";
  return "U";
}
