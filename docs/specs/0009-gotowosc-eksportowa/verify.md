# Verify: Gotowość eksportowa (producent) · spec 0009 · updated 2026-08-16
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
## UI / manual
- [ ] Otwórz `/pl/producent/gotowosc-eksportowa?nazwa=Modulor%20Family%2090` → nagłówek pokazuje „Gotowość eksportowa: „Modulor Family 90”” → AC-1
- [ ] Otwórz `/pl/producent/gotowosc-eksportowa` (bez `nazwa`) → ten sam ekran z ogólnym nagłówkiem „Gotowość eksportowa”, brak błędu → AC-1
- [ ] Na ekranie widoczne dokładnie trzy wiersze krajów: Polska, Niemcy, Holandia, każdy ze `StatusPill` → AC-2
- [ ] Statusy są stałe niezależnie od `nazwa`: Polska = Dopuszczone, Niemcy = Warunkowo dopuszczone, Holandia = Niedopuszczone → AC-3
- [ ] Wiersze Polska i Holandia pokazują status i jednowierszowe uzasadnienie, bez kontrolki rozwijania → AC-4
- [ ] Wiersz Niemcy jest domyślnie zwinięty; kliknięcie rozwija listę co najmniej dwóch konkretnych, nazwanych braków → AC-5
- [ ] Tekst zastrzeżenia „To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana.” widoczny raz, blisko góry ekranu → AC-6
- [ ] Ekran nie zawiera dodatkowych akcji ani linków (np. do funkcji 14 albo strony głównej producenta) → AC-7
- [ ] Dokładnie jeden `<h1>` na stronie; nawigacja klawiaturą (Tab) dociera do wiersza Niemcy, Enter/Spacja rozwija akordeon, fokus przechodzi do rozwiniętej treści, `aria-expanded`/`aria-controls` obecne → AC-8

## Acceptance-criteria coverage
- AC-1 … covered by steps 1–2 · AC-2 … step 3 · AC-3 … step 4 · AC-4 … step 5 · AC-5 … step 6 · AC-6 … step 7 · AC-7 … step 8 · AC-8 … step 9
