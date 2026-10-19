// Cena w euro, bez groszy, w układzie zależnym od języka (spec 0073 AC-6).
export function formatPriceEur(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
