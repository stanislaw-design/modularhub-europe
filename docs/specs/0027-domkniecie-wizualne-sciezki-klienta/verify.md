# Verify: domknięcie wizualne ścieżki klienta · spec 0027 · updated 2026-09-04
_Steps derived from spec 0027 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Odwiedź `/pl/klient/wyniki` → tło `brand-v5-surface`, karty wyników, pasek filtrów i chipy renderują tokeny v5 (biel/amber/czarny tekst), nie v3 (granat/stalowy niebieski) → AC-1
- [ ] Najedź kursorem na kartę wyniku, chip filtra i przycisk „Szukaj” na `/pl/klient/wyniki` → widoczne, płynne przejście (cień/kolor/skala), nie martwe kliknięcie → AC-6
- [ ] Wejdź na `/pl/klient/wyniki` i przewiń w dół → karty siatki wyników pojawiają się z lekkim opóźnieniem i przesunięciem (ScrollReveal), nie wyskakują od razu w całości → AC-7
- [ ] Powtórz powyższe trzy kroki na `/pl/klient/zapytanie` (po wybraniu domów na wynikach) i `/pl/klient/oferta?project=...&address=...` → ten sam v5, te same przejścia → AC-1, AC-6
- [ ] Odwiedź `/pl/klient/projekt/[id]` → sekcja „Technologia i konstrukcja” w v5 (plakietki czarne/amber/zielone), karta „kluczowe dane” z czarną obwódką v5, „Warunki komercyjne” w v5 → AC-1
- [ ] Odwiedź `/pl/klient/dzialka?projects=...` → panel działki w v5, rozwiń wiersz domu → tło przy najechaniu, pola formularza i przycisk „Zapłać” w v5 → AC-1, AC-6
- [ ] Odwiedź `/pl/klient/realizacja?project=...` (dla projektu z zamówieniem) → `StageTimeline` renderuje markery czarny/amber/jasny zamiast granat/niebieski/stalowy → AC-1
- [ ] Zaloguj się jako klient, odwiedź `/pl/klient/panel/ulubione`, `/zapytania`, `/profil` → zakładki, karty ulubionych, tabela porównania i formularz profilu w v5, siatka ulubionych z efektem ScrollReveal → AC-1, AC-7
- [ ] Odwiedź `/pl/klient/rejestracja` → formularz w v5 → AC-1
- [ ] Na każdym z ośmiu ekranów, przy szerokości 360px i 768px (DevTools/Playwright), brak poziomego przewijania całej strony i żaden element nie jest ścięty (wyjątek: `FavoriteCompareTable` przewija się tylko wewnątrz siebie przy 3 porównywanych domach) → AC-8
- [ ] `StatusPill` (approved/conditional/blocked) na `/pl/klient/dzialka` (wynik analizy), `/pl/klient/wyniki` (odznaka „Wymaga dodatkowych dokumentów”) i `/pl/klient/panel/ulubione` (odznaka „Produkt niedostępny”) mają dokładnie te same kolory co przed migracją → AC-3
- [ ] Zrzut ekranu Playwright `/pl/producent/realizacje`, `/pl/producent/realizacja?project=...`, `/pl/producent/produkty`, `/pl/producent/projekt` (rejestracja producenta) porównany z zachowaniem sprzed kroku 1 — zero różnicy wizualnej (nadal v3/orange) → AC-2, AC-3, AC-4
- [ ] Na `/pl/klient/wyniki` sprawdź, że `SiteHeader` renderuje się w pełnym, `sticky`, jasnym stanie (nie przezroczysta nakładka v4 strony głównej) → AC-4
- [ ] Na każdym z ośmiu ekranów: dokładnie jeden prawdziwy `<h1>` (inspektor DOM/axe), logiczna kolejność fokusa (Tab przez interaktywne elementy), widoczny `.focus-ring` na każdym z nich → AC-9
- [ ] Sprawdź kontrastomierzem (np. axe DevTools) tekst na kartach wyników/ulubionych/szczegółach projektu na tle `brand-v5-surface` — wszystkie ≥4.5:1 (tekst) / 3:1 (elementy nietekstowe); zwróć uwagę na `text-brand-v5-ink` tam, gdzie wcześniej był `amber-strong` (Button ghost, chipy aktywne, `StageTimeline` „Aktualny etap”, plakietka podglądu na `ResultCard`, link „Zaloguj się” na rejestracji) → AC-9

## Commands

- [ ] `npx tsc --noEmit -p tsconfig.json` → brak błędów → wszystkie AC (kompilacja)
- [ ] `npm run test` (lub `npx vitest run components/klient components/ui components/auth`) → wszystkie testy zielone; `InquiryFlow.test.tsx` używa `findByRole` dla przycisku „Ponów wysyłanie” (naprawiony wyścig, nie objaw regresji tego spec) → AC-5
- [ ] `npx playwright test e2e/wyniki.spec.ts` → zielone → AC-5, AC-6

## Acceptance-criteria coverage

- AC-1 … pokryte krokami odwiedzin każdego z ośmiu ekranów powyżej
- AC-2 … pokryte krokiem porównania zrzutów ekranu producenta (zero różnicy)
- AC-3 … pokryte krokiem sprawdzenia kolorów `StatusPill`
- AC-4 … pokryte krokiem `SiteHeader` i porównaniem producenta (brak v4 na ośmiu ekranach)
- AC-5 … pokryte krokami testów jednostkowych/e2e (trasy, parametry, DOM, logika bez zmian)
- AC-6 … pokryte krokami najechania/fokusu na karty, chipy, przyciski
- AC-7 … pokryte krokami przewinięcia siatek wyników/ulubionych
- AC-8 … pokryte krokiem sprawdzenia szerokości 360px/768px na wszystkich ośmiu ekranach
- AC-9 … pokryte krokami `<h1>`/kolejności fokusa/`.focus-ring`/kontrastu
