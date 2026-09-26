---
name: scrape-steel-house
description: Gathers newer/more accurate product data (specs, dimensions, pricing, images) for Steel House (steel-house.com.pl) house models and, with explicit per-batch user confirmation of an exact before/after diff, writes it into the real Neon DB (project modularhub / spring-rain-58383710) refreshing the 2026-09-05 import (27 variants across 5 families, see _docs/steelhouse-import-manifest.json). Never writes without that confirmation; never touches lib/data fixtures or public/images.
allowed-tools:
  - Bash
  - WebFetch
  - Read
  - Write
  - Glob
  - Grep
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_network_requests
  - mcp__playwright__browser_evaluate
  - mcp__playwright__browser_click
  - mcp__playwright__browser_tabs
  - mcp__Neon__run_sql
  - mcp__Neon__run_sql_transaction
  - mcp__Neon__describe_table_schema
---

# Scrape Steel House — odświeżenie danych producenta

Steel House (steel-house.com.pl) jest już zaimportowany do Neona: 27 wariantów w 5 rodzinach
(Rosevia, Silesia, Posnania, Pomerania, Bukovina), import z 2026-09-05, opisany w
`_docs/steelhouse-import-manifest.json`. Ten import ma jawnie oznaczone dziury (ceny, technicalSpecs,
rooms/bedrooms/bathrooms, kilka niespójności QA). Prawa do zdjęć zostały ustnie potwierdzone przez
Steel House użytkownikowi 2026-09-25 (patrz `[[project_steel_house_image_rights_confirmed]]` w
pamięci) — `_docs/steelhouse-import-manifest.json`'s `rights` block jest w tym punkcie nieaktualny
dla Steel House konkretnie, ale ten skill sam go nie edytuje (to decyzja człowieka przy pełnym
imporcie, nie automatyczna zmiana).

Zadaniem jest zebrać świeższe, dokładniejsze dane ze strony i **zaktualizować nimi realną bazę**
(nie tylko zostawić plik badawczy) — potwierdzone 2026-09-25 na przykładzie całej rodziny Pomerania
(8/8 produktów, patrz Krok 6 niżej). Zapis do bazy wymaga za każdym razem jawnego, świeżego
potwierdzenia użytkownika na konkretny, pokazany mu wprost diff (patrz Krok 6) — nigdy nie zakładaj,
że wcześniejsza zgoda na jedną rodzinę obejmuje kolejne uruchomienie na innej rodzinie. Gdzie strona
nie daje jasnej odpowiedzi — zostaw pole puste/`null`/nietknięte z komentarzem, idź dalej. Nigdy nie
zgaduj liczb (cen, metraży, lat gwarancji, enumów technicznych).

---

## Ważne, już ustalone fakty o tej stronie (nie odkrywaj tego na nowo za każdym razem)

- **Strona to SPA renderowany po stronie klienta, backend Firebase** (`steelhouse-production-e4132`),
  nie statyczny content jak przy poprzednim imporcie. Potwierdzone 2026-09-25.
- `WebFetch` widzi sensownie: nawigację główną, treść hero, nazwy i liczbę modeli per rodzina na
  stronie głównej. **Nie widzi** hrefów kart "Odkryj domy z tej kolekcji" (routing po stronie
  klienta, brak `href` w statycznym HTML) ani treści `/konfigurator/...` (ładowana JS-em/Firestore
  po stronie klienta — próba dała same "NOT PROVIDED" dla specyfikacji technicznej, cen, obrazków).
  `/sitemap.xml` zwraca 404.
- **Adresy obrazków z `firebasestorage.googleapis.com` widziane przez WebFetch są bezużyteczne do
  pobrania** — Firebase Storage wymaga parametru `?alt=media&token=<uuid>`, którego WebFetch nie
  pokazuje (obcięty przy konwersji HTML→markdown). Bez tokenu każdy request zwraca
  `403 {"error":{"code":403,"message":"Permission denied."}}`. Zweryfikowane przez `curl` 2026-09-25.
  **Nigdy nie traktuj adresu obrazka zgłoszonego przez WebFetch jako gotowego do pobrania** — zawsze
  bierz prawdziwy, wyrenderowany `src`/`srcset` z przeglądarki (Playwright).
- Wniosek: **Playwright jest obowiązkowy** dla wszystkiego poza samą stroną główną. WebFetch służy
  tylko do szybkiego pierwszego rzutu oka na strony statyczne/marketingowe (`/o-nas`, `/jak-kupic`,
  `/qa`, `/domy-od-reki`).
- `/jak-kupic` ujawnia, że certyfikaty energetyczne, przekroje ścian i współczynniki U ("Pobierz
  certyfikaty energetyczne, przekroje ścian i dokładne współczynniki przenikalności cieplnej (U)")
  są zapowiedziane, ale nigdzie publicznie pokazane — najpewniej za `/profil` (logowanie klienta).
  **Domyślnie nie zakładaj konta i nie loguj się** — jeśli dane są zagrodzone loginem, oznacz je jako
  `blocked_needs_account` i idź dalej, chyba że użytkownik jawnie odblokuje sesję (patrz niżej).
- **2026-09-25: użytkownik założył i zalogował konto klienta Steel House** we współdzielonej
  przeglądarce Playwright na własną prośbę, konkretnie po to, żeby odblokować te dane. Jeśli sesja
  jest nadal zalogowana (sprawdź czy przycisk "Dokumenty PDF" w konfiguratorze otwiera plik zamiast
  modala logowania), korzystaj z tego zamiast z góry zakładać `blocked_needs_account`. Nie zakładaj
  jednak nowego konta ani nie loguj się sam bez wyraźnej prośby — to była jednorazowa decyzja
  użytkownika, nie stały uprawnienie.
- **Karty "Izolacja"/"Konstrukcja" na karcie modelu (nie w konfiguratorze) to martwe placeholdery,
  nawet po zalogowaniu** — otwierają się bez ściany logowania, ale ich treść to dosłownie "Dane w
  trakcie opracowywania przez inżynierów." (potwierdzone dla Pomerania 40, 2026-09-25). To NIE jest
  problem dostępu, tylko niedokończona treść po stronie Steel House. Prawdziwe dane techniczne
  (przekrój ściany/dachu/podłogi z grubościami warstw per poziom ocieplenia) siedzą zamiast tego w
  zakładce **"Dokumenty PDF" w konfiguratorze** — 3 pliki `OCIEPLENIE STANDARD/PLUS/WT2021.pdf`,
  nazwane `GLOBAL_...` u źródła czyli **identyczne dla każdego produktu/rodziny**, nie trzeba ich
  pobierać osobno per wariant. Idź od razu tam, pomijaj przyciski Izolacja/Konstrukcja na karcie.
  Te PDF-y to rysunki przekrojów z grubościami warstw, NIE certyfikat energetyczny — nadal brak
  liczbowego współczynnika U/klasy energetycznej nawet w nich.
- **Ceny są teraz jawnie publikowane** (zmiana względem stanu z importu 2026-09-05, kiedy strona nie
  pokazywała żadnych cen): każda karta wariantu i konfigurator pokazują cenę netto w PLN, plus stała
  adnotacja o VAT (8% osoby fizyczne/cele mieszkaniowe, 23% firmy) doliczanym na dokumencie
  sprzedażowym. **Zablokowana decyzja (2026-09-25, użytkownik)**: zapisujemy netto, więc pobierasz
  cenę w PLN i przeliczasz na EUR po bieżącym kursie NBP — patrz Krok 6, "Konwersja ceny" po dokładny
  przepis (kurs, zaokrąglenie, konwencja cytowania tabeli, ten sam wzorzec co
  `scripts/import-domihaus-catalog.ts`). Nie zostawiaj tego jako "pytanie do człowieka" — to już
  rozstrzygnięte.
- Konfigurator (`/konfigurator/...`) ujawnia bez logowania pełną listę płatnych opcji wykończenia
  (poziomy ocieplenia, materiały ścian/sufitów, rynny, grzejniki, kominek, projekt budowlany, PV,
  klimatyzacja) z dokładnymi dopłatami w PLN, oraz 3 przyciski standardu wykończenia: "Deweloperski",
  "Pod klucz", "Umeblowany". **Zablokowana decyzja (2026-09-25, użytkownik): "Umeblowany" nie jest
  dziś oferowany na naszej stronie — ignoruj go całkowicie**, nie twórz dla niego wariantu i nie szukaj
  odpowiednika w enumie. Tylko "Deweloperski" i "Pod klucz" mają realny sens (`CompletionStandard` w
  `lib/db/schema.ts`/`lib/data/types.ts`). **Każdy standard ma swoją własną, różną cenę bazową** na
  konfiguratorze (potwierdzone: Pomerania 40 — Deweloperski 170 000 zł, Pod klucz 190 000 zł) — cena
  widoczna na karcie kolekcji (bez wejścia w konfigurator) odpowiada zawsze **"Deweloperski"** (to
  domyślnie zaznaczony/pierwszy standard). Jeśli chcesz też cenę "Pod klucz", trzeba wejść w
  konfigurator i kliknąć ten przycisk per wariant — kosztowniejsze (27+ dodatkowych wizyt), rób to
  tylko gdy jawnie o to poproszono, w przeciwnym razie samo "Deweloperski" wystarcza do aktualizacji.
- **Dane na stronie konfiguratora bywają chwilowo puste/błędne tuż po `browser_navigate`** (np.
  metraż pokazał się jako 35 m² zamiast prawidłowych 40 m² dla Pomerania 40, zanim dane doczytały
  się z Firebase) — zanim zapiszesz jakąkolwiek wartość liczbową z tej strony, poczekaj na
  interakcję (np. kliknięcie zakładki) i zweryfikuj przeciw karcie z listy modeli rodziny, nie ufaj
  pierwszemu odczytowi.
- W stopce strony jest **prawdziwy NIP producenta: 7831705801** (REGON 302571482, KRS 0000483959,
  "Steel-House Sp. z o.o", ul. Książęca 16, 62-020 Gortatowo) — baza ma dziś placeholder
  `DEMO00000006`. Kontakt: `biuro@steel-house.com.pl`; telefon w stopce pokazuje "+48 509 502 508"
  ale link `tel:` pod spodem to inny numer, `+48500600700` — rozbieżność do potwierdzenia, nie
  wybieraj jednego arbitralnie.
- Stan na 2026-09-25: strona główna pokazuje **8 rodzin**, nie 5: Silesia, Rosevia, Posnania,
  **Calisia, Cassubia, Varsovia** (te trzy nowe — zero wierszy w bazie), Pomerania, Bukovina. Zawsze
  przelicz to na nowo przy każdym uruchomieniu (liczba rodzin/modeli może się zmienić), ale wiedz,
  że dojście od 5 do 8 rodzin już się zdarzyło raz.
- Playwright w tym środowisku używa **jednego współdzielonego profilu Chrome**. Jeśli
  `browser_navigate` zwraca `"Browser is already in use for ... use --isolated ..."`, to znaczy że
  inna sesja/proces go trzyma. **Nie zabijaj tego procesu i nie próbuj obejść blokady** — zatrzymaj
  się i zgłoś to użytkownikowi jako blocker. Sprawdzenie (nieinwazyjne, nic nie zamyka):
  `powershell -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*mcp-chrome*' } | Select ProcessId,CreationDate"`.

---

## Krok 0 — Wczytaj znany stan

Przeczytaj równolegle:
- `_docs/steelhouse-import-manifest.json` — 27 znanych `external_id`/`product_id`, znane luki, `qa_findings_source_spreadsheet` (5 konkretnych niespójności do ponownej weryfikacji), `next_steps`.
- `tmp/house-research/SteelHouse_projekty_ModularHub — kopia.json` jeśli istnieje — surowe dane z poprzedniego arkusza źródłowego, przydatne do porównania "co się zmieniło na stronie od tamtej pory".
- `lib/product-technical-specs.ts` — dokładne enumy do `technicalSpecs` rodziny `dom` (`ENERGY_CLASSES`, `VENTILATION_TYPES`, `HEAT_SOURCES`, `CONSTRUCTION_TECHNOLOGIES`) i pola opcjonalne (`wallBuildUp`, `insulation`, `windowClass`, `fireResistance`, `windResistance`). Każda wartość tekstowa ze strony musi się zmapować na jedną z tych wartości enum, albo iść do `*Other`/wolnego tekstu — nigdy nie wymyślaj nowej wartości enum.
- **`lib/db/schema.ts` to jest wyznacznik dla realnego zapisu** (użytkownik, 2026-09-25: "dopasuj do aktualnego modelu danych to jest wyznacznik"), nie `lib/data/types.ts` (to model mock/prototypu). Kluczowe tabele: `product` (płaskie pola + `technicalSpecs` jsonb + `completionStandard`, legacy pole wciąż używane dla produktów bez wariantów, patrz `scripts/import-domihaus-catalog.ts`), `productVariant` (`product.priceMinCents`/`priceMaxCents` to od spec 0041 pochodna wyzwalacza z `productVariant` gdzie `isDefault=true` — **nigdy nie pisz tam wprost, jeśli produkt ma już wiersze w `productVariant`**, patrz `lib/db/AGENTS.md`), `producer`. Sprawdź `describe_table_schema`/`run_sql` zamiast zgadywać z komentarzy.
- `lib/data/types.ts` tylko jako pomocniczy słownik nazw pól przy zbieraniu danych ze strony, nie jako cel zapisu.

Zbuduj sobie w pamięci zbiór znanych `external_id`/`product_id` (27 sztuk, wzorzec `steelhouse-<rodzina>-<rozmiar>`) żeby móc odróżnić "aktualizację istniejącego wariantu" od "nowy wariant, którego nie ma w bazie". Dla rodziny którą aktualizujesz, odpytaj też od razu `producer`/`product`/`product_variant` przez `run_sql` na projekcie **`spring-rain-58383710` (to jest `modularhub`, prawdziwy prod — NIE `bold-tree-78265613`/`modularhub-dev`)**, żeby znać dokładny aktualny stan przed jakimkolwiek zapisem.

---

## Krok 1 — Policz rodziny i warianty (Playwright)

1. `browser_navigate` na `https://www.steel-house.com.pl/`.
2. `browser_snapshot` — z accessibility tree odczytaj prawdziwe cele linków kart "Odkryj domy z tej kolekcji" dla każdej z rodzin oraz liczbę modeli pokazaną na każdej karcie.
3. Porównaj listę rodzin z 5 znanymi z manifestu. Każdą rodzinę spoza tej piątki oznacz wprost jako `"status": "new_family_not_in_db"`.
4. Dla każdej rodziny wejdź na jej stronę kolekcji (link z kroku 2) i `browser_snapshot`, żeby zebrać listę wariantów tej rodziny wraz z prawdziwymi linkami do ich stron/konfiguratorów (oczekiwany wzorzec: `/konfigurator/<rodzina>-<rozmiar>-<timestamp>`, tak jak w przykładzie `pomerania-40-1760710776796` podanym przez użytkownika — ale nie zakładaj, że to jedyny możliwy format, zapisz to co faktycznie zobaczysz).

Jeśli `browser_navigate` odmawia bo przeglądarka jest zajęta — zatrzymaj się tutaj, patrz sekcja "Blokery" niżej.

---

## Krok 2 — Dla każdego wariantu: przejście po konfiguratorze

Dla każdego znalezionego wariantu (istniejącego i nowego):

1. `browser_navigate` na jego URL.
2. **Najpierw** `browser_network_requests` (bez `static: true`, ewentualnie z `filter` na `firestore|firebase|api`) — surowa odpowiedź API jest prawdopodobnie pełniejsza i pewniejsza niż to co widać w DOM (cena, technicalSpecs mogą przychodzić jako JSON zanim wyrenderują się jako tekst). Zapisz surowe payloady, nawet jeśli nie rozumiesz każdego pola — mogą się przydać przy właściwym imporcie.
3. `browser_evaluate` sprawdzające obecność wbudowanego stanu (`window.__NEXT_DATA__`, `window.__INITIAL_STATE__`, albo cokolwiek podobnego w `window`) — jeśli istnieje, to tańszy sposób na strukturalne dane niż parsowanie DOM.
4. `browser_snapshot` dla wszystkiego, co widoczne: metraże, liczba pomieszczeń, standard wykończenia (tylko Deweloperski / Pod klucz — Umeblowany ignorujemy, patrz sekcja faktów wyżej), opcje konfiguratora, opisy.

Zbierz, co się da, z tej listy pól (nazwy z `lib/data/types.ts` / `lib/product-technical-specs.ts`) — dla każdego pola: wartość albo `null` + dlaczego nieznane:

**Wymiary/podstawa**: `floorAreaM2`, `builtUpAreaM2`, powierzchnia całkowita (z antresolą, jeśli dotyczy), `rooms`, `bedrooms`, `bathrooms`, `storeys`, `externalDimensions`, `roofType`.

**Konstrukcja**: `constructionSystem` (opisowo — poprzedni import użył "stalowy szkielet z profili stalowych", potwierdź czy to nadal pasuje), `technicalSpecs.constructionTechnology` (prawdopodobnie `modulowa-stal-lekka`, ale sprawdź czy strona nie precyzuje inaczej — jeśli nie da się jasno dopasować, `inne` + `constructionTechnologyOther`), `wallBuildUp`, `insulation`, `heatTransferCoefficients` (klasa energetyczna A+/A/B/C/D — użyj `nieznana` jeśli strona nie podaje wprost, nie licz/nie szacuj), `windowClass`, `ventilation` (dopasuj do enumu albo `inna` + `ventilationOther`), `heatSource` (dopasuj do enumu albo `inne` + `heatSourceOther`), `fireResistance`, `windResistance`.

**Handel/logistyka**: cena (jeśli konfigurator pokazuje realną kwotę bazową — dotychczas strona nie publikowała cen wcale, sprawdź czy się to zmieniło; jeśli nadal tylko kalkulator bez widocznej kwoty bazowej, zapisz `priceOnRequest`-owy status, nie zgaduj liczby), `structuralWarrantyYears`, `installationWarrantyYears`, `foundationOptions`, `serviceScopeDescription`, `transportDimensions`, `craneRequirements`, `minPlotWidthM`, `certifications`.

**Treść**: `roomLayout` (jeśli pokazany rzut z nazwanymi pomieszczeniami), `faq` (uwaga: strona ma osobną stronę `/qa` — sprawdź czy jest ogólna dla firmy czy per produkt), co musi zapewnić klient (`clientRequirements`).

Reguła: pole zasłonięte loginem/"Profil Klienta"/pobieraniem PDF za rejestrację → zapisz jako `"blocked_needs_account"`, nie próbuj tego obejść.

**Dla 5 znanych rodzin dodatkowo aktywnie zweryfikuj** te konkretne niespójności z manifestu (nie przepisuj ich jako wciąż-nieznane bez próby):
- Rosevia 60 (4.3×14 m) vs Rosevia 57 (4.3×13.3 m) — identyczne powierzchnie mimo różnych wymiarów.
- Silesia 48 — wysokość nieznana (podejrzenie przesunięcia kolumny w starym arkuszu).
- Pomerania 35 — wymiary 3.2×10 m vs zabudowa 35 m² niespójne.
- Bukovina 45/55 — gwarancja konstrukcyjna nieopisana.
- Posnania — nazewnictwo wariantów 40/48 w bazie vs ewentualne 41/45 gdzieś na stronie.

**Nowa reguła (znaleziona na Pomerania, 2026-09-25): zawsze porównaj `external_dimensions`/`floor_area_m2` bieżącego produktu z sąsiednimi wariantami tej samej rodziny w bazie** — poprzedni import miał co najmniej dwa realne błędy kopiuj-wklej w tych polach (Pomerania 35 miała wymiary Pomerania 32; Pomerania 40 miała w `floor_area_m2` wartość "powierzchni użytkowej" zamiast "całkowitej", niespójną ze wzorcem reszty rodziny). Jeśli wartość nie pasuje do wzorca rodziny (np. `built_up_area_m2 = szerokość × długość` się nie zgadza, albo `floor_area_m2` < `built_up_area_m2` podczas gdy reszta rodziny ma odwrotnie dla modeli z antresolą) — to sygnał błędu w danych, nie w Twoim odczycie; zweryfikuj na stronie i popraw.

---

## Krok 3 — Zdjęcia: pobieranie, potem screenshot jako fallback

1. Z wyrenderowanej strony (snapshot/evaluate) zbierz prawdziwe `src`/`srcset` (największy wariant) — **z pełnym query stringiem**, łącznie z tokenem Firebase (`?alt=media&token=...`), bo bez niego pobranie zawsze da 403.
2. Spróbuj pobrać bezpośrednio (skrypt Node, ten sam wzorzec co w `scrape-property/SKILL.md` krok 5 — `fetch` z nagłówkami `User-Agent`/`Referer`) do `tmp/house-research/steel-house/images/<rodzina>/<wariant-slug>/`.
3. Jeśli mimo tokenu dalej 403/404 (token wygasł, obrazek renderowany na canvasie, itp.) — zrób `browser_take_screenshot` (rozważ `fullPage: true` gdy potrzebny cały widok) tego elementu/sekcji, zapisz obok z sufiksem `-screenshot.png`, i jasno odnotuj w raporcie który plik jest screenshotem (niższa jakość, nigdy nie zastępuje prawdziwego assetu po potwierdzeniu praw).
4. **Nigdy nie zapisuj nic do `public/images/...`** — to materiał z niepotwierdzonymi prawami (patrz Zasady niżej).

---

## Krok 4 — Plik badawczy per rodzina

Dla każdej rodziny zapisz `tmp/house-research/steel-house/<rodzina-slug>.json` (przechowuje surowe
ustalenia i uzasadnienia, niezależnie od tego czy Krok 6 zapisze je też do bazy):

```json
{
  "family": "pomerania",
  "scraped_at": "<ISO timestamp>",
  "source": {
    "homepage": "https://www.steel-house.com.pl/",
    "collection_url": "...",
    "site_architecture_note": "SPA/Firebase, WebFetch niewystarczający — patrz SKILL.md"
  },
  "known_in_db": true,
  "variants": [
    {
      "external_id": "steelhouse-pomerania-40",
      "status": "existing_update | new",
      "configurator_url": "https://www.steel-house.com.pl/konfigurator/pomerania-40-1760710776796",
      "fields": { "...pola z Kroku 2, wartość albo null + powód..." },
      "technicalSpecs": { "...jak w lib/product-technical-specs.ts, dom..." },
      "images": [
        { "local_path": "tmp/house-research/steel-house/images/pomerania/pomerania-40/01.jpg", "kind": "downloaded | screenshot", "source_url": "...", "note": "" }
      ],
      "unresolved_questions": ["..."],
      "diffs_vs_manifest": ["np. wcześniej priceMin=NULL, teraz konfigurator pokazuje realną cenę bazową X PLN"],
      "db_update_applied": { "at": "<ISO timestamp>", "note": "patrz Krok 6" }
    }
  ]
}
```

Jeśli plik dla danej rodziny już istnieje z poprzedniego uruchomienia, nie nadpisuj go po cichu —
dołącz `previous_run_diff` z tym, co się zmieniło.

---

## Krok 5 — Konwersja ceny PLN → EUR (zablokowana decyzja, 2026-09-25)

1. Pobierz bieżący kurs średni NBP: `WebFetch("https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json", ...)`. Zanotuj `no` (numer tabeli) i `effectiveDate`.
2. Cena źródłowa = cena netto na karcie kolekcji wariantu (to zawsze standard "Deweloperski").
3. `eur = Math.round(pln_netto / kurs)`, `cents = eur * 100` — ta sama konwencja co `plnToRoundedEurCents` w `scripts/import-domihaus-catalog.ts`.
4. To już jest cena netto w EUR — nie doliczaj VAT do niczego.

---

## Krok 6 — Zapis do bazy (Neon MCP, projekt `spring-rain-58383710` = `modularhub`, PROD)

To NIE jest opcjonalny follow-up — to jest cel tego skilla (potwierdzone przez użytkownika 2026-09-25). Każde uruchomienie i tak wymaga świeżego potwierdzenia na konkretny diff.

1. Dla każdego produktu sprawdź `run_sql`, czy ma już wiersze w `product_variant`. Ma wiersze (dziś: tylko Pomerania 40) → cenę zapisz przez `UPDATE product_variant` na wierszu z `completion_standard = 'deweloperski'`, nigdy bezpośrednio w `product.priceMinCents` (trigger go zsynchronizuje sam, zweryfikowane 2026-09-25). Nie ma wierszy (większość) → `UPDATE product SET price_min_cents = ..., completion_standard = 'deweloperski', ...` bezpośrednio, jak w `scripts/import-domihaus-catalog.ts`. Nie twórz nowych wierszy `product_variant` samodzielnie bez jawnej prośby.
2. `technicalSpecs` zawsze przez merge (`technical_specs || $j${...}$j$::jsonb`), nigdy przez nadpisanie całego obiektu.
3. Dollar-quoting dla JSON: `$j${...}$j$::jsonb`, NIGDY nie owijaj obiektu w dodatkowe `( {...} )` — to daje `invalid input syntax for type json` (błąd napotkany i naprawiony 2026-09-25).
4. Przed transakcją zapisu pokaż użytkownikowi tabelę dokładnych zmian (stara → nowa wartość, przynajmniej cena) i poczekaj na jawne potwierdzenie. Auto-mode i tak zablokuje dużą transakcję na prod bez tego — nie próbuj obejść dzieląc na mniejsze wywołania, tylko pokaż diff i zapytaj.
5. Użyj `run_sql_transaction` dla wielu produktów naraz (jeden atomowy batch).
6. Po zapisie zweryfikuj odczytem `run_sql`, dopiero potem zgłoś sukces.
7. Producer NIP: zaktualizuj przy pierwszej rodzinie danego producenta, jeśli placeholder `DEMO0000000N` a strona ujawniła prawdziwy NIP.
8. Nigdy nie ruszaj `public/images/*`, `lib/data/fixtures/*`, migracji w ramach tego kroku.

---

## Krok 7 — Raport dla użytkownika

Nigdy nie kończ ciszą. Podsumowanie musi zawierać:

- Rodziny znalezione vs znane w bazie (jawnie wypisz nowe: dziś Calisia, Cassubia, Varsovia).
- Per wariant: co udało się uzupełnić, co zostało `null`/`blocked_needs_account`, co faktycznie zapisano do bazy (Krok 6) i jaką miało starą wartość.
- Realne błędy w istniejących danych znalezione i poprawione (kopiuj-wklej, pomylone pola) — wypisz je jawnie.
- Jawna lista "potrzebuję pomocy przy": zablokowana przeglądarka Playwright, treści za logowaniem, niejednoznaczne dopasowania do enumów, nierozwiązane niespójności QA, pola poza zakresem tego zapisu (`roomLayout`, `faq`, `costLineItem`/`timelineStage` per wariant — nie wypełniaj ich bez dodatkowej, jawnej prośby).
- Jawne stwierdzenie co zostało zapisane a co nie: `public/images/`, `lib/data/fixtures/`, git zostają nietknięte przez ten skill zawsze.

---

## Zasady i ograniczenia

- **Nigdy nie ruszaj** `lib/data/fixtures/*`, `public/images/*`, migracji (`db:migrate`, `drizzle/`) — Krok 6 zapisuje tylko do istniejących kolumn `product`/`product_variant`/`producer` przez Neon MCP, nigdy przez zmianę schematu ani plików w repo.
- **Nigdy nie zgaduj wartości enum** w `technicalSpecs` — `"nieznana"`/`"inne"` + wolny tekst w `*Other` jest zawsze bezpieczniejsze niż strzał (dokładnie po to ta ucieczka istnieje w `lib/product-technical-specs.ts`).
- **Nigdy nie zmyślaj ceny** — jeśli konfigurator pokazuje tylko żywy kalkulator bez widocznej kwoty bazowej, zapisz to jako brak jawnej ceny (tak jak poprzedni import), nie interpoluj z sąsiednich wariantów.
- **Zdjęcia**: Steel House potwierdził 2026-09-25 wiadomością do użytkownika zgodę na pobieranie i wykorzystanie swoich zdjęć — pobieraj je normalnie (nie tylko screenshot) do `tmp/house-research/steel-house/images/`. To nadal nie znaczy "gotowe do publikacji": to etap testowy/badawczy, `public/` i `_docs/steelhouse-import-manifest.json`'s `rights` block zostają nietknięte, aktualizacja tego pola to decyzja człowieka przy właściwym imporcie (patrz `[[project_steel_house_image_rights_confirmed]]` w pamięci).
- **Jeśli współdzielona przeglądarka Playwright jest zajęta** — zatrzymaj się i zapytaj; nie zabijaj procesu, nie próbuj drugiego profilu.
- **Jeśli dane są za logowaniem** (`/profil`, pobieranie PDF wymagające konta) — sprawdź najpierw, czy współdzielona sesja przeglądarki nie jest już zalogowana (użytkownik założył konto klienta 2026-09-25 właśnie po to, żeby to odblokować — patrz sekcja faktów na górze); jeśli sesja nie jest zalogowana, oznacz dane jako zablokowane i nie zakładaj nowego konta ani nie loguj się bez świeżej, wyraźnej zgody użytkownika.
- **Weryfikuj, nie tylko przepisuj**: dla 5 znanych rodzin aktywnie spróbuj rozwiązać istniejące już oznaczone niespójności QA, zamiast powtórzyć je jako wciąż nieznane bez próby.
- Jeden plik na rodzinę; przy ponownym uruchomieniu dopisz różnicę względem poprzedniego pliku zamiast ciszej nadpisywać.
