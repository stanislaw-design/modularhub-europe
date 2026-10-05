# 0067. Uzasadnienie: tłumaczenia opcji, producenta i pól produktu

## Context

Platforma ma strony klienta w czterech językach (`pl`, `en`, `de`, `nl`, epika Produkcja). Tłumaczenia produktu już istnieją dla nazwy, opisu, układu pomieszczeń, FAQ, wymagań klienta, opcji fundamentu i, od 2026-10-05, dla wartości specyfikacji sauny (`product_translation`, `product_variant_translation`, `cost_line_item_label_translation`). Wszystko to ma jedną zasadę: brak tłumaczenia daje polski tekst (spec 0028 AC-6).

Mimo to klient oglądający produkt po angielsku wciąż widzi polskie fragmenty. Przeskan strony sauny w `/en` wykazał trzy grupy: grupy i etykiety opcji konfiguratora (spec 0059), opis producenta w sekcji partnera, a na stronach domów także pola `construction_system`, `roof_type` i `customization_scope`, które prawie wszystkie produkty mają po polsku. Powód jest strukturalny: katalog opcji i opis producenta nie mają tabeli tłumaczeń, a pola produktu nie mają kolumn w `product_translation`. Nie ma też ekranu edycji katalogu opcji ani opisu producenta, więc teksty trafiają do bazy wyłącznie importem i przez Neon MCP.

Częściowo przetłumaczona strona jest gorsza niż w pełni polska albo w pełni angielska: klient nie wie, czy to błąd, i trudniej mu porównać oferty. Bez decyzji każdy kolejny import (Kora, Wooden Dream House, Dampol, MOHO i następni) powiększa luki.

## Options considered

### Option 1: Tabele tłumaczeń per encja, kolumny w `product_translation` i jeden słownik dla krótkich zdań

Opcje, producent i certyfikaty dostają własne tabele tłumaczeń przypięte po `id`. Cztery pola produktu to nowe kolumny w istniejącym `product_translation`. Powody zgodności, odpowiedzialny i start etapu (mało unikalnych wartości, bardzo powtarzalne) tłumaczy słownik po polskim tekście.

**Pros**:
- Spójne z istniejącymi wzorcami: `product_translation` dla pól produktu i `cost_line_item_label_translation` dla powtarzalnych zdań.
- Tłumaczenie przypięte do wiersza po `id` przetrwa edycję polskiego tekstu źródłowego.
- Indeksy unikalne i klucze obce dają kontrolę spójności i proste zapytanie o braki (anty join).

**Cons**:
- Pięć nowych tabel i cztery kolumny, więcej migracji i joinów.
- Dwa mechanizmy dopasowania obok siebie.

### Option 2: Jeden słownik po polskim tekście dla wszystkiego

Jedna tabela (polski tekst, język, tłumaczenie), każde pole tekstowe przechodzi przez nią w warstwie odczytu.

**Pros**:
- Najmniej schematu i najtańszy backfill: kilkanaście unikalnych tekstów obejmuje setki produktów.
- Jedno miejsce odczytu dla wszystkiego.

**Cons**:
- Zmiana polskiego tekstu po cichu zrywa tłumaczenie, a wyjątki dla jednego produktu lub producenta są niemożliwe.
- Opisy producentów i nazwy opcji to długi, unikalny tekst, który w słowniku nie powtarza się, więc zysk słownika znika.
- Kłóci się z tym, jak już jest zbudowane tłumaczenie produktu.

### Option 3: Kolumna `translations jsonb` na każdej tabeli źródłowej

Jedna nullable kolumna z obiektem `{ "en": ..., "de": ..., "nl": ... }` na `product_option_group`, `product_option`, `producer` i `product`.

**Pros**:
- Najmniejsza migracja, bez nowych tabel.
- Tłumaczenie leży obok tekstu źródłowego.

**Cons**:
- Brak kluczy obcych i indeksów unikalnych, kształt jsonb łatwo się rozjeżdża.
- Zapytanie o braki wymaga operacji na jsonb dla każdej tabeli.
- Rozbija wzorzec użyty dotąd w repo (osobne tabele tłumaczeń).

## Rationale

Wybrana jest opcja 1. Decydują o tym trzy siły z kontekstu. Po pierwsze, repo ma już dwa sprawdzone wzorce (`product_translation` po `id` i słownik etykiet kosztów po polskim tekście) i opcja 1 po prostu każdemu polu przypisuje ten wzorzec, który pasuje do jego kształtu: długi, unikalny tekst dostaje tłumaczenie po `id`, krótkie powtarzalne zdanie idzie do słownika. Po drugie, opcji i opisów producentów nikt nie edytuje w aplikacji, więc zmiana polskiego źródła zdarza się rzadko, ale gdy się zdarzy, tłumaczenie po `id` zostaje, a słownik po tekście by je zgubił. Po trzecie, cel to brak luk, a do tego potrzebne jest tanie, dokładne zapytanie o braki, które dają klucze obce i indeksy unikalne, a jsonb tego nie daje.

Opcja 2 ma najtańszy backfill, ale opisy producentów i nazwy opcji są unikalne, więc zysk słownika znika, a cena (ciche zrywanie tłumaczeń, brak wyjątków) zostaje. Opcja 3 jest najmniejsza, ale rozbija przyjęty wzorzec i słabo wspiera kontrolę braków. Wybór jest świadomy: akceptujemy więcej schematu, żeby dostać spójność i kontrolę.

Fallback na polski wybrano zamiast ukrywania pola lub oznaczania go, bo ukrycie niszczy realną informację (opcja z ceną bez nazwy), a oznaczenie "PL" dalej miesza języki. Ryzyko niewidocznej luki łagodzi skrypt kontrolny na żądanie, wybrany zamiast bramki w CI, bo bramka wymaga dostępu CI do bazy i mogłaby zatrzymywać niezwiązane wdrożenia. Wykrywanie tłumaczeń nieaktualnych wobec zmienionego polskiego źródła zostało z tego speca wyjęte. Pierwotny pomysł (porównanie `updated_at`) nie działa: w schemacie nie ma automatycznej aktualizacji tej kolumny (brak `$onUpdate` i wyzwalacza poza wyzwalaczem ceny), a zapisy przez Neon MCP i skrypty jej nie ruszają, więc dałoby fałszywe poczucie kontroli. Poprawne rozwiązanie to kolumna ze zrzutem źródła per pole, zapisana w Follow-up. Kontrola speca przez inny model wskazała też, że słownik mógłby objąć niemal wszystko (dane produktów są mocno powtarzalne). Decyzja o tabelach per encja jest świadoma: opisy producentów są unikalne, tłumaczenie po `id` przeżywa edycję tekstu, a koszt backfillu jest mały, bo jedno zapytanie ze słownikiem unikalnych wartości wypełnia setki produktów.

Edycja przez producenta w panelu jest poza zakresem, bo żadnego z tych tekstów nie da się dziś w ogóle edytować w aplikacji. Zbudowanie samej edycji to osobny, duży projekt. Zapisane jako zadanie w Follow-up.

## Evidence: dane z bazy dev (2026-10-05)

Zakres backfillu i to, dlaczego słownik ma sens tylko dla krótkich zdań:

| Pole | Unikalne wartości | Wiersze |
|---|---|---|
| `product.construction_system` | około 17 | około 100 produktów |
| `product.roof_type` | około 27 | około 110 produktów |
| `product.customization_scope` | 8 | około 34 produkty |
| `product.service_scope_description` | 1 | 1 produkt |
| `product_country_eligibility.reason` | 25 | 290 |
| `cost_line_item.responsible_party` | 2 ("Inwestor", "Nabywca"), poza zakresem: żadna strona klienta tego pola nie renderuje | 24 |
| `cost_line_item.label` | 208, z czego 196 ma tłumaczenie (12 luk) | 1243 |
| `product_compliance_assessment.reason` | 0 (tabela pusta, spec 0065 w toku) | 0 |
| `product_timeline_stage.responsible_party`, `starts_from_label` | 0 (brak wierszy) | 0 |
| `producer_certification.name` | 1 | 1 |

Grupy i etykiety opcji: katalogi trzech producentów (Dampol, Kora, Wooden Dream House) mają łącznie kilkadziesiąt unikalnych etykiet i kilkanaście nazw grup. Opisy producentów: dwa wpisy Kory i Wooden Dream House, oczyszczone 2026-10-04 z danych kontaktowych.

Fakt z kodu, który wpływa na projekt: `ProjectOptionsConfigurator` wybiera ikonę grupy przez dopasowanie polskich słów kluczowych w `group.name` (`ociepl`, `klimatyzacj`, `przeszklen`) i rozpoznaje opcję negatywną przez `option.label.trim().toLowerCase() === "nie"`. Obie logiki zepsułyby się po prostym podmienieniu tekstu na przetłumaczony, dlatego zapytanie zwraca też tekst źródłowy.

Spec nie dodaje sekcji References (wybór inżyniera).
