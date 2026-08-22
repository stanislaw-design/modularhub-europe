# ModularHub Europe — aktualna identyfikacja wizualna

**Status:** obowiązujący system dla całego serwisu  
**Kierunek:** Option A / black-led engineered confidence  
**Data decyzji:** 22.08.2026

Ten dokument zastępuje wcześniejsze wartości kolorów i typografii wszędzie tam, gdzie starsze wytyczne v3 lub marketingowe tokeny v4 są z nim sprzeczne. Strategia marki, język komunikacji oraz znaczenie statusów produktowych pozostają bez zmian.

## Charakter

ModularHub Europe ma wyglądać precyzyjnie, nowocześnie i pewnie. Czerń buduje główną hierarchię, granat dodaje technicznej głębi, a pomarańcz prowadzi do działania. Białe i alabastrowe powierzchnie utrzymują czytelność produktu.

- precyzyjny, nie chłodny,
- premium, nie luksusowy,
- techniczny, ale ludzki,
- wyrazisty, nie krzykliwy.

## Paleta

| Rola | Nazwa | HEX | Użycie |
|---|---|---:|---|
| główna | Black | `#000000` | nagłówki, główne ciemne sekcje, nawigacja, logo |
| wspierająca | Prussian Navy | `#14213D` | głębia, panele wspierające, nakładki, techniczne akcenty |
| akcja | Orange | `#FCA311` | główne CTA, aktywny krok, fokus i ważne wyróżnienie |
| akcja hover | Orange Strong | `#E89200` | hover i active dla pomarańczowych elementów |
| neutralna | Alabaster | `#E5E5E5` | delikatne sekcje, linie, obramowania i nieaktywne pola |
| powierzchnia | White | `#FFFFFF` | główne tło, karty i formularze |
| tekst pomocniczy | Graphite | `#4D5562` | opisy i metadane na jasnym tle |

Pomarańcz jest kolorem funkcjonalnym, nie dekoracyjnym. Na pomarańczowym tle używamy wyłącznie czarnego tekstu lub ikony. Biały tekst na `#FCA311` ma kontrast około `2.02:1` i nie spełnia WCAG AA; czarny ma około `10.39:1`.

## Typografia — Option A

| Funkcja | Krój | Wagi |
|---|---|---|
| nagłówki i komunikacja marki | **Manrope** | 600, 700 |
| treść, formularze i produkt | **Inter** | 400, 500, 600 |
| ceny, wymiary, daty i identyfikatory | **IBM Plex Mono** | 400, 500, 600 |

Nagłówki Manrope są zwarte i geometryczne. Inter pozostaje podstawą czytelności interfejsu. IBM Plex Mono stosujemy wyłącznie tam, gdzie techniczny lub tabelaryczny charakter danych pomaga w porównywaniu informacji.

## Hierarchia użycia

- Czerń jest domyślnym kolorem tekstu i głównych ciemnych powierzchni.
- Granat nie zastępuje czerni; buduje drugi poziom głębi.
- Pomarańcz wskazuje działanie albo aktualny stan procesu.
- Alabaster rozdziela sekcje i elementy interfejsu.
- Statusy `approved`, `conditional` i `blocked` zachowują osobną, zarezerwowaną paletę i zawsze występują z tekstem lub ikoną.

## Implementacja

- Fonty są samohostowane przez `next/font/google` w `app/fonts.ts`.
- Kanoniczne wartości i aliasy produktu są w `assets/tokens/brand-v3-tokens.{css,json}`.
- Marketingowe aliasy istnieją w `assets/tokens/brand-v4-tokens.{css,json}`, ale rozwiązują się do tej samej palety.
- Mapowanie Tailwind CSS v4 znajduje się w `app/globals.css`.
- Starsze nazwy tokenów (`foundation-navy`, `passage-blue`) pozostają tymczasowo jako aliasy, aby nie rozrywać istniejących ekranów podczas migracji.

