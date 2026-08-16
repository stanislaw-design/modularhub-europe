# Verify: Zapytanie / shortlista (klient) · spec 0005 · updated 2026-08-14
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Na `/pl/klient/wyniki?country=PL` zaznacz checkbox na karcie wyniku → karta zostaje na miejscu, URL się nie zmienia        → AC-1
- [ ] Zaznacz 1 projekt → na dole pojawia się przypięty pasek „Zaznaczono: 1/3" z przyciskiem „Wyślij zapytanie"; odznacz → pasek znika        → AC-2
- [ ] Zaznacz 3 projekty → checkboxy pozostałych, niezaznaczonych kart są disabled z podpowiedzią o limicie; odznacz jeden z 3 → pozostałe natychmiast odblokowane        → AC-3
- [ ] Przy 2 zaznaczonych na `/wyniki?country=PL` kliknij „Wyślij zapytanie" → nawigacja do `/pl/klient/zapytanie?projects=<id1>,<id2>&country=PL`, żadne dane kontaktowe w URL        → AC-4
- [ ] Wejdź na `/pl/klient/zapytanie?projects=nieznane-id` → miękkie przekierowanie do `/pl/klient/wyniki` (z zachowanym `country`/`sizeMin`/`sizeMax`, jeśli były), bez ekranu błędu        → AC-5
- [ ] Wejdź na `/pl/klient/zapytanie?projects=id1,id1,id2,nieznane-id` → strona akceptuje i renderuje formularz dla oczyszczonego `[id1, id2]`        → AC-5
- [ ] Na `/zapytanie` z prawidłowym `projects`: formularz ma pola imię/e-mail/telefon, wszystkie wymagane; przycisk wysyłki nieaktywny dopóki pola nie są poprawnie wypełnione (w tym format e-maila)        → AC-6
- [ ] Wypełnij formularz poprawnie i wyślij (bez przeładowania strony) → natychmiast widać stan potwierdzenia z osobnym blokiem szablonu (zdjęcie, nazwa, producent, widełki cenowe, stały komunikat, status „Wysłano" z datą i godziną) dla każdego wybranego projektu        → AC-7
- [ ] Na ekranie potwierdzenia kliknij „Wróć do wyników" → nawigacja do `/pl/klient/wyniki` z zachowanym `country`/`sizeMin`/`sizeMax` (jeśli były), bez parametru `projects`        → AC-8
- [ ] Na `/zapytanie`: dokładnie jeden widoczny H1 na fazę; kolejność fokusa checkboxy (na `/wyniki`) → pasek akcji → pola formularza → link powrotu (po wysłaniu); widoczny `.focus-ring` na każdym elemencie interaktywnym        → AC-9

## Commands
- `npx tsc --noEmit` → brak błędów        → build spec
- `npm run build` → kompiluje się; `/pl/klient/wyniki` i `/pl/klient/zapytanie` renderują się jako ƒ (dynamic)        → build spec
- `npx vitest run` → wszystkie istniejące testy przechodzą (brak regresji na `ResultCard`, `results-filters`, `EmptyResults`, `ResultsHeader`, `ResultsFilterBar`, `projects`)        → build spec

## Acceptance-criteria coverage
- AC-1 … checkbox na karcie, zaznaczenie nie nawiguje · AC-2 … pasek akcji pojawia się od 1 zaznaczonego · AC-3 … limit 3, disabled + odblokowanie · AC-4 … nawigacja z `projects` plus przepisanymi filtrami · AC-5 … `parseInquiryProjectIds()` i miękki redirect · AC-6 … formularz kontaktowy z walidacją inline · AC-7 … potwierdzenie z blokiem szablonu na projekt · AC-8 … link powrotu z zachowanymi filtrami, bez `projects` · AC-9 … jeden H1, kolejność fokusa, `.focus-ring`
