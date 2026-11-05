# 0081. Weryfikacja

**Data**: 2026-11-05

Ten plik zapisuje, co faktycznie sprawdzono przy budowie i promocji na produkcję. Nie jest pełnym przebiegiem `/check verify` po każdym kryterium akceptacji.

## Sprawdzone

- [x] Katalog na dev: 17 produktów z cenami z oferty, grupy opcji według klas rozmiaru, 85 przypisań stylistyk i 120 materiałów (zapytania SQL do bazy dev).
- [x] Testy jednostkowe i komponentowe: reguły opcji (`scripts/data/letniskowo-options.test.ts`, 24), migawka konfiguracji (6), sekcje stylistyk i treści producenta (9), przycisk „Pokaż więcej opcji” (4). Pełny `vitest` przechodzi poza jednym testem `setDefaultVariant`, który pod pełnym biegiem gubi się na wspólnej bazie dev i osobno przechodzi.
- [x] E2E `e2e/letniskowo-0081.spec.ts` (3 testy): wybór stylistyki i opcji trafia do linku zapytania (AC-8, AC-12), próbniki nie idą przez `/_next/image` (AC-9), nieznana stylistyka jest ignorowana, produkt innego producenta nie ma nowych sekcji (AC-10).
- [x] `tsc --noEmit`, `eslint` i `npm run check:translations` (zero braków en, de, nl).
- [x] Migracja 0070 sprawdzona na tymczasowej gałęzi Neon przed zastosowaniem na dev (AC-14).
- [x] Produkcja, z zewnątrz na `www.modularhubeurope.pl`: strony Bali, Malta, Nicea i Vario 2BR zwracają 200; Bali ma sekcje „Pokaż więcej opcji”, „Zastosowania komercyjne”, „Sposób współpracy” i stylistykę (pl i en); 34 adresy zdjęć ze strony Bali działają; modele są na liście wyników i w sitemapie we wszystkich czterech językach.

## Niesprawdzone

- [ ] Wysłanie zapytania z konfiguracją na produkcji (nie tworzono tam spraw ani maili).
- [ ] Zawartość bazy produkcyjnej bezpośrednio (połączenie Neon w sesji obejmowało tylko dev); ocena po stronach.
- [ ] Widok migawki po stronie producenta (brak ekranu, patrz Follow-up).
