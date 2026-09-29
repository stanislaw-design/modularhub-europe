// Wspólny kontrakt treści dla TransactionalEmail (HTML) i
// renderTransactionalEmailText (plain text): oba renderują dokładnie te same
// dane, żeby wersja tekstowa nigdy nie rozjechała się z HTML-em.
export interface TransactionalEmailProps {
  preview: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  // Plakietka etapu pod nagłówkiem (dziś tylko OrderStatusChangedEmail), np. "Montaż".
  badge?: string;
  // Krótki, czytelny numer referencyjny w stopce (id encji, nie pełny UUID), np. "A1B2C3D4".
  reference?: string;
}
