# 0081. Letniskowo: katalog 17 modeli, opcje płatne, stylistyki wnętrz i sekcje klienta

**Date**: 2026-11-04
**Status**: Accepted

## Summary

Letniskowo to ważny klient (producent całorocznych domów mobilnych z Białegostoku, ponad 2000 dostarczonych domów). Ten spec wprowadza jego 17 modeli do katalogu z cenami z oferty i opcjami płatnymi z cennika, a do tego dodaje trzy nowe rzeczy na stronie produktu: wybór stylistyki wnętrza (pięć wzorników wykończenia), sekcję „Sposób współpracy” i sekcję zastosowań komercyjnych. Wybrane opcje i stylistyka trafiają teraz też do zapytania, czego dziś nie robi nawet konfigurator opcji. Dane wchodzą do bazy deweloperskiej skryptem, a produkcja to osobny, późniejszy krok.

## Requirements

**User stories**:
- Jako klient przeglądający domy Letniskowo chcę zobaczyć każdy z 17 modeli z ceną, rzutem, zdjęciami i danymi technicznymi, żeby porównać je bez dzwonienia do producenta.
- Jako klient chcę wybrać opcje płatne i stylistykę wnętrza i zobaczyć, ile to kosztuje, a potem wysłać zapytanie, w którym producent widzi dokładnie moją konfigurację.
- Jako klient biznesowy (hotel, glamping, kwatery pracownicze, salon, biuro) chcę zobaczyć, do czego te domy się nadają, i jednym kliknięciem wysłać zapytanie hurtowe.
- Jako administrator chcę wprowadzić katalog Letniskowo skryptem i wiedzieć, które dane są niepewne i wymagają potwierdzenia u klienta.

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: W bazie deweloperskiej istnieje producent Letniskowo z kontem technicznym (e mail na domenie `.invalid`, jak przy MKB) i NIP z rejestru potwierdzonym przez Stanisława przed zapisem. `producer.description` nie zawiera e maila, telefonu ani adresu www. Strona producenta pokazuje certyfikaty ISO 9001 i ISO 14001 (ważne od 08.12.2025 do 07.12.2028).
- **AC-2**: Opublikowanych jest 17 produktów rodziny `dom`, kategorii `mobilny`, każdy z jednym domyślnym wariantem (`completionStandard = 'pod-klucz'`). Cena to wartość z oferty w centach EUR netto (tabela w Feature design). Dane techniczne (wymiary, powierzchnia, pojemność, izolacja, pomieszczenia) pochodzą z kart modeli. Przy sprzeczności dokumentów oferta wygrywa cenę, karta wszystko inne. Każdy model ma rzut i zdjęcia lub rendery z karty, wgrane do R2.
- **AC-3**: Wszystkie teksty klienta (produkty, opcje, stylistyki, treść producenta) mają tłumaczenia en, de i nl. `npm run check:translations` zwraca zero luk, łącznie z nowymi tabelami stylistyk i treści producenta.
- **AC-4**: Opcje płatne z cennika opcji są zapisane w istniejących tabelach specu 0059 (grupy `single` dla wyborów wykluczających się, `multi` dla niezależnych dodatków). Każdy model dostaje tylko opcje pasujące do jego linii (Comfort lub Premium) i klasy rozmiaru wg reguł z Feature design. Cena na stronie liczy się na żywo bez zmian w kodzie konfiguratora.
- **AC-5**: Izolacja: Comfort poza Palermo ma standardowo 13 cm PUR i opcję 18 cm (dopłata wg klasy rozmiaru), z wyjątkiem Zen, Bali i Malibu (tylko 13 cm, bez opcji). Palermo i cała linia Premium mają 18 cm w standardzie, bez opcji grubości.
- **AC-6**: Ograniczenia „tylko FF”, „tylko MP”, „z deLux” i „bez deLux” są wyłącznie w nazwie opcji, dokładnie jak w cenniku. Konfigurator nie blokuje żadnej kombinacji.
- **AC-7**: Vario 2BR i 3BR dostają wyłącznie opcje niezależne od metrażu i od linii. Opcje zależne od metrażu lub linii Comfort/Premium nie są do nich przypisane.
- **AC-8**: Strona `/project/[slug]` produktu z przypisanymi stylistykami pokazuje sekcję „Wykończenie wnętrza” z pięcioma stylistykami. Wybór idzie parametrem adresu `stylistyka` (id stylistyki), nie zmienia ceny i da się go skopiować w linku. Gdy w adresie nie ma parametru, podgląd pokazuje pierwszą stylistykę wg `sort_order`, ale nic nie jest uznane za wybór klienta. Nieznane lub nieprzypisane id jest ignorowane bez błędu.
- **AC-9**: Stylistyka pokazuje trzy wizualizacje (kuchnia, sypialnia, łazienka) i listę materiałów pogrupowaną w strefy (ściany i sufity, podłoga, meble, łazienka, kuchnia, łóżka i tekstylia) z nazwą i kodem. Kafelki próbników są małymi plikami WebP z R2 renderowanymi zwykłym `<img>` (bez `next/image` i bez optymalizacji Vercela), ładowanymi wyłącznie dla aktualnie otwartej stylistyki.
- **AC-10**: Produkt bez przypisanych stylistyk i producent bez treści (inni producenci) renderują się dokładnie jak dziś, bez regresji.
- **AC-11**: Sekcja „Sposób współpracy” (5 kroków) i sekcja zastosowań komercyjnych (8 pozycji) renderują się z treści producenta zapisanej w bazie, w czterech językach z fallbackiem do polskiego tekstu źródłowego. Sekcja bez treści w ogóle się nie renderuje. Sekcja zastosowań ma przycisk zapytania hurtowego (istniejący `BulkProductInquiryModal`).
- **AC-12**: Link „zapytanie” na stronie produktu niesie wariant, opcje i stylistykę. Zapytanie z jednego produktu zapisuje w `inquiry_item.configuration_snapshot` migawkę zbudowaną na serwerze z identyfikatorów (nazwy i ceny z bazy, nigdy tekst od klienta). Nieznane, usunięte lub niepasujące do produktu identyfikatory są pomijane. Opcja „cena na zapytanie” daje sumę „od”. Migawkę widzą te same osoby, które dziś widzą produkty zapytania (administrator, producent, klient).
- **AC-13**: Folder `_docs/letniskowo/` jest w `.gitignore`. Dane osobowe handlowca z oferty (imię, e mail, telefon) nie trafiają do bazy, kodu, skryptów ani tego speca.
- **AC-14**: Zapisy idą wyłącznie do bazy deweloperskiej (`bold-tree-78265613`). Migracja jest sprawdzona na tymczasowej gałęzi Neon przed zastosowaniem. Przeniesienie na produkcję to osobny, jawnie zatwierdzony krok z plikiem SQL (`drizzle/_promote_*`).
- **AC-15**: Każda pozycja, którą trzeba potwierdzić u klienta, jest oznaczona w skrypcie importu i wymieniona w Follow up. Żadna niepewna wartość nie jest przedstawiona jako pewna na stronie.

## Decision

**Chosen option**: katalog producenta przypisywany do produktów, na istniejącym modelu opcji (spec 0059), plus trzy nowe elementy na tym samym wzorcu.

Dane Letniskowo wchodzą jako zwykły import katalogu na istniejące tabele. Stylistyki wnętrz to nowy katalog producenta przypisywany do produktów (jak grupy opcji). „Sposób współpracy” i zastosowania komercyjne to jedna tabela treści producenta z tłumaczeniami. Wybrana konfiguracja trafia do zapytania jako migawka w jednej nowej kolumnie.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `product-family-page-design` (bespoke, `.claude/skills/product-family-page-design/`)

Pełne uzasadnienie, odrzucone opcje i inwentarz danych (modele, ceny, opcje, pytania do klienta): [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Tabela | Klucz | Klucze obce | Kluczowe pola |
|---|---|---|---|
| `producer_interior_style` | id uuid | `producer_id` → producer | name NOT NULL, description NULL, sort_order, deleted_at |
| `producer_interior_style_translation` | id uuid | `style_id` → style | locale (en, nl, de) NOT NULL, name, description; unikalne (style_id, locale) |
| `producer_interior_style_image` | id uuid | `style_id` → style | url NOT NULL (publiczny R2), alt NULL, sort_order |
| `producer_interior_style_material` | id uuid | `style_id` → style | zone NOT NULL (CHECK: `walls_ceilings`, `flooring`, `built_in_furniture`, `bathroom`, `kitchen`, `beds_textiles`), name NOT NULL, code NULL, swatch_url NULL, sort_order |
| `product_interior_style_assignment` | id uuid | `product_id` → product, `style_id` → style | created_at; unikalne (product_id, style_id) |
| `producer_content_item` | id uuid | `producer_id` → producer | kind NOT NULL (CHECK: `collaboration_step`, `commercial_use`), title NOT NULL, body NULL, sort_order NOT NULL, deleted_at |
| `producer_content_item_translation` | id uuid | `item_id` → content item | locale NOT NULL, title, body; unikalne (item_id, locale) |
| `inquiry_item.configuration_snapshot` | kolumna | | jsonb NULL |

Relacje: producent 1:N stylistyki; stylistyka 1:N obrazy i 1:N materiały; produkt N:M stylistyka (przez przypisanie); producent 1:N element treści 1:N tłumaczenia. Nazwy materiałów to nazwy własne (bez tłumaczenia), a nazwy stref idą przez `messages/*.json`.

Bez zmian schematu: producent, konto techniczne, 17 produktów, warianty, ceny, grupy opcji i ich przypisania, tłumaczenia produktów i opcji (spec 0067), certyfikaty, zdjęcia.

**Kształt migawki** (`inquiry_item.configuration_snapshot`, jsonb, polskie nazwy źródłowe):
`{ variantId, variantLabel, options: [{ optionId, groupName, label, priceCents | null, priceOnRequest }], style: { styleId, name } | null, totalPriceCents | null, currency, capturedAt }`.

**Reguły przypisania opcji do modeli** (tabela klas w rationale.md, tu zasada):
- Klasa rozmiaru liczona z powierzchni z karty (`Area`, czyli zabudowa), osobno dla każdej rodziny opcji, jako najmniejszy próg z cennika, który jest większy lub równy powierzchni. Progi: podwozie mobilne 35, 50, 70; ogrzewanie podłogowe i panele winylowe 40, 50, 70; izolacja PUR 18 cm 50, 70.
- Opcje zależne od klasy dzielą się na osobne grupy o tej samej nazwie (np. dwie grupy „Ogrzewanie podłogowe”, jedna na klasę) przypisane tylko do pasujących modeli.
- Opcje oznaczone w cenniku „Comfort” idą do 11 modeli Comfort, „Premium” do 4 modeli Premium (bez Vario). Opcje bez linii i bez metrażu (gniazda, alarm, kamery, kran, podlicznik itd.) idą do wszystkich modeli, z wyjątkiem wymienionych niżej.
- Opcja, której funkcja jest już w standardzie karty modelu, nie jest do niego przypisywana. Według kart: Premium i Vario mają ogrzewanie podłogowe i klimatyzację w salonie, Vario ma też rekuperację, przygotowanie pod fotowoltaikę, pralko suszarkę i piekarnik z mikrofalą, a Premium ma łazienkę we Fibo. Comfort ma tylko grzejniki ścienne, wentylację wyciągową i łazienkę z PVC. Skrypt wyciąga te cechy z kart i pomija duplikaty, a pełna macierz jest w rationale.md.
- Opcje dotyczące pokoju z łóżkiem pojedynczym i łóżka piętrowego idą tylko do modeli, których karta ma pokój (Bremen, Zen i Sky Light go nie mają).
- Modele na granicy progu (Nicea 50,95 m² dla podwozia, ogrzewania, paneli winylowych, izolacji i podwyższenia ściany, oraz Sky Light 40,34 m² tylko dla paneli winylowych) wpadają do wyższej klasy i są oznaczone jako do potwierdzenia (AC-15).
- Pozycja „Individual design 2 857” z cennika opcji nie wchodzi. Wchodzi „Projekt indywidualny (custom design)” za 2 900 € z głównego cennika, jako opcja `multi` w grupie konstrukcji.

**Ceny modeli** (oferta, EUR netto, w centach × 100):

| Linia | Model | Cena € | Powierzchnia z karty m² |
|---|---|---|---|
| Comfort | Zen | 46 100 | 35 |
| Comfort | Bali | 43 900 | 34,88 |
| Comfort | Malibu | 43 900 | 34,88 |
| Comfort | Bremen | 49 100 | 39,98 |
| Comfort | Palermo | 49 800 | 50 |
| Comfort | Riviera | 49 800 | 50 |
| Comfort | Nicea | 51 900 | 50,95 |
| Comfort | Elba | 57 700 | 55 |
| Comfort | Malta | 60 990 | 59,05 |
| Comfort | Madera | 60 990 | 59,05 |
| Comfort | Sylt | 62 300 | 62,28 |
| Premium | Sky Light | 71 428 | 40,34 |
| Premium | Silver Moon | 84 523 | 57 |
| Premium | Black Stone | 84 523 | 57,75 |
| Premium | Moon Light | 95 238 | 57,75 |
| Premium | Vario 3BR | 156 900 | 116,81 |
| Premium | Vario 2BR | 156 900 | 116,81 |

**Interfejs i dostęp do danych** (bez nowych endpointów HTTP, tylko odczyt serwerowy i nawigacja linkami):

| Funkcja | Wejście | Wyjście | Dostęp | Błędy |
|---|---|---|---|---|
| `getInteriorStylesForProduct(productId, locale)` w `lib/db/queries.ts` | productId, locale | stylistyki z obrazami i materiałami wg `sort_order`, bez usuniętych, z tłumaczeniem lub polskim fallbackiem | publiczny | pusta lista, gdy brak przypisań |
| `getProducerContentItems(producerId, kind, locale)` | producerId, kind, locale | elementy wg `sort_order`, bez usuniętych, z fallbackiem | publiczny | pusta lista, gdy producent nie ma treści |
| `buildConfigurationSnapshot(productId, variantId, optionIds, styleId)` w `lib/` | id z adresu | obiekt migawki albo `null` | serwer (akcja zapytania) | pomija każdy niepasujący id, nigdy nie rzuca |

Parametry adresu strony produktu: `wariant` i `opcje` (istnieją), `stylistyka` (nowy, jedno id). Link „zapytanie” niesie wszystkie trzy. Strona `/inquiry` przekazuje je do akcji wysyłającej zapytanie tylko wtedy, gdy w adresie jest dokładnie jeden produkt. Przy kilku produktach (lista porównawcza) migawki nie tworzymy.

**Key invariants**:
- Najwyżej jedno przypisanie `(product_id, style_id)`. Stylistykę wolno przypisać tylko do produktu tego samego producenta (`style.producer_id = product.producer_id`), sprawdzane w skrypcie importu (baza tego nie wymusza, ten sam wzorzec i ta sama luka co w specu 0059).
- Stylistyka nigdy nie zmienia ceny. `buildConfigurationSnapshot` sumuje tylko wariant i opcje.
- Migawka powstaje wyłącznie na serwerze z identyfikatorów. Tekst z adresu nie jest nigdzie zapisywany.
- Kolejność obrazów i materiałów wynika z `sort_order`, a obraz o najniższym `sort_order` jest głównym obrazem stylistyki.
- Klimatyzacja ma dwa zestawy: pełne instalacje 1, 2 i 3 multisplit (łączne ceny, dla Comfort bez klimatyzacji) oraz przyrosty „+1” i „+2” (dla Premium z klimatyzacją w standardzie). Ceny w cenniku się zgadzają (1 248 + 1 747 = 2 995, 1 248 + 3 245 = 4 493).

**Security model**:
Odczyt publiczny, tak jak dzisiejsze dane produktu. Brak nowej ścieżki zapisu w aplikacji: stylistyki, treść producenta i opcje wchodzą skryptem importu do dev, a na produkcję plikiem SQL uruchamianym ręcznie (ta sama zasada co spec 0059 i 0067). Migawka w zapytaniu dziedziczy dostęp do `inquiry_item` (`lib/cases/access.ts`), niczego nie poszerza. Nie jest to dane osobowe klienta ponad to, co zapytanie i tak zawiera. Dane osobowe handlowca producenta nie wchodzą nigdzie (AC-13).

**Configuration required**:
Brak nowych zmiennych. Używane są istniejące `R2_*` (bucket publiczny, spec 0031). Wgrywanie na produkcyjny R2 wymaga poświadczeń produkcyjnych, których brak blokował wcześniejszy import (Perfect Cube), więc przed promocją trzeba to sprawdzić.

**Critical test scenarios** (każdy mapuje się na kryterium):
- Happy path: klient otwiera Bali (bez opcji grubości izolacji), wybiera klimatyzację 1 split i stylistykę Calm Stone, cena rośnie o 1 248 €, a link i zapytanie niosą opcję i stylistykę, weryfikuje **AC-4**, **AC-5**, **AC-8**, **AC-12**.
- Happy path: otwarcie Palermo nie pokazuje opcji grubości izolacji, a Elba pokazuje 18 cm z dopłatą klasy 70, weryfikuje **AC-5**.
- Failure case: adres z nieznanym `stylistyka`, usuniętym `opcje` lub id z innego produktu, strona renderuje się bez błędu, a migawka pomija te id, weryfikuje **AC-8**, **AC-12**.
- Brak regresji: produkt innego producenta (np. Dampol) renderuje się identycznie, bez sekcji stylistyk i bez sekcji treści, weryfikuje **AC-10**.
- Język: strona w de pokazuje tłumaczenia stylistyk i 5 kroków współpracy, brakujące tłumaczenie spada do polskiego, weryfikuje **AC-3**, **AC-11**.
- Wydajność: karta stylistyki nie wywołuje żadnego żądania `/_next/image` dla kafelków, weryfikuje **AC-9**.
- Prywatność: żaden plik w repozytorium, żaden wiersz w bazie ani skrypt nie zawiera e maila ani telefonu handlowca, weryfikuje **AC-13**.

## Build plan

Podejście: Tracer Bullet. Najpierw cienka nitka przez wszystkie warstwy dla jednego modelu (Bali), potem pogrubianie. `AGENTS.md` wymienia Facade jako podejście całego projektu, ale to etap prototypu. Ten spec jest produkcyjny, więc dane i migracja idą pierwsze.

1. [x] Migracja (`drizzle/0070_freezing_gunslinger.sql`, sprawdzona na gałęzi tymczasowej, zastosowana na dev 2026-11-04): siedem tabel i kolumna `configuration_snapshot`, z CHECK na `zone` i `kind` oraz unikalnymi indeksami. Najpierw na tymczasowej gałęzi Neon, potem na dev, satisfies **AC-8**, **AC-11**, **AC-12**, **AC-14**.
2. [x] (cienka nitka Bali, dev) Cienka nitka: skrypt `npm run import:letniskowo` (szkielet wg `scripts/import-mkb-catalog.ts`) tworzy konto techniczne, producenta (NIP roboczy `CATALOG-LETNISKOWO`, prawdziwy potwierdza Stanisław przed produkcją) i jeden model (Bali) z wariantem, ceną, parametrami, zdjęciami w R2 i jedną grupą opcji. Strona `/project/[slug]` renderuje się na dev, satisfies **AC-1**, **AC-2**, **AC-4**.
3. [x] (17 modeli, zdjęcia w R2 dev) Pełny import 17 modeli: parsowanie kart (`pdftotext`), wyciąganie zdjęć i rzutów (`pdfimages`), wgranie do R2, tłumaczenia en, de, nl. Karta wygrywa dane techniczne, oferta cenę. Żadne dane handlowca nie trafiają do skryptu, bazy ani opisu producenta (folder `_docs/letniskowo/` jest już w `.gitignore`), satisfies **AC-2**, **AC-3**, **AC-13**.
4. [x] (41 grup, 101 opcji, reguły w `scripts/data/letniskowo-options.ts`) Katalog opcji: tabela reguł (klasy rozmiaru, linia, FF i MP) i dane z inwentarza w `rationale.md` zamieniane na grupy, opcje i przypisania. Ręczna kontrola sum dla kilku modeli względem PDF, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**.
5. [x] (ISO 9001 i 14001 w `producer_certification`) Certyfikaty ISO 9001 i 14001 w istniejącej strukturze certyfikatów producenta (schemat sprawdzić przy budowie, spec 0065), satisfies **AC-1**.
6. [x] (80 kafelków WebP, 5 stylistyk, 85 przypisań) Stylistyki: skrypt wycinania kafelków z pięciu PDF Fitout (stały układ, `pdftoppm` i przycinanie), WebP 96 px, deduplikacja po kodzie materiału, wgranie do R2, import stylistyk, obrazów, materiałów i przypisań do 17 modeli, satisfies **AC-8**, **AC-9**.
7. [x] (sekcja `ProjectInteriorStyles`, parametr `stylistyka`, pozycja w nawigacji, klucze w 4 językach) Strona produktu: komponent sekcji „Wykończenie wnętrza”, parametr `stylistyka`, pozycja w `ProjectSectionNav`, klucze w `messages/pl|en|de|nl.json` (po zmianie zrestartować serwer dev, patrz AGENTS.md), satisfies **AC-8**, **AC-9**, **AC-10**.
8. [x] (import 5 kroków i 8 zastosowań, `ProducerContentSections`, przycisk hurtowy) Treść producenta: import 5 kroków współpracy i 8 zastosowań (tekst wg oferty, bez czasów i obietnic, których oferta nie zawiera), komponenty sekcji i przycisk zapytania hurtowego, satisfies **AC-11**.
9. [x] (`lib/configuration-snapshot.ts`, przekazanie przez `/inquiry`, zapis kolumny, blok „Konfiguracja” w widoku sprawy klienta i administratora; widok producenta czeka na ekran producenta w nowym przepływie, patrz Follow up) Migawka konfiguracji: `buildConfigurationSnapshot`, przekazanie parametrów przez `/inquiry` do akcji zapytania, zapis kolumny i blok „Konfiguracja” we wszystkich widokach pokazujących produkty zapytania (admin, producent, klient; znaleźć przez `inquiryItem`), satisfies **AC-12**.
10. [x] (`check:translations` obejmuje nowe tabele (zero luk), 24 testy reguł, 6 testów migawki, 9 testów komponentów, 3 testy e2e `e2e/letniskowo-0081.spec.ts`) `npm run check:translations` rozszerzone o nowe tabele. Testy jednostkowe (klasy rozmiaru, przypisanie opcji do modeli, migawka, ignorowanie złych id), komponentowe i jeden e2e (konfiguracja do zapytania), satisfies **AC-3**, **AC-12**, **AC-15**.
11. [x] (pliki w `drizzle/_promote_letniskowo_to_prod/` (00 do 04), wygenerowane z dev przez `scripts/export-letniskowo-prod-sql.ts`, niewykonane) Plik SQL promocji na produkcję w `drizzle/_promote_letniskowo.sql` przygotowany, ale niewykonany. Wykonanie tylko na wyraźne polecenie po przeglądzie dev, satisfies **AC-14**.

## Consequences

**Positive**:
- Ważny klient dostaje pełny katalog z konfiguratorem i trzema sekcjami, które odróżniają jego stronę od zwykłego importu.
- Stylistyki, treść producenta i migawka zapytania są ogólne: każdy kolejny producent z wzornikami wykończenia albo z opisem współpracy użyje tych samych tabel i komponentów.
- Naprawiamy realną lukę: wybrane opcje (spec 0059) wreszcie docierają do zapytania.
- Kafelki nie zjadają limitu optymalizacji obrazów Vercela, który już raz się wyczerpał.

**Negative / tradeoffs**:
- Siedem nowych tabel i kolumna to największy schemat dla jednego klienta w ostatnim czasie. Tłumaczenia wymagają rozszerzenia skryptu `check:translations`.
- Około 77 opcji rozbitych na grupy per klasa rozmiaru to dużo wierszy i duża szansa na pomyłkę w przypisaniu. Ratują ją testy reguł i ręczna kontrola.
- Brak blokad między opcjami: klient może wybrać „podwozie mobilne” razem z „podpory tylko FF”. Ostrzega go tylko nazwa. To świadomy wybór na teraz.
- Kilka danych jest niepewnych (deLux, klasy graniczne, niejasne nazwy w cenniku) i musi wrócić do klienta. Do tego czasu strona pokazuje je tak, jak są w cenniku.
- Migawka istnieje tylko dla zapytania z jednego produktu. Zapytanie hurtowe (`BulkProductInquiryModal`) jej nie dostaje.

**Neutral**:
- Dane techniczne trzeba mapować na istniejące pola `technicalSpecs` rodziny `dom`. Co się nie mieści, trafia do opisu produktu.
- Parametry izolacji z specu 0075 (liczby U, Rc, Uw) i status posadowienia (podwozie FF to posadowienie stałe czy tymczasowe) nie są w materiałach, więc zostają puste, a platforma pokazuje tylko to, co producent zadeklarował.
- Galeria realizacji i opis firmy są poza zakresem, na prośbę klienta i Twoją decyzję.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Follow-up

- [ ] Pytania do klienta, do zadania handlowcowi (kontakt na ostatniej stronie oferty): **deLux** (czym jest, dlaczego dach Premium ma dwie ceny, które modele mają go w standardzie), klasa rozmiaru dla Nicea (50,95 m²) i Sky Light (40,34 m², panele winylowe), czy Bremen (39,98 m², nie jest „tylko 13 PUR”) może mieć opcję 18 cm i za ile, które opcje mają dostać Vario, znaczenie „Front door trained 90x200”, „Comfort ceiling kitchen (20", 25", 30")” i „Recuperation 3 i 4”, potwierdzenie, że „(+1)” i „(+2)” przy klimatyzacji to przyrosty ponad 1 split, czy podwozie FF to posadowienie stałe czy tymczasowe, liczby izolacyjności (spec 0075), dlaczego ceny w ofercie różnią się od cennika 2026.
- [ ] Pliki zdjęć realizacji od klienta, jeśli galeria ma kiedyś wejść.
- [ ] Prawdziwe konto producenta (e mail, NIP, dane do panelu) do uzupełnienia, gdy klient je poda. Konto techniczne zostaje do tego czasu.
- [ ] Migawka konfiguracji w zapytaniu hurtowym (`BulkProductInquiryModal`) i ewentualnie strukturalna tabela wyborów zamiast jsonb (osobna decyzja).
- [ ] Filtr po linii (Comfort, Premium, Vario) na stronie producenta, jeśli lista 17 modeli okaże się niewygodna.
- [x] Przed promocją na produkcję sprawdzić poświadczenia produkcyjnego R2: niepotrzebne, dev i prod używają tego samego kubełka, więc pliki były już na miejscu i wystarczyły odnośniki w SQL (95 adresów sprawdzonych, wszystkie 200).
- [x] `origin/main` miał nowy commit względem `spec-0080-rozmowy`, budowa idzie na gałęzi `spec-0081-letniskowo` z `origin/main`.
- [ ] Producent nie widzi jeszcze migawki (AC-12): w nowym przepływie spraw nie ma dziś żadnego ekranu producenta (`lib/case-producer-queries.ts` jest świadomie wąskim modułem bez UI, krok 9 specu 0048). Migawka jest zapisana w `inquiry_item.configuration_snapshot`; dodać ją do widoku producenta razem z tym krokiem. Widzą ją administrator i klient (`CaseStatusPanel`).
- [ ] Ośmiu zastosowań komercyjnych jest dokładnie osiem, jak w specu, ale oferta podaje tylko ich nazwy; dwa dodatkowe teksty opisowe (kroki współpracy) są sformułowane wprost z jednego zdania oferty, do przeglądu przez klienta.
- [x] NIP Letniskowo: na produkcji wpisany prawdziwy `5423465217` (podany przez Stanisława 2026-11-05, AC-1). Na dev zostaje wartość robocza `CATALOG-LETNISKOWO`.
- [x] Promocja na produkcję 2026-11-05: PR #6 zmergowany, migracja 0070 wdrożona przez workflow, pliki `drizzle/_promote_letniskowo_to_prod/00` do `04` wgrane ręcznie skryptem `scripts/run-sql-file.ts`, cache odświeżony (`npm run revalidate`), produkty widoczne w sitemapie. Szczegóły sprawdzenia w [verify.md](verify.md).
- [ ] Gałąź Neon `tmp-migration-0070-letniskowo` (`br-lively-breeze-b2fng85r`) do usunięcia po zgodzie.
- [ ] Pozycje do klienta (AC-15) są oznaczone komentarzami w `scripts/data/letniskowo-options.ts` i `letniskowo-catalog.ts` (deLux, Nicea, Sky Light, Bremen 18 cm, nazwy w cenniku, "+1" i "+2", Recuperation 3 i 4); na stronie są pokazane tak jak w cenniku.
