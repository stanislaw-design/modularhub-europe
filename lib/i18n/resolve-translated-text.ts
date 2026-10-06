// Wspólny fallback tłumaczeń (spec 0028 AC-6, spec 0067 AC-6): puste pole,
// same spacje albo brak wiersza dają polski tekst źródłowy, nigdy pustkę.
export function resolveTranslatedText(base: string | null, translated: string | null | undefined): string {
  return translated && translated.trim().length > 0 ? translated : (base ?? "");
}

// Wariant dla słownika po polskim tekście (reference_text_translation).
export function resolveReferenceText(source: string, translated: string | null | undefined): string {
  return resolveTranslatedText(source, translated);
}
