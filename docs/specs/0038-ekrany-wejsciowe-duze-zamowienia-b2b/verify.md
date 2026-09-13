# Verify: ekrany wejściowe dla dużych zamówień B2B · spec 0038 · updated 2026-09-13
_Steps derived from spec 0038 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Wejdź na `/pl` → sekcja "Projekty inwestycyjne i produkcja seryjna" widoczna zaraz po Hero, z odznaką "NOWOŚĆ B2B", podtytułem i dwoma kaflami z tłem fotograficznym (inwestor/producent), każdy z nagłówkiem, trzema punktami z ikoną i podpisem w rogu → AC-1
- [ ] Kliknij CTA "Zgłoś projekt" na kaflu inwestora → przechodzi na `/pl/project-request` (oraz `/en/project-request`, `/nl/project-request`) → AC-2
- [ ] Kliknij CTA "Dołącz jako producent B2B" na kaflu producenta → przechodzi na istniejącą stronę `/pl/producer/registration`, żaden nowy ekran nie powstał → AC-3
- [ ] Na `/project-request` formularz renderuje wszystkie pola `project_request` (kraj, typ przedsięwzięcia, rodziny produktu, liczba sztuk min/maks, zakres powierzchni, standard wykończenia, okna startu i dostawy, dane kontaktowe) w trzech podpisanych sekcjach: "O projekcie", "Szczegóły", "Dane kontaktowe" → AC-4
- [ ] Wypełnij tylko kraj, typ przedsięwzięcia, jedną rodzinę produktu, minimalną liczbę sztuk (≥10), imię i nazwisko, e-mail → przycisk wysyłania włącza się; każde inne pole zostaje puste bez blokady wysyłki → AC-5
- [ ] Wyślij formularz z tylko wymaganymi polami → wywołuje wprost `submitProjectRequest` (`lib/project-request-actions.ts`), bez nowego endpointu → formularz zostaje zastąpiony kartą potwierdzenia informującą, że dopasowani, zweryfikowani producenci zostali powiadomieni, a odpowiedzi (wyceny) przyjdą e-mailem → AC-6
- [ ] Tuż nad przyciskiem wysyłania widnieje zdanie informujące, że dane kontaktowe zostaną udostępnione dopasowanym, zweryfikowanym producentom → AC-7
- [ ] Wyślij czwarte nierozstrzygnięte zapytanie z tego samego e-maila → formularz pokazuje istniejący komunikat limitu (`BULK_REQUEST_EMAIL_LIMIT_ERROR`) jako błąd w obrębie formularza, wpisane dane zostają zachowane → AC-8
- [ ] Kliknij przycisk wysyłania dwa razy szybko → przycisk wyłącza się po pierwszym kliknięciu (`isPending`), powstaje dokładnie jeden wiersz `project_request` → AC-9
- [ ] Sprawdź źródło strony `/project-request` (`pl`/`en`/`nl`) → tytuł, opis, adres kanoniczny i tagi `hreflang` dla wszystkich trzech języków obecne → AC-10
- [ ] Przełącz język na `en` i `nl` → treść nowej sekcji strony głównej i formularza jest prawdziwym tłumaczeniem (nie kopią polskiego tekstu) → AC-11
- [ ] Na obu nowych ekranach: dokładnie jeden prawdziwy `<h1>` na `/project-request`, logiczna kolejność fokusu (Tab przez formularz), stan błędu/potwierdzenia komunikowany ikoną plus tekstem, nie samym kolorem → AC-12

## Commands

- [ ] `npm run test -- components/klient/BulkOrdersShowcase.test.tsx components/klient/ProjectRequestFlow.test.tsx` → wszystkie testy przechodzą → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- [ ] `npm run build` → `/[locale]/project-request` widoczny w tabeli tras, kompilacja bez błędów → AC-10

## Acceptance-criteria coverage

- AC-1 … sekcja strony głównej z dwoma kaflami · covered by UI step 1
- AC-2 … CTA inwestora → `/project-request` · covered by UI step 2
- AC-3 … CTA producenta → rejestracja producenta · covered by UI step 3
- AC-4 … wszystkie pola w trzech sekcjach · covered by UI step 4
- AC-5 … tylko sześć pól wymaganych · covered by UI step 5
- AC-6 … wywołanie `submitProjectRequest` + karta potwierdzenia · covered by UI step 6
- AC-7 … zdanie RODO nad przyciskiem · covered by UI step 7
- AC-8 … błąd limitu zgłoszeń w obrębie formularza · covered by UI step 8
- AC-9 … przycisk wyłączony w trakcie żądania · covered by UI step 9
- AC-10 … metadane SEO i hreflang · covered by UI step 10, Commands step 2
- AC-11 … prawdziwe tłumaczenia pl/en/nl · covered by UI step 11
- AC-12 … WCAG 2.2 AA (jeden h1, fokus, ikona+tekst) · covered by UI step 12

## Update (aktualizacja spec 0038, zadania 10–19) · updated 2026-09-13

### UI / manual

- [ ] Na `/pl` kliknij CTA "Przeglądaj" na kaflu inwestora → przechodzi na `/pl/verified-manufacturers` (oraz `/en/verified-manufacturers`, `/nl/verified-manufacturers`) → AC-2
- [ ] Wejdź na `/pl/verified-manufacturers` → widoczna sekcja Budman House pod odznaką "Zweryfikowany producent wolumenowy" z miesięczną zdolnością, certyfikatem i krajami dostawy (PL, DE, NL); siatka kart jego opublikowanych projektów → AC-13
- [ ] Kliknij kartę projektu na `/verified-manufacturers` → przechodzi na jego istniejącą stronę `/project/[id]` → AC-13
- [ ] Na `/verified-manufacturers` widoczny jeden, wspólny duży przycisk "Zgłoś zapytanie" prowadzący do `/project-request`, widoczny niezależnie od tego, czy lista producentów jest pusta czy nie → AC-14
- [ ] Sprawdź źródło strony `/verified-manufacturers` (`pl`/`en`/`nl`) → tytuł, opis, adres kanoniczny i tagi `hreflang` dla wszystkich trzech języków obecne → AC-18
- [ ] Na `/project/[id]` dowolnego opublikowanego produktu Budman House → widoczny blok "Potrzebujesz większej ilości?" z przyciskiem "Zapytaj o większą ilość"; na stronie produktu producenta bez zatwierdzonego profilu zdolności blok się nie renderuje → AC-15
- [ ] Kliknij "Zapytaj o większą ilość" → otwiera się modal (Headless UI Dialog) z polami: imię i nazwisko, e-mail, telefon (opcjonalnie), minimalna/maksymalna liczba sztuk, kraj dostawy, notatka (opcjonalnie); przycisk wysyłania wyłączony do czasu wypełnienia pól wymaganych → AC-15
- [ ] Wyślij modal z tylko wymaganymi polami → wywołuje wprost `submitBulkProductInquiry`, pokazuje stan potwierdzenia bez opuszczenia `/project/[id]` → AC-15, AC-16
- [ ] Wyślij czwarte nierozstrzygnięte zapytanie (przez modal lub `/project-request`, na ten sam e-mail) → modal pokazuje istniejący komunikat limitu (`BULK_REQUEST_EMAIL_LIMIT_ERROR`) w obrębie modala, bez zamykania go → AC-16
- [ ] Otwórz `/project/[id]` dowolnego realnego, opublikowanego produktu → sekcja producenta renderuje się poprawnie (bez `NaN`/crasha z `StarRating`) nawet gdy producent ma `rating = null` w bazie → AC-17 (regresja)
- [ ] Przełącz język na `en`/`nl` na `/verified-manufacturers` i w modalu → treść jest prawdziwym tłumaczeniem, nie kopią polskiego tekstu → AC-11 (rozszerzone)
- [ ] Na `/verified-manufacturers` i w modalu: dokładnie jeden prawdziwy `<h1>` na `/verified-manufacturers` (nagłówek modala to `<h2>`/`DialogTitle`, nie drugi `<h1>`), pułapka fokusu w modalu (Tab nie wychodzi poza dialog), stan błędu komunikowany ikoną plus tekstem → AC-12 (rozszerzone)

### Commands

- [ ] `npm run test -- lib/data/producers.test.ts lib/data/projects.test.ts lib/project-request-actions.test.ts components/klient/BulkOrdersShowcase.test.tsx components/klient/BulkProductInquiryModal.test.tsx` → wszystkie testy przechodzą → AC-2, AC-13, AC-14, AC-15, AC-16, AC-17
- [ ] `npm run build` → `/[locale]/verified-manufacturers` widoczny w tabeli tras, kompilacja bez błędów → AC-18

### Acceptance-criteria coverage (aktualizacja)

- AC-2 (zmienione) … kafel inwestora → `/verified-manufacturers` · covered by UI step 1
- AC-13 … siatka projektów zweryfikowanych wolumenowo producentów · covered by UI steps 2–3
- AC-14 … jeden wspólny przycisk, nigdy ślepa uliczka · covered by UI step 4
- AC-15 … blok i modal "Zapytaj o większą ilość" · covered by UI steps 6–8
- AC-16 … wzorzec błędu/wysyłki modala · covered by UI steps 8–9
- AC-17 … `getProducerById`/`getProducers` na realnej bazie, bez crasha na `rating = null` · covered by UI step 10, Commands step 1
- AC-18 … metadane SEO i hreflang `/verified-manufacturers` · covered by UI step 5, Commands step 2
