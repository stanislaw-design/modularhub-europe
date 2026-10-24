# 0075. Uzasadnienie: parametry izolacji przegród, status posadowienia i planowane użytkowanie

Spec: [index.md](index.md)

## Context

> ⚠️ Premise note: Największym ryzykiem tej decyzji nie jest kod, tylko dane. Platforma nie ma dziś ani jednej liczby U, Rc, Uw ani Ug, a producenci w katalogu rzadko publikują je na swoich stronach, więc sekcja może długo być pusta. Model danych pozwala zacząć od kilku producentów i rosnąć stopniowo, ale trzeba to robić świadomie (pilotaż, krótka lista pytań), a nie zakładać, że producenci wypełnią to sami. Druga uwaga: treści prawne w PDF są materiałem własnym i nie przeszły niezależnej weryfikacji, więc strona pokazuje deklaracje producenta i potwierdzenia platformy, a nie własne oceny zgodności z przepisami.

Materiał źródłowy `_docs/ModularHub_Porownanie_Izolacyjnosci_5_Krajow_PL.pdf` (22.10.2026, wersja 1.1) porównuje wymagania izolacyjności dla nowych domków wakacyjnych w Niemczech, Belgii, Holandii, Włoszech i Francji. Wniosek z niego: nie istnieje jedna liczba "wymagana w kraju X". Wynik zależy od funkcji budynku (wakacyjny, mieszkalny, HLL, logies), powierzchni (próg 50 m² liczony lokalną metodą), okresu użytkowania (progi 4 miesięcy w Niemczech i Belgii), statusu stałego lub tymczasowego (Holandia, Francja), regionu (Belgia, Włochy) i strefy klimatycznej gminy (Włochy). Liczby w przepisach to w części wartości referencyjne do obliczeń (Niemcy, Włochy), a nie samodzielne limity.

Stan platformy (sprawdzony w kodzie): `technicalSpecs` domu ma tylko klasę energetyczną A+ do D (`heatTransferCoefficients`, spec 0026) oraz wycofane z UI pola tekstowe `wallBuildUp`, `insulation` i `windowClass` (spec 0049). Ocena zgodności (`product_compliance_assessment`, spec 0065) obsługuje tylko PL, DE i NL i ma już mechanizm potwierdzeń przez administratora. Zapytania mają kraj dostawy i wolny tekst lokalizacji (`location_detail` w `project_request`), a zwykłe zapytanie ma region i miasto działki. Nie ma pola funkcji prawnej, statusu stałego lub tymczasowego ani okresu użytkowania. Kategoria produktu (`caloroczny`, `rekreacyjny-caloroczny`, `mobilny`, `wynajem-hotel`) jest widoczna jako plakietka, ale nie jest funkcją prawną.

Jeśli nic nie zrobimy, klient nie może porównać domów pod kątem izolacji, a producent odpowiadający na zapytanie z innego kraju nie ma ustrukturyzowanej informacji o planowanym użytkowaniu.

## Options considered

### Option 1: Osobna tabela parametrów przegród, dwa pola na produkcie, jedno pole w zapytaniach

Nowa tabela `product_envelope_parameter` (jeden wiersz na przegrodę i wielkość, z metodą, datą i stanem potwierdzenia), kolumna `foundation_status` na produkcie, pola `intended_use` w trzech tabelach zapytań, kraje BE, IT i FR w ocenie zgodności.

**Pros**:
- Każda liczba ma własną metodę, datę i potwierdzenie, tak jak wymaga tego natura danych.
- Używa istniejącego wzorca potwierdzeń (spec 0065), więc nie powstaje drugi mechanizm.
- Daje się porównać w tabeli porównania i filtrować w przyszłości.
- Opcjonalne, brak regresji.

**Cons**:
- Nowa tabela, nowy ekran w panelu producenta i administratora, nowe tłumaczenia.
- Reguła rodzin (dom i kontener mieszkalny) jest pilnowana tylko przez aplikację.

### Option 2: Nowe pola w `technicalSpecs` domu

Dopisać `wallUValue`, `roofUValue`, `windowUw` i inne jako pola w schemacie Zod.

**Pros**:
- Najmniej zmian w bazie, korzysta z istniejącego kreatora.
- Jeden formularz.

**Cons**:
- Schemat jest `.strict()` i płaski, więc nie ma gdzie zapisać metody, daty i potwierdzenia każdej liczby osobno.
- Jedna wartość U w kreatorze wygląda jak fakt, a jest deklaracją. Łamie zasadę ze spec 0065.
- Nie obejmuje kontenerów mieszkalnych, które mają inny kształt `technicalSpecs`.
- Nowe pola wymagałyby backfillu albo stałyby puste i blokowały publikację jako "wymagane".

### Option 3: Tylko strona wiedzy, bez zmian w danych produktu

Opublikować karty krajów z PDF jako treść edukacyjną i nie dodawać nic do produktu.

**Pros**:
- Zero zmian w modelu, szybkie, dobre do SEO.
- Bez kosztu zbierania danych od producentów.

**Cons**:
- Klient nadal nie widzi żadnej liczby dla konkretnego domu.
- Nie rozwiązuje potrzeby producenta (planowane użytkowanie) ani porównania.
- Stałaby się źródłem nieaktualnych informacji bez właściciela.

## Rationale

Wybrana jest Option 1, bo dane mają trzy cechy, których nie unosi płaski schemat: każda liczba ma własną metodę i datę, każda wymaga niezależnego potwierdzenia, a ich zestaw różni się między produktami (jedni podają Rc, inni U, jedni mają tylko ściany). Tabela o jednym wierszu na wartość odpowiada temu wprost i pozwala zacząć od jednej liczby bez pustych kolumn. Spec 0065 już zbudował i przetestował wzorzec `self_reported` i `platform_confirmed` z CHECK w bazie, blokadą optymistyczną i audytem, więc powielamy sprawdzony mechanizm zamiast wymyślać nowy.

Option 2 odpada, bo łamie to, co spec 0065 ustalił jako zasadę: nic nie wygląda na potwierdzone bez administratora. Option 3 jest wartościowa jako uzupełnienie (zapisana w Follow-up), ale sama nie daje klientowi liczb przy konkretnym domu.

Planowane użytkowanie trafia do zapytania, a nie do produktu, bo prawnie liczy się to, jak klient użyje domu, a nie to, jak producent go nazywa. Producent ma już kategorię produktu, która wyraża przeznaczenie. Status stałe i tymczasowe jest cechą produktu (czy dom stoi na fundamencie, czy jest ruchomy), więc trafia na produkt jako dwuwartościowe pole, bez powielania kategorii `mobilny`. Wyjaśnienia są w plikach `messages`, bo to stały tekst interfejsu, a nie dane producenta (spec 0067 kieruje do tabel tłumaczeń tylko dane). Rozwijane "Co to znaczy?" jest natywnym `details`, bo opisy w dymkach źle działają na telefonie.

Pilotaż danych (2 do 3 producentów, wpisywane przez administratora) jest wynikiem rozmowy: najdroższy element to zebranie liczb, a nie kod, więc model nie zakłada pełnych danych na starcie.

## Evidence: porównanie karty "Dane od producenta" z modelem danych (23.10.2026)

| Pole z PDF (str. 8) | Stan przed tą decyzją | Rozstrzygnięcie |
|---|---|---|
| Lokalizacja projektu | `countryOfProduction` to kraj produkcji. Region i gmina tylko w zapytaniu (`plot_region`, `plot_city`, `location_detail`) | Zostaje w zapytaniu klienta. Strefę włoską ustala doradca z gminy |
| Funkcja i okres użytkowania | Kategoria produktu bez funkcji prawnej | Okres użytkowania w zapytaniu (AC-6, AC-7). Funkcja zostaje kategorią produktu |
| Powierzchnia | `floorAreaM2`, `builtUpAreaM2` | Bez nowych kolumn, notka przy progu 50 m² (AC-14) |
| Ogrzewanie i chłodzenie | `heatSource`, `ventilation` | Bez zmian, chłodzenie pominięte |
| Status i posadowienie | Wolny tekst `foundationOptions` | Nowe pole `foundation_status` (AC-5) |
| Ściany, dach, podłoga: U i Rc | Tylko klasa energetyczna, pola tekstowe wycofane | Nowa tabela (AC-1 do AC-3) |
| Stolarka: Uw, Ug, Ud | `windowClass` tekst, wycofany | Elementy `window`, `glazing`, `door` w tej samej tabeli |
| Łączenia i mostki cieplne | Brak | Pominięte na stronie, dokument do pobrania wystarcza |
| Ocena całego budynku | `product_compliance_assessment` (PL, DE, NL) | Rozszerzone o BE, IT, FR (AC-8) |
| Podstawa wyłączenia | `reason` w ocenie zgodności | Bez zmian |
