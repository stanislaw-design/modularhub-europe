---
name: scrape-kora-wdh
description: Gathers sauna model data (specs, dimensions, pricing, option groups, images) for Kora (firmakora.pl) and Wooden Dream House (woodendreamhouse.com), the two spec 0061 (docs/specs/0061-strona-produktu-sauna/) reference producers, and writes new/refreshed `spa-modulowe`/`sauna` products into the dev Neon DB (project modularhub-dev / bold-tree-78265613). Never writes to prod (spring-rain-58383710) directly — that is always a separate, explicitly requested follow-up once dev is confirmed correct, same as the rest of spec 0061's Build plan. Never touches lib/data fixtures or public/images.
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
  - mcp__playwright__browser_evaluate
  - mcp__Neon__run_sql
  - mcp__Neon__run_sql_transaction
  - mcp__Neon__describe_table_schema
  - mcp__Neon__create_branch
  - mcp__Neon__delete_branch
---

# Scrape Kora + Wooden Dream House — katalog saun

Dwaj producenci referencyjni dla spec 0061 (dedykowana strona `/sauna/[slug]`). Dwa pierwsze modele
(Kora Relax 550 `relax-550`, Wooden Dream House Qube `qube`) są już w dev DB, opublikowane, z 10
realnymi zdjęciami każdy (2026-10-02) — to jest wzorzec pól/mechanizmu do powielenia, nie coś do
nadpisania. Ten skill istnieje, bo spec 0061 Follow-up wprost przewidział potrzebę odświeżania
katalogu obu producentów jako powtarzalne zadanie.

**Prawa do zdjęć**: użytkownik potwierdził zgodę obu producentów 2026-10-02 (patrz
`[[project_sauna_reference_photos_2026_10_02]]` w pamięci) — to ustalenie dotyczy **tych dwóch
konkretnych producentów w sposób ciągły**, inaczej niż Steel House, gdzie każdy nowy batch wymaga
świeżego potwierdzenia. Nie trzeba pytać ponownie dla kolejnych modeli Kory/WDH, ale **nowy, trzeci
producent zawsze wymaga własnego potwierdzenia**, nigdy nie zakładaj, że to się rozciąga dalej.

---

## Już ustalone fakty o tych stronach (nie odkrywaj na nowo)

- **firmakora.pl jest statyczny/serwerowo renderowany** — `WebFetch` radzi sobie dobrze bezpośrednio
  na stronie kategorii i stronach produktów (cena, wymiary, specyfikacja, liczba zdjęć). Nie
  wymagało Playwright 2026-10-02.
- Lista modeli saun Kory: `https://firmakora.pl/kategoria-produktu/sauny-ogrodowe/` (nie zgaduj
  innego adresu — `/sauny-zewnetrzne/` daje 404). Stan na 2026-10-02, **7 pozycji**, z czego jedna
  (`https://firmakora.pl/produkt/sauna-projekt-indywidualny/`, 499 zł) to opłata za wycenę
  indywidualnego projektu, **nie prawdziwy katalogowy model — pomijaj ją zawsze**. Realne 6 modeli
  (2 już w bazie): Relax 550 (w bazie), Relax 600, Premium Prestigio 400, Premium Prestigio 180,
  Premium Prestigio 210, Premium Prestigio 250 (`sauna-premium-250x200`). Przelicz tę listę na nowo
  przy każdym uruchomieniu — liczba modeli może się zmienić.
- **woodendreamhouse.com ma zwodniczą nawigację dla WebFetch**: konwersja HTML→markdown gubi
  poprawne powiązanie etykieta↔href w menu (np. WebFetch raportował że link "Sauny ogrodowe" na
  stronie głównej prowadzi do `/domki-caloroczne-odin/`, co jest fałszywe). **Zawsze używaj
  Playwright (`browser_navigate` + `browser_snapshot`) do ustalania prawdziwych adresów nawigacji na
  tej stronie**, WebFetch tylko do czytania treści już znanej, poprawnej strony produktu. Prawdziwa
  ścieżka do listy saun: Strona główna → "Nasze produkty" (`/produkty`) → "Sauny" → **`/sauny/`**.
  `/sitemap.xml`→`/product-sitemap.xml` istnieje ale indeksuje tylko WooCommerce `/produkt/...`
  (donice, kuchnie ogrodowe, stoły) — sauny żyją jako osobne strony statyczne poza tym systemem
  (`/sauna-qube/`, `/sauna-q-premium/`), sitemap ich nie pokaże.
- **`browser_snapshot` (accessibility tree) też bywa niewiarygodny na `/sauny/`**: zaraz po
  `browser_navigate` snapshot pokazał tylko 2 z 8 realnych modeli (karty z animacją scroll-reveal
  jeszcze nie "odpalone" w drzewie dostępności w momencie zrzutu) — dokładnie ten sam błąd co WebFetch,
  tylko inny mechanizm. **Zawsze policz linki przez `browser_evaluate` bezpośrednio na DOM**
  (`document.querySelectorAll('a[href]')` filtrowane po `/sauna-` w `href`), nigdy nie ufaj samej
  liczbie kart widocznej w snapshotcie zaraz po nawigacji.
- Lista modeli saun WDH: `https://woodendreamhouse.com/sauny/`. Stan na 2026-10-02, **8 pozycji**
  (potwierdzone przez `browser_evaluate`, patrz punkt wyżej — nie 2, jak błędnie ustalono pierwszym
  podejściem tego samego dnia): Qube, Q-Premium, Q-Prestige, Harmony, Qubit, Oasis, Loki, Shell.
  Q-Prestige/Harmony/Qubit/Oasis/Loki/Shell wspominają tekstowo (nie jako osobny selektor z cenami)
  "system audio, sterowanie poprzez Wi-Fi oraz pakiet światłoterapii LED DreamLight" jako możliwe
  dodatki — przypisz im mimo to istniejące 3 grupy WDH (ten sam wzorzec co Qube). **Q-Premium jest
  wyjątkiem**: jego strona nie wspomina tych akcesoriów w ogóle (piec Narvi 9kW jest u niego w cenie
  bazowej, bez osobnej sekcji dodatków) — nie przypisuj mu żadnej grupy opcji, zweryfikowane
  2026-10-02 przez czytanie oczyszczonego tekstu strony, nie zgaduj z wzorca pozostałych modeli.
- **Obrazki obu stron pobierają się bezpośrednio przez `curl` bez żadnego tokenu/referera** (inaczej
  niż Steel House/Firebase) — wystarczy nagłówek `User-Agent` przeglądarki. Zweryfikowane 2026-10-02
  (20/20 plików, oba producenci, zwykły `curl -A "<UA>" -L -o ...`). Nie trzeba fallbacku na
  screenshot, chyba że konkretny request faktycznie zawiedzie.
- **firmakora.pl ma Cloudflare JS challenge, który włącza się po burście requestów** (zaobserwowane
  2026-10-02: ~30 `curl` pod rząd do `/wp-content/uploads/...` w kilka sekund wywołało challenge —
  każdy kolejny `curl`, nawet pojedynczy, dostawał `200 OK` ale `Content-Type: text/html` z treścią
  "Proszę czekać…"/`setTimeout(reload, 5000)` zamiast pliku, przez kilka minut, nawet z `Referer`).
  **Plain `curl` nie potrafi przejść tego wyzwania** (wymaga wykonania JS). Rozwiązanie, które
  zadziałało: (1) poczekać kilka minut, (2) w międzyczasie `browser_navigate` na dowolną stronę
  `firmakora.pl` w Playwright dwa razy pod rząd (pierwszy load pokazuje "Proszę czekać…", drugi
  przechodzi) — to nie jest konieczne dla samego odblokowania (blokada mija sama po czasie), ale
  potwierdza że jest już po drugiej stronie, zanim znów odpalisz burst `curl`. **Zapobiegawczo**: rób
  `sleep 0.5-1` między kolejnymi `curl` w tej samej partii pobierania (6 zdjęć na model × kilka modeli
  pod rząd już wystarczyło, żeby to wywołać), nie pobieraj wszystkich ~30-40 zdjęć wielu modeli w
  jednej nieprzerwanej serii. Jeśli i tak się zablokuje, sprawdź `curl -I` na jeden URL: `200` +
  `Content-Type: text/html` zamiast `image/*` to ten właśnie challenge, nie błąd adresu.
  woodendreamhouse.com tego problemu nie miał (różni dostawcy/konfiguracja Cloudflare).
- WebFetch na liście zdjęć galerii bywa niekompletny/myli miniatury z pełnymi zdjęciami — zawsze
  pobierz kandydatów, otwórz 2-3 losowe lokalnie (`Read` na pliku obrazu) i potwierdź wzrokiem że to
  realne zdjęcia produktowe, nie ikony/swatche koloru, zanim wgrasz cokolwiek do R2.

---

## Krok 0 — Wczytaj znany stan

Przeczytaj/odpytaj równolegle:
- `lib/product-technical-specs.ts` — `saunaSpecsShape` (linie ok. 127-138): `claddingMaterial`,
  `interiorWoodType`, `benchMaterial`, `insulationType`, `glazingType`, `seatingCapacity` (number),
  `hasChangingArea` (boolean), `changingAreaDescription` (string, tylko gdy `hasChangingArea=true`),
  `electricalRequirement`. **Piec, kolor impregnacji, panele podczerwieni NIE są tu polami** — zawsze
  `product_option_group`/`product_option`/`product_option_group_assignment`. `foundationType` i
  wymiary zewnętrzne też nie są tu polami — żyją w `product.foundationOptions`/`externalDimensions`.
- `run_sql` na **`bold-tree-78265613`** (dev — nie prod): `select id, name, slug, technical_specs,
  price_min_cents, external_dimensions, foundation_options from product where family =
  'spa-modulowe' and spa_subcategory = 'sauna'` — buduj zbiór znanych `slug`/`id`, żeby odróżnić
  "nowy model" od "model już w bazie, ewentualna aktualizacja".
- Istniejące grupy opcji per producent (`run_sql`: `select og.id, og.name, o.id, o.label, o.price_cents,
  o.price_on_request, o.is_default from product_option_group og join product_option o on
  o.group_id = og.id where og.producer_id = '<id>'`):
  - **Kora** (`producer_id = 'b068fb3a-2b77-4cfa-8fe3-f2e81aa3b263'`): grupy "Piec" (**12 opcji**
    naprawione 2026-10-02 — wcześniej 7 generycznych etykiet z pierwszego importu Relax 550, np.
    "Tulikivi (elektryczny)", nie odpowiadały realnej liście na stronie; każdy z 6 modeli Kory,
    włącznie z Relax 550, pokazuje identyczną listę 8 pieców elektrycznych + 4 na drewno z pełną nazwą
    modelu, np. "Tulikivi Tuisku Rigata 9kW (SPA Control wifi + kamienie)" — jeśli znów zobaczysz
    rozbieżność między stroną a bazą, to prawdopodobnie sygnał że Kora zmieniła ofertę pieców, nie że
    dawny zapis był poprawny), "Kolor impregnacji drewna" (6 opcji w bazie: Naturalna/Jasny
    dab/Orzech/Antracyt/Palisander/Heban — strona pokazuje też "Brak" jako placeholder wyboru w
    dropdownie, to nie jest siódma realna opcja, nie dodawaj jej), "Panele podczerwieni" (2 opcje, bez
    paneli w cenie / 350W na zapytanie). Sprawdź na stronie każdego nowego modelu, czy oferuje
    dokładnie te same trzy grupy, zanim założysz że pasują 1:1 — jeśli tak, **reużyj istniejące
    `group_id` przez `product_option_group_assignment`, nigdy nie twórz nowych wierszy
    `product_option_group`/`product_option`** (ten sam wzorzec co Dampol,
    `[[project_dampol_full_import_2026_10_02]]`).
  - **Wooden Dream House** (`producer_id = '24e54122-9cf0-470b-96af-6e97e5cfcdf5'`): grupy "Pakiet
    swietlny DreamLight", "Sterowanie WiFi", "System audio" (po 2 opcje, bazowa w cenie/rozszerzona na
    zapytanie). Te były przypisane do Qube — zweryfikuj czy Q-PREMIUM faktycznie je oferuje (patrz
    uwaga w sekcji faktów wyżej, może nie mieć żadnych zdefiniowanych grup).
- `producer` (`run_sql` na dev): Kora ma dziś placeholder NIP `IMPORT-KORA-TBD` — jeśli strona kiedyś
  ujawni prawdziwy NIP, zaktualizuj przy okazji. WDH ma już prawdziwy NIP `7671528329` ze stopki,
  nie nadpisuj go bez nowego dowodu.
- `owner_user_id` do `document`: reużyj **`5fa72c81-9af1-4f62-9e63-2b736561ed3b`** (ta sama wartość co
  Relax 550/Qube i kilku innych zaimportowanych producentów) — `users` jest nieczytelne przez Neon
  MCP (auto-mode classifier blokuje "Production Reads"), nie próbuj tego czytać ani insertować nowego
  wiersza `users`, patrz `[[project_dampol_full_import_2026_10_02]]`.

---

## Krok 1 — Zbierz dane per model

Dla każdego nowego/zmienionego modelu zbierz (WebFetch dla Kory, Playwright dla stron produktowych
WDH jeśli WebFetch coś pominie):

**Pola `saunaSpecsShape`** (patrz Krok 0) — każde pole albo wartość, albo jawnie zaznacz czego strona
nie podaje (nie zgaduj; `insulationType`/`glazingType` zwykle są opisowym zdaniem ze strony, nie
enumem — to pole string, więc przepisz treść wprost).

**Pola produktu poza `technicalSpecs`**: cena (netto PLN, cena z karty — jeśli "od X zł", to jest
dolna granica), `externalDimensions` (`"<szer> x <dł> x <wys> cm"`, ten sam format co Relax
550/Qube), `foundationOptions` (zdanie o przygotowaniu podłoża — jeśli strona nic nie mówi inaczej niż
dla innych modeli, sprawdź dosłowną treść, nie kopiuj automatycznie z sąsiedniego modelu).

**Dopasowanie grup opcji**: dla każdego modelu sprawdź czy strona pokazuje te same selektory
(piec/kolor/panele dla Kory; DreamLight/WiFi/audio dla WDH) z tymi samymi etykietami co istniejące
`product_option`. Jeśli tak — zanotuj do przypisania przez `product_option_group_assignment`. Jeśli
model pokazuje selektor z inną listą etykiet (nowa opcja, której nie ma w istniejącej grupie) —
zatrzymaj się i zgłoś to użytkownikowi zamiast cicho dodawać nowy wiersz `product_option` do
współdzielonej grupy (to zmieniłoby opcje widoczne też na już opublikowanych modelach).

**Zdjęcia**: zbierz realne `src` z galerii/karuzeli produktu (pełne adresy, nie miniatury jeśli da się
odróżnić `-150x150`/`-300x300` sufiks WordPressa od oryginału — oryginał zwykle nie ma sufiksu
wymiarów). Domyślnie **5-6 zdjęć na model** (decyzja użytkownika, 2026-10-02) — to wartość domyślna,
nie sztywna reguła: jeśli użytkownik przy konkretnym uruchomieniu poprosi o inną liczbę, użyj jej.

Zapisz per model notatki robocze do `tmp/sauna-import/<producer>-<slug>.json` (ten katalog jest w
`.gitignore` przez `/tmp/`) — surowe ustalenia, żeby nie trzeba było scrapować dwa razy jeśli zapis do
bazy się przerwie w połowie.

---

## Krok 2 — Konwersja ceny PLN → EUR

Ten sam przepis co `[[project_dampol_full_import_2026_10_02]]` / scrape-steel-house Krok 5:
1. `WebFetch("https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json", ...)` — zanotuj kurs i
   `effectiveDate` bieżącego dnia uruchomienia (nie zakładaj, że kurs z poprzedniego importu Kory/WDH
   nadal obowiązuje — każdy batch liczy własny kurs dnia).
2. `eur = Math.round(pln_netto / kurs)`, `price_min_cents = eur * 100`, `currency = 'EUR'`.

---

## Krok 3 — Zdjęcia: pobieranie i wgrywanie do R2

1. Pobierz kandydatów do `tmp/sauna-import/images/<producer>-<slug>/` przez `curl -A "<UA
   przeglądarki>" -L -o <nazwa>.<ext> <url>` (działa bez tokenu, patrz sekcja faktów). Nazwij pliki
   opisowo: `<producer>-<slug>-01.jpg`, `...-02.jpg`, itd.
2. Zweryfikuj wzrokiem 2-3 losowe pliki (`Read` na obrazie) — odrzuć cokolwiek co nie jest realnym
   zdjęciem produktu (ikona, swatch koloru, logo).
3. Skopiuj jednorazowy skrypt uploadu (wzór: ten sam co użyty 2026-10-02 dla Relax 550/Qube,
   replikuje `lib/storage/r2-client.ts`'s `uploadObject`/`buildR2Key`) do `tmp/sauna-import/upload.mjs`
   **wewnątrz repo** (skrypt poza repo nie rozwiąże `node_modules`/`@aws-sdk/client-s3`) i uruchom
   `node tmp/sauna-import/upload.mjs` z katalogu repo — czyta `.env.local` ręcznie (brak `dotenv`),
   wypisuje JSON z `r2Key`/`publicUrl` per plik na stdout.
4. Usuń `tmp/sauna-import/upload.mjs` po użyciu (gitignored, ale sprzątaj mimo to, ten sam wzorzec co
   2026-10-02).

---

## Krok 4 — Zapis do bazy (Neon MCP, projekt `bold-tree-78265613` = `modularhub-dev`, **nigdy prod**)

1. Dla **nowego** modelu: `INSERT INTO product (producer_id, status, name, family, spa_subcategory,
   slug, technical_specs, external_dimensions, foundation_options, price_min_cents, currency, ...)`
   — `status = 'published'` tylko gdy `saunaSpecsShape` jest kompletny (wszystkie pola wymagane
   wypełnione), inaczej `'draft'` i jawnie zgłoś czego brakuje.
2. Dla **istniejącego** modelu (odświeżenie): `UPDATE product SET ...` tylko na polach, które faktycznie
   się zmieniły — pokaż starą→nową wartość w raporcie końcowym (Krok 5), nie milcz.
3. `product_option_group_assignment (product_id, group_id)` — jeden wiersz per reużyta grupa, per
   nowy produkt. Nigdy nowy `product_option_group`/`product_option` bez jawnej zgody użytkownika
   (patrz Krok 1).
4. `document` — jeden wiersz per wgrane zdjęcie, `purpose = 'product_photo'`, pierwszy
   `is_cover = true` reszta `false`, `sort_order` rosnąco, `owner_user_id =
   '5fa72c81-9af1-4f62-9e63-2b736561ed3b'`.
5. **Przed realnym zapisem na dev**: wygeneruj pełen SQL, zweryfikuj go na jednorazowej branchy Neon
   (`create_branch` z `bold-tree-78265613`, `run_sql` na tej branchy, `delete_branch` po
   potwierdzeniu) — ten sam krok złapał prawdziwy błąd transkrypcji przy imporcie Dampol
   (`[[project_dampol_full_import_2026_10_02]]`), nie pomijaj go dla "tylko kilku wierszy".
6. Po zapisie na dev zweryfikuj odczytem (`run_sql`) i jednym zrzutem przeglądarki (Playwright,
   `http://localhost:3000/pl/sauna/<slug>` jeśli `next dev` już działa — sprawdź najpierw czy port
   3000 odpowiada zanim uruchomisz drugi serwer, dwa `next dev` na tym samym repo się kłócą o lock
   plik, jak 2026-10-02).
7. **Nigdy nie pisz do `spring-rain-58383710` (prod) w ramach tego skilla** — to osobny, jawnie
   proszony krok, dokładnie jak spec 0061 Build plan zadanie 10 ("dopiero po potwierdzeniu
   poprawności na dev, powtórzyć zapis na prod").

---

## Krok 5 — Raport dla użytkownika

Nigdy nie kończ ciszą. Podsumowanie musi zawierać:
- Modele znalezione na obu stronach vs już znane w bazie (nowe wypisz jawnie, z adresem URL).
- Per model: co zapisano (nowy produkt / zaktualizowane pola, stara→nowa wartość), ile zdjęć wgrano,
  które grupy opcji przypisano (reużyte, nigdy nowe bez zgody).
- Jawna lista "wymaga Twojej decyzji": nowa opcja nienależąca do istniejącej grupy, model bez jasnej
  ceny/wymiarów, niezgodność z dotychczasowym wzorcem rodziny.
- Jawne przypomnienie: zapisano tylko na **dev**; prod nietknięty, migracje/`lib/data/fixtures`/
  `public/images` nietknięte.

---

## Zasady i ograniczenia

- **Nigdy nie pisz do prod** (`spring-rain-58383710`) z tego skilla — zawsze dev
  (`bold-tree-78265613`), prod jest osobnym, jawnie proszonym krokiem.
- **Nigdy nie zgaduj wartości** (cena, wymiary, specyfikacja) — jeśli strona nie podaje czegoś jasno,
  zostaw `null`/pomiń i zgłoś w Kroku 5, nie interpoluj z innego modelu tej samej rodziny.
- **Nigdy nie twórz nowych `product_option_group`/`product_option`** bez jawnej zgody użytkownika —
  domyślnie zawsze reużywaj istniejące trzy grupy per producenta (Krok 0).
- **Nigdy nie ruszaj** `lib/data/fixtures/*`, `public/images/*`, migracji (`db:migrate`, `drizzle/`).
- Prawa do zdjęć Kory/WDH są już potwierdzone na stałe (patrz góra pliku) — nie pytaj ponownie dla
  kolejnych modeli tych dwóch producentów, ale **każdy nowy, trzeci producent wymaga własnego,
  świeżego potwierdzenia**.
- Jeśli współdzielona przeglądarka Playwright jest zajęta — zatrzymaj się i zgłoś, nie zabijaj procesu
  (ten sam wzorzec co scrape-steel-house).
