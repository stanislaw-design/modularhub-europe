# 0069. Rationale: Układ wnętrz i rzuty przypisane do opcji

## Context

Strona produktu `/project/[slug]` ma dwa niezależne wybory klienta. Pierwszy to standard wykończenia (wariant produktu, adres `?wariant=`), drugi to płatne opcje konfiguratora (adres `?opcje=`, spec 0059). Wersja układu wnętrz jest dziś zwykłą opcją z grupy typu single, więc zmienia tylko cenę.

Wszystko, co opisuje układ, żyje w jednym miejscu na produkt. Lista pomieszczeń to jedno pole `product.room_layout`, metraż i liczby pokoi to pola produktu, a rzuty to dokumenty `document` z celem `product_floor_plan`, filtrowane tylko po wariancie standardu. Zakładka Rzut pokazuje je w siatce bez podpisów ("Plan 1", "Plan 2"). Opcja nie może wskazać dokumentu ani własnych pomieszczeń.

Efekt widać na imporcie Logbar Domy z 2026-10-09: Bingo ma cztery układy, wersja 2 zmienia trzy sypialnie, garderobę i metraż (91,05 m² zamiast 82,09 m²), a w bazie jest tylko rzut wersji podstawowej, bo pozostałe osiem rzutów nie miałoby jak się odróżnić. Ten sam problem dotknie każdego producenta, który sprzedaje warianty układu jako opcje. Brak decyzji oznacza, że klient widzi cenę wersji 2, ale rzut i metraż wersji podstawowej.

## Options considered

### Option 1: Osobna tabela układu opcji i powiązanie rzutu z opcją

Nowa tabela `product_option_layout` (jeden wiersz na opcję niosącą układ) z własną tabelą tłumaczeń, plus dwie nowe kolumny w `document`: `product_option_id` i `floor_level`.

**Pros**:
- Wspólna tabela opcji (piece do sauny, kolory, ocieplenie) zostaje nietknięta i nie dostaje kolumn pustych w prawie każdym wierszu.
- Nowy atrybut układu dodaje się bez zmiany tabeli używanej wszędzie.
- Rzut ma dwie niezależne osie (wariant standardu i wersja układu), więc nic się nie myli.

**Cons**:
- Dwie nowe tabele i jeden dodatkowy `LEFT JOIN` na stronie produktu.
- Reguła "najwyżej jedna grupa niesie układ" nie da się wymusić samym ograniczeniem w bazie, pilnuje jej kod.

### Option 2: Kolumny układu na `product_option`

Te same pola dopisane do `product_option`, tłumaczenia do `product_option_translation`.

**Pros**:
- Mniej tabel, prostsze zapytanie.

**Cons**:
- Szeroka tabela z kolumnami używanymi przez ułamek wierszy, mieszanie ceny i geometrii domu.
- Każda zmiana układu dotyka tabeli używanej przez konfigurator wszystkich rodzin produktów.

### Option 3: Osobny byt "wersja układu" poza opcjami

Własna tabela wersji, własny wybór w adresie URL, opcja tylko wskazuje wersję.

**Pros**:
- Najbardziej elastyczne, cena i układ mogą się rozjechać.

**Cons**:
- Dubluje konfigurator i wymaga nowego parametru adresu oraz nowego sposobu wyboru dla klienta.
- Dużo więcej pracy bez widocznej korzyści, bo dziś wersja układu i jej cena to ta sama rzecz.

## Rationale

Opcje są już wspólnym mechanizmem wielu rodzin (spec 0059), a układ domu dotyczy tylko ułamka z nich, więc dane układu nie powinny rozszerzać wspólnej tabeli. Osobna tabela daje czystą bazę i swobodę rozbudowy bez ryzyka dla konfiguratora sauny i kontenerów. Rzut dostaje dwie niezależne cechy, bo wariant standardu (SSZ albo z wykończeniem) i wersja układu to różne decyzje klienta, a podpis piętra z tekstów interfejsu omija nową tabelę tłumaczeń.

Kształt danych świadomie powtarza istniejące wzorce: `room_layout` jako jsonb z `id` pomieszczeń i ten sam schemat Zod (spec 0042 i 0045), tłumaczenia po `id` z fallbackiem do polskiego (spec 0028 i 0067), czysta funkcja bez dostępu do bazy obok `lib/data/project-variants.ts`. Rozszerzenie ogólne, nie tylko dla Bingo, kosztuje tyle samo co rozwiązanie jednorazowe, a Steel House i Budman mają ten sam problem.

