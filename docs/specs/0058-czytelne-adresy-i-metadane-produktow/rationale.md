# 0058. Rationale: czytelne adresy i metadane produktów

## Context

Dziś publiczny adres strony produktu (dom albo produkt katalogowy jak outdoor tv) niesie sam surowy `uuid` z bazy: `/project/3f9a1c2e-...` albo `/outdoor-tv/3f9a1c2e-...`. Ten sam `uuid` (kolumna `product.id`, `lib/db/schema.ts:562`) jest jedynym identyfikatorem produktu w całej aplikacji: kluczem głównym, kluczem obcym w wariantach, dokumentach, ulubionych, wycenach i zapytaniach, parametrem query (`?projects=`, `?wariant=`), i częścią adresu w panelu producenta i administracyjnym.

Obie strony produktu mają już podstawowe metadane udostępniania: `generateMetadata` w `app/[locale]/(customer)/project/[id]/page.tsx` i w `outdoor-tv/[id]/page.tsx` ustawia tytuł, opis, kanoniczny adres, hreflang (pl/en/nl, spec 0036 AC-7) i `openGraph.images` na prawdziwe zdjęcie okładki produktu (`coverImageUrl`). To już działa i daje sensowny podgląd na WhatsApp, Facebooku czy iMessage. Czego nie ma: adres samego linku wciąż jest nieczytelny (surowy `uuid`), co dla kogoś udostępniającego "Pomerania 40" wygląda przypadkowo i nieufnie, mimo że sama karta podglądu już wygląda dobrze.

Platforma jest już w produkcji (epika Produkcja, spec 0017 i dalsze): prawdziwi producenci mają prawdziwe produkty w bazie Neon, niektóre już udostępniane (na przykład katalog Steel House). Każda zmiana adresu musi więc liczyć się z tym, że stare linki mogą być już zaindeksowane w wyszukiwarce albo zapisane u kogoś w wiadomościach, dokładnie ten sam problem, który spec 0036 rozwiązał dla zmiany segmentów ścieżki (trwałe przekierowanie 308, zachowany ciąg zapytania).

Dodatkowa siła w tle: `product.name` jest nullable, produkt istnieje i jest osiągalny pod swoim linkiem od razu po utworzeniu w kreatorze producenta, zanim ma jeszcze nazwę (`getProjectById` nie filtruje statusu, spec 0020 AC-6, komentarz w `lib/data/projects.ts:927`). Każde rozwiązanie musi więc obsłużyć produkt bez nazwy, nie tylko produkt z nazwą.

## Options considered

### Option 1: Dodać `slug` jako drugi, opcjonalny identyfikator obok `id` (wybrane)

Nowa nullowalna kolumna `product.slug`, wyliczana raz z nazwy produktu, unikalna. Adres publiczny przyjmuje slug albo id (dopóki go nie ma); wejście po id z istniejącym slugiem przekierowuje trwale na slug. Każde inne miejsce w aplikacji (klucze obce, query params, panel producenta/administracyjny) zostaje przy `id` bez zmian.

**Pros**:
- Zmiana ograniczona do dwóch stron publicznych i jednego punktu budowania linku (`resolveProductHref`); żadna tabela zależna od `product.id` jako klucza obcego nie jest dotykana.
- `id` nigdy nie przestaje działać, więc nie trzeba migrować/przepisywać żadnych już zapisanych referencji (ulubione, zapytania, warianty).
- Naturalnie obsługuje produkt bez nazwy (slug po prostu jeszcze nie istnieje, adres wraca do id, tak jak działa dziś).

**Cons**:
- Dwa sposoby trafienia na tę samą stronę (id i slug) to dodatkowa reguła do pamiętania (kiedy przekierować, kiedy nie) w dwóch komponentach stron.
- Kolizja nazw wymaga własnej, choćby prostej, logiki (sufiks); to nowy kod, którego wcześniej nie było.

### Option 2: Zastąpić `id` slugiem jako właściwym kluczem głównym

Slug staje się jedynym identyfikatorem produktu wszędzie, `id` znika albo zostaje tylko wewnętrznie.

**Pros**:
- Jeden identyfikator w całym systemie, brak rozróżnienia "publiczny vs wewnętrzny".

**Cons**:
- `product.id` jest kluczem obcym w co najmniej sześciu tabelach (`product_variant`, `document`, `bulk_product_inquiry`, ulubione, `product_country_eligibility`, tłumaczenia) — zamiana klucza głównego na tekst zmieniający się w czasie (albo migracja każdej z tych tabeli) jest migracją o niewspółmiernie większym ryzyku niż to, o co prosi ta decyzja (ładniejszy publiczny adres).
- Slug jako klucz główny musiałby być trwały od chwili powstania wiersza, co wraca do tego samego problemu (produkt bez nazwy) tylko na poziomie klucza głównego, dużo bardziej ryzykownym miejscu do łatania wyjątkiem.

### Option 3: Zostać przy `id` w adresie, poprawić tylko metadane

Nie dotykać routingu, dopracować wyłącznie kartę podglądu (tytuł/opis/obraz), która już w większości istnieje.

**Pros**:
- Zero zmian w routingu, zero ryzyka migracji, zero przekierowań do przetestowania.

**Cons**:
- Nie odpowiada na wyraźną prośbę: adres linku (to, co faktycznie widać i kopiuje się przy udostępnianiu) zostaje nieczytelnym `uuid`. Karta podglądu na Facebooku/WhatsAppie wygląda dobrze, ale sam napis pod nią ("modularhub.eu/project/3f9a1c2e...") wciąż wygląda przypadkowo.

## Rationale

Option 1 wygrywa, bo `product.id` jest realnym, współdzielonym kluczem obcym w wielu tabelach (warianty, dokumenty, ulubione, zapytania), więc zastąpienie go (Option 2) byłoby migracją o skali niewspółmiernej do właściwej prośby: chodzi o to, jak wygląda jeden konkretny, publiczny adres, nie o to, czym jest identyfikator produktu w całym systemie. Option 3 jest za wąska: konkretna prośba w tej decyzji to właśnie sam segment adresu, nie tylko karta podglądu, która już działa.

Dodawanie sluga jako drugiego, opcjonalnego identyfikatora, ze starym `id` jako trwały fallback i przekierowaniem 308 przy zmianie, jest tym samym wzorcem bezpieczeństwa, który spec 0036 już ustanowił w tym repo dla zmiany adresów ("każdy stary adres trwale przekierowuje na nowy, żeby nie zepsuć już zaindeksowanych stron ani zapisanych linków"): ta decyzja stosuje tę samą zasadę na poziomie pojedynczego produktu, nie całej ścieżki.
