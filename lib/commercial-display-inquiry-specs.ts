import { z } from "zod";
import { MARKET_COUNTRY_CODES } from "@/lib/countries";
import { routing } from "@/lib/i18n/routing";

// Formularz zapytania o ekrany komercyjne na /commercial-displays (spec 0083). Jedna lista wartości
// i jeden schemat dla formularza (klient) i akcji (serwer), bez importu bazy, żeby dało się go
// użyć w komponencie klienckim. Wartości są kluczami, nie tekstem: etykiety idą z tłumaczeń.
export const COMMERCIAL_USE_CASES = ["hotel", "restaurant", "pool-spa", "residential", "retail", "other"] as const;
export type CommercialUseCase = (typeof COMMERCIAL_USE_CASES)[number];

export const COMMERCIAL_INTERESTS = ["displays", "signage", "led-wall", "unsure"] as const;
export type CommercialInterest = (typeof COMMERCIAL_INTERESTS)[number];

export const COMMERCIAL_INQUIRY_STATUSES = ["new", "contacted", "closed"] as const;

export const COMMERCIAL_INQUIRY_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  companyMax: 160,
  phoneMax: 40,
  emailMax: 254,
  messageMin: 10,
  messageMax: 2000,
  screenCountMax: 500,
  // Ochrona przed zalewem: tyle zgłoszeń z jednego adresu e-mail w ciągu doby (spec 0083 AC-6).
  perEmailPerDay: 3,
} as const;

// Kod błędu limitu, żeby formularz pokazał tłumaczony tekst zamiast polskiego komunikatu z akcji.
export const COMMERCIAL_INQUIRY_RATE_LIMIT_ERROR = "rate_limit";

export function normalizeCommercialEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Puste pola opcjonalne (z formularza przychodzą jako "") traktujemy jak brak wartości.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const commercialDisplayInquirySchema = z.object({
  name: z.string().trim().min(COMMERCIAL_INQUIRY_LIMITS.nameMin).max(COMMERCIAL_INQUIRY_LIMITS.nameMax),
  company: optionalText(COMMERCIAL_INQUIRY_LIMITS.companyMax),
  email: z
    .string()
    .trim()
    .max(COMMERCIAL_INQUIRY_LIMITS.emailMax)
    .pipe(z.email())
    .transform(normalizeCommercialEmail),
  phone: optionalText(COMMERCIAL_INQUIRY_LIMITS.phoneMax),
  countryCode: z.enum(MARKET_COUNTRY_CODES),
  useCase: z.enum(COMMERCIAL_USE_CASES),
  interests: z.array(z.enum(COMMERCIAL_INTERESTS)).min(1).max(COMMERCIAL_INTERESTS.length),
  screenCount: z.number().int().min(1).max(COMMERCIAL_INQUIRY_LIMITS.screenCountMax).optional(),
  message: z.string().trim().min(COMMERCIAL_INQUIRY_LIMITS.messageMin).max(COMMERCIAL_INQUIRY_LIMITS.messageMax),
  locale: z.enum(routing.locales),
  // Pole-pułapka na boty: człowiek go nie widzi i nie wypełnia (spec 0083 AC-5).
  website: z.string().optional(),
});

export type CommercialDisplayInquiryInput = z.input<typeof commercialDisplayInquirySchema>;
export type CommercialDisplayInquiryData = z.output<typeof commercialDisplayInquirySchema>;
