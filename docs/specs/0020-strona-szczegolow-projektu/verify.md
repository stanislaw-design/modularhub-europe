# Verify: strona szczegółów projektu (klient) · spec 0020 · updated 2026-08-29

_Steps derived from spec 0020 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
_Ran by `/check verify` on 2026-08-29: all steps below exercised against a live dev server, PASS. See conversation for the evidence ledger._

## UI / manual

- [x] Odwiedź `/pl/klient/projekt/prj-modulor-family-90` → sekcje renderują się w kolejności: hero (galeria + nazwa + cena + CTA) → kluczowe dane skrótowo → opis → technologia/konstrukcja (+ certyfikaty) → warunki komercyjne → producent → CTA końcowe → AC-1
- [x] Na `/pl/klient/wyniki` kliknij kartę projektu z katalogu przykładowego (np. Modulor Family 90) → nawiguje do `/pl/klient/projekt/prj-modulor-family-90` → AC-2
- [x] Na `/pl/klient` w sekcji „Popularne domy” kliknij kartę → nawiguje do `/pl/klient/projekt/[id]` tego projektu → AC-2
- [x] Na stronie projektu widoczne są trzy akcje: „Wyślij zapytanie” (→ `/pl/klient/zapytanie?projects=[id]`), „Dodaj do shortlisty” (→ `/pl/klient/wyniki?projects=[id]`), „Sprawdź działkę pod ten projekt” (→ `/pl/klient/dzialka?projects=[id]`) → AC-3
- [x] Odwiedź `/pl/klient/projekt/prj-modulor-compact-56` (brak certifications/galleryImageUrls/simplifiedPermitEligible w danych) → sekcje „Certyfikaty” i dodatkowa galeria nie renderują się, bez pustego placeholdera → AC-4
- [x] Odwiedź `/pl/klient/projekt/prj-baltyk-loft-120` (`priceOnRequest: true`) → nigdzie na stronie (hero, warunki komercyjne) nie pojawia się zakres ceny, tylko „Wycena indywidualna” + CTA zapytania; to samo sprawdź na karcie tego projektu na `/wyniki` i „Popularne domy” → AC-5
- [x] Odwiedź `/pl/klient/projekt/nieistniejace-id` → standardowa strona 404 Next.js → AC-6
- [x] Odwiedź `/pl/klient/projekt/prj-modulor-family-90?country=DE` → panel zgodności prawnej widoczny (status „conditional”, uzasadnienie z `EligibilityByCountry`) → AC-7
- [x] Odwiedź `/pl/klient/projekt/prj-modulor-family-90` bez `?country=` → panel zgodności prawnej nieobecny → AC-7
- [x] Na `/pl/klient/wyniki`, dodaj lokalny produkt producenta (spec 0016 kreator) i odśwież wyniki → karta dodanego produktu (`local-...`) pozostaje nieklikalna, bez linku do strony projektu → AC-8
- [x] Porównaj metadata (tytuł karty przeglądarki, `<meta name="description">`, `og:image`, `<link rel="canonical">`) dla dwóch różnych projektów → różne wartości; sprawdź obecność `<script type="application/ld+json">` z danymi Product (nazwa, cena lub jej brak przy priceOnRequest, producent) → AC-9

## Commands

- [x] `npx tsc --noEmit -p tsconfig.json` → zero błędów
- [x] `npm run lint` → zero błędów
- [x] `npx vitest run` → cały pakiet zielony (378/378, 53 pliki), w tym zaktualizowane `ResultCard.test.tsx`
- [x] `npm run build` → `/[locale]/klient/projekt/[id]` kompiluje się jako trasa dynamiczna (ƒ)

## Acceptance-criteria coverage

- AC-1 kolejność sekcji · krok 1 (UI/manual) ✅
- AC-2 karty linkują do strony projektu · kroki 2-3 (UI/manual) ✅
- AC-3 trzy akcje na stronie · krok 4 (UI/manual) ✅
- AC-4 brak sekcji bez danych, bez placeholdera · krok 5 (UI/manual) ✅
- AC-5 priceOnRequest ukrywa cenę wszędzie · krok 6 (UI/manual) ✅
- AC-6 nieistniejące id → 404 · krok 7 (UI/manual) ✅
- AC-7 panel zgodności prawnej tylko z `?country=` i wierszem `EligibilityByCountry` · kroki 8-9 (UI/manual) ✅
- AC-8 `local-` id nieklikalne · krok 10 (UI/manual) ✅
- AC-9 metadata/OG/canonical/JSON-LD per projekt · krok 11 (UI/manual) ✅
