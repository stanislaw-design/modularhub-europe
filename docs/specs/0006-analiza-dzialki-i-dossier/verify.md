# Verify: analiza działki i dossier · spec 0006 · updated 2026-08-14
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Wejdź na `/pl/klient/dzialka?projects=nieznane-id&country=DE&sizeMin=50` → przekierowanie do `/pl/klient/wyniki?country=DE&sizeMin=50`, bez błędu → AC-1
- [ ] Wejdź na `/pl/klient/dzialka?projects=<1 do 3 znanych id>` → panel z polem adresu i jednym wierszem na dom → AC-1, AC-2
- [ ] Na `/pl/klient/zapytanie`, wyślij zapytanie, na ekranie potwierdzenia kliknij „Sprawdź działkę” → trafiasz na `/pl/klient/dzialka` z tymi samymi `projects` (i `country`/`sizeMin`/`sizeMax`, jeśli były obecne) → AC-2
- [ ] Rozwiń wiersz domu → widać stały opis zakresu, cenę (`149 €`), pole metrażu; „Zapłać” nieaktywne, dopóki adres panelu lub metraż (poza 100–100000) są puste/nieprawidłowe → AC-3
- [ ] Wpisz adres i metraż w zakresie, kliknij „Zapłać” → stan „Przetwarzanie płatności” (~1200 ms), potem automatycznie wynik → AC-4
- [ ] Po wyniku zmień adres w polu panelu → URL/wynik przycisku „Przejdź do oferty” dla już opłaconego wiersza nie zmienia się (migawka `paidAddress` została zachowana) → AC-4, AC-6
- [ ] Wynik pokazuje `StatusPill` (dopuszczone/warunkowo/niedopuszczone), uzasadnienie tekstowe i stały tekst zastrzeżenia „To nie jest opinia prawna...” → AC-5
- [ ] Przy statusie dopuszczone/warunkowo widać przycisk „Przejdź do oferty wiążącej” → `/pl/klient/oferta?project=<id>&address=<adres migawki>` → AC-6
- [ ] Przy statusie niedopuszczone nie ma przycisku dalej → AC-7
- [ ] Zapłać/rozwiń dom A, potwierdź że dom B w tym samym panelu zostaje nietknięty (nadal `idle`, puste pole) → AC-8
- [ ] Odśwież stronę → adres, metraże i wyniki wracają do stanu początkowego (nic nie jest trwale zapisywane) → AC-9
- [ ] Sprawdź czytnikiem ekranu/DOM: dokładnie jeden prawdziwy H1 („Panel działki”), kolejność fokusa (adres → wiersze → kontrolki rozwiniętego wiersza), `aria-expanded`/`aria-controls` na przycisku wiersza, `aria-live="polite"` na obszarze wyniku, fokus przenoszony na treść wiersza przy rozwinięciu, widoczny `.focus-ring` na każdym elemencie interaktywnym → AC-10

## Commands
- `npx tsc --noEmit -p tsconfig.json` → brak błędów → wszystkie AC (typy)
- `npm run lint` → brak błędów → wszystkie AC (konwencje)
- `npx vitest run` → 10/10 plików, 80/80 testów przechodzi (istniejący pakiet, bez regresji z tej zmiany) → AC-6..AC-9 istniejące pokrycie `InquiryFlow`
- `npm run build` → kompiluje się, `/pl/klient/dzialka` widoczna jako trasa dynamiczna → wszystkie AC

## Acceptance-criteria coverage
- AC-1 … pokryte krokiem 1–2 (redirect + panel) · AC-2 … krok 2–3 (wejście z potwierdzenia) · AC-3 … krok 4 (stan idle bramki) · AC-4 … krok 5–6 (płatność, migawka adresu) · AC-5 … krok 7 (wynik + zastrzeżenie) · AC-6 … krok 6, 8 (przycisk dalej + migawka) · AC-7 … krok 9 (niedopuszczone) · AC-8 … krok 10 (izolacja stanu wierszy) · AC-9 … krok 11 (brak trwałości) · AC-10 … krok 12 (dostępność)
