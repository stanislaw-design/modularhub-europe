# 0086. Uzasadnienie: rodzina Kuchnie ogrodowe

## Context

Dla inwestora powstał katalog 11 kuchni ogrodowych (`_docs/kuchnie-ogrodowe-dla-inwestora/`). Kuchnie mają być widoczne na stronie i dobrze się prezentować. Na tym etapie nie potrzeba samoobsługi producenta ani osobnej logiki zapytań. Prawa do zdjęć są potwierdzone, a ceny zostają takie, jak w katalogu (EUR).

Kuchnie to dwa różne produkty. Kuchnia w obudowie (WDH) to zamykana stalowa skrzynia o stałym gabarycie, sprzedawana bez sprzętu. Zestaw modułowy to otwarty ciąg szafek ze sprzętem w cenie, w kilku długościach i kolorach. Klient musi zobaczyć tę różnicę od razu.

Żadna istniejąca rodzina nie pasuje. `spa-modulowe` ma podkategorie wellness, `kontenery-modulowe` niesie pola izolacji i przyłączy, a `outdoor-tv` nie ma schematu danych. Kod jest jednak przygotowany na kolejne rodziny katalogowe: `resolveProductHref`, `FAMILY_GROUPS` i mapy `Record<ProductFamily, …>`, które `tsc` wskaże przy nowej wartości.

Zestawy modułowe pochodzą od ELEEXA, ale mają być wystawione jako produkt ModularHub, bez nazwy dostawcy. W bazie producent wymaga konta i unikalnego NIP, a `getProducers` pokazuje każdego producenta z opublikowanym produktem na `/verified-manufacturers`.

## Options considered

### Option 1: Kuchnie jako podkategoria istniejącej rodziny (np. `kontenery-modulowe`)

Nowa wartość podkategorii i schemat `technicalSpecs` dla niej. Strony i nawigacja kontenerów zostają.

**Pros**: brak nowej wartości rodziny, mniej zmian w mapach rodzin.
**Cons**: kuchnie wpadają do wyników i etykiet "Kontenery", co myli klienta. Reguły CHECK i formularz zapytania traktują je jak kontener. Później i tak trzeba by to rozdzielić.

### Option 2: Osobna rodzina, strony katalogowe, dane tylko ze skryptu (wybrana)

Nowa wartość `outdoor-kitchen`, schemat z typem kuchni w środku, dwie strony zbudowane z komponentów sauny, producent marki ModularHub z kolumną `is_platform_brand`, edycja producenta zablokowana na serwerze.

**Pros**: czysty podział w wynikach, SEO i nawigacji. Wzorzec znany z sauny i outdoor-tv. Zero pracy przy kreatorze.
**Cons**: jedna nieodwracalna wartość enum. Zmiany danych tylko skryptem. Kontrola w kilku akcjach producenta.

### Option 3: Pełna rodzina z kreatorem producenta

Jak Option 2, plus kroki kreatora i panel dla kuchni.

**Pros**: WDH sam poprawia dane i ceny.
**Cons**: kilka razy więcej pracy (kroki kreatora, walidacja, podgląd) dla 4 produktów jednego producenta. Sprzeczne z celem "szybko i ładnie na stronie".

## Rationale

Option 2 daje dokładnie to, czego potrzeba teraz: osobne, dobrze opisane strony dla produktu, który nie przypomina żadnej obecnej rodziny, i to bez kosztu samoobsługi. Strony sauny są najbliższym wzorcem (katalogowy produkt z opcjami i ceną od), więc większość komponentów da się użyć ponownie.

Typ kuchni trzymamy w `technicalSpecs`, a nie w nowej kolumnie podkategorii. Przy 10 produktach podział na sekcje to filtr w kodzie, a nowa kolumna dodałaby drugą regułę CHECK do pilnowania. Wymiary jako liczby dają jeden format we wszystkich językach i przygotowują dane pod porównywarkę.

`is_platform_brand` jako kolumna, a nie stały identyfikator w kodzie, bo listy producentów są w kilku miejscach i każde kolejne zapytanie musiałoby pamiętać o wyjątku. Z kolumną wystarczy warunek w zapytaniu. Konto techniczne zamiast konta admina, bo kod zakłada, że producent ma rolę `producer`.

Lewy panel filtrów (AC-14, decyzja właściciela 2026-11-17) zamiast strony bez filtrów: klient przechodzi między `/sauna`, `/results` i `/outdoor-kitchen` i powinien widzieć ten sam układ z przełącznikiem rodziny. Filtrujemy po już wczytanej liście, bo przy kilkunastu produktach osobne zapytanie do bazy nic nie daje. Widok z filtrem jest `noindex`, a canonical zostaje bez parametrów, tak jak na `/sauna`, żeby wyszukiwarka nie indeksowała kombinacji filtrów.

Blokada edycji na serwerze, a nie tylko ukrycie przycisków, bo akcje serwera da się wywołać bez interfejsu. WDH widzi kuchnie w panelu, żeby wiedział, co jest na stronie pod jego nazwą.
