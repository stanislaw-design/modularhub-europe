# 0035. Rationale: dwie grupy wyszukiwania, Domy i Więcej niż dom

## Context

Dzisiejsza karta wyszukiwania w hero (`components/klient/SearchCard.tsx`) i zakładki rodziny na stronie wyników (`components/klient/FamilyTabs.tsx`) pokazują trzy rodziny produktu (dom, spa modułowe, pergola) jako płaskie, równorzędne zakładki. Tymczasem strona główna już dziś dzieli te same trzy rodziny na dwa poziomy: dom osobno, a spa modułowe i pergole razem pod jedną etykietą "Więcej niż dom" (sekcja `CategoryShowcase`, spec 0029, dokładnie ta fraza w `messages/pl.json`, klucze `CategoryShowcase.headingUnderline`/`headingRest`). Odwiedzający widzi więc dwa różne podziały tej samej rzeczy w obrębie jednej sesji: trzy równe przyciski w hero, a chwilę później dwa poziomy przewijając stronę niżej.

Produktowo ten podział ma rosnąć: spec `produkcja.md` (funkcja 6) wprowadził model rodzin produktu (`ProductFamily`) właśnie jako fundament pod przyszłe rozszerzenie oferty poza dom, a dzisiejsze trzy hardkodowane listy rodzin (w `SearchCard.tsx`, `FamilyTabs.tsx` i `lib/results-filters.ts`) nie dają żadnego wspólnego miejsca, w którym nowa rodzina (np. kolejny typ konstrukcji ogrodowej) mogłaby zostać dopisana raz, zamiast w trzech miejscach naraz.

Realny katalog za spa modułowe i pergolą jest dziś płytki: każda z tych dwóch rodzin ma dokładnie jeden przykładowy, zasiany produkt (`getFeaturedProjectByFamily`, widoczne w `CategoryShowcase.tsx`), podczas gdy dom jest jedyną rodziną z prawdziwym, wieloelementowym katalogiem (komentarz w `lib/data/projects.ts`: "jedyne realne, zasiane dane"). Ta zmiana jest więc przede wszystkim porządkowaniem nawigacji i przygotowaniem miejsca na przyszłość, nie zakładem, że połączony widok "Więcej niż dom" pokaże dziś dużo produktów.

> ⚠️ Notatka: połączony widok "Więcej niż dom" (spa plus pergola razem) będzie dziś zwracał najwyżej dwa realne produkty (po jednym na rodzinę). To nie unieważnia decyzji, bo cel jest nawigacyjny i przygotowawczy pod przyszłe rodziny, ale warto to świadomie przyjąć: efekt widoczny dla klienta rośnie dopiero razem z katalogiem, nie w tym build planie.

## Options considered

### Option 1: Jedna wartość `family` w URL, rozszerzona o sentinel grupy ("wiecej-niz-dom")

`ResultsFilter.family` (i parametr URL `family`) przyjmuje dziś dokładnie jedną prawdziwą rodzinę (`dom`, `spa-modulowe`, `pergola`). Ta opcja dokłada jedną, ustaloną wartość specjalną, `"wiecej-niz-dom"`, która po stronie serwera (`getProjects()`) rozwija się przez wspólną mapę `FAMILY_GROUPS` na listę prawdziwych rodzin i trafia do zapytania jako `IN (...)` zamiast równości.

**Pros**:
- Najmniejszy zasięg zmiany: `family` zostaje pojedynczą wartością tekstową wszędzie tam, gdzie już jest (URL, `ResultsFilter`, porównania w `FamilyTabs`), zmienia się tylko zbiór dozwolonych wartości i jedna gałąź w `getProjects()`.
- Stare, zapisane linki (`?family=spa-modulowe`) działają bez zmian, bo nic nie zostaje usunięte, tylko dodane.
- Rozszerzalność jest realna: dopisanie nowej rodziny do `FAMILY_GROUPS["wiecej-niz-dom"]` od razu obejmuje każdy stary link do grupy, bez przebudowy URL.

**Cons**:
- `family` niesie teraz wartość, która nigdy nie występuje w tabeli `product` — każde miejsce robiące ścisłe porównanie z konkretną rodziną musi pamiętać o tym sentinelu, żeby się o niego nie potknąć.

### Option 2: `family` jako lista realnych wartości (`family=spa-modulowe&family=pergola`)

Brak sentinela grupy: "Więcej niż dom" istnieje tylko w interfejsie, który w momencie kliknięcia sam buduje listę aktualnych rodzin grupy i wpisuje ją do URL jako kilka wartości `family`.

**Pros**:
- `family` zostaje zawsze zbiorem prawdziwych, weryfikowalnych wartości z bazy, bez sztucznej wartości pośredniej.

**Cons**:
- `family` zmienia typ ze skalaru na tablicę wszędzie: `parseResultsSearchParams`, `buildResultsHref`, `matchesResultsFilter`, `getProjects()`, każde porównanie `tab.value === family` w `FamilyTabs`/`CategoryFilterBar`/`SubcategoryFilterBar` — dużo większy zasięg zmiany niż w Opcji 1.
- Stary, zapisany link z listą dwóch rodzin nie "dowie się" sam o trzeciej rodzinie dodanej później do grupy — trzeba by go przebudować w locie, co i tak wymaga tej samej mapy `FAMILY_GROUPS` co w Opcji 1, tylko po stronie klienta zamiast serwera.

### Option 3: Osobny parametr `group`, niezależny od `family`

`group=domy|wiecej-niz-dom` jako nowy, osobny wymiar filtra; `family` zostaje opcjonalnym doprecyzowaniem w ramach grupy (np. `group=wiecej-niz-dom&family=spa-modulowe`).

**Pros**:
- Najczystszy podział pojęciowy: grupa i konkretna rodzina to naprawdę dwa różne wymiary, żaden z nich nie udaje drugiego.

**Cons**:
- Wprowadza drugi wymiar URL tam, gdzie dziś jest jeden — każdy budowniczy linku (`SearchCard`, `FamilyTabs`, `buildResultsHref`) musi teraz ustawiać i utrzymywać spójność dwóch pól naraz, a ręcznie edytowany albo stary link może je rozjechać (grupa i rodzina wskazujące na sprzeczne rzeczy).
- Największa zmiana kształtu `ResultsFilter` z trzech rozważanych opcji, nieproporcjonalna do tego, że to wciąż jedna, prototypowa (Facade) funkcja.

## Rationale

Opcja 1 wygrywa, bo zasięg zmiany jest wprost proporcjonalny do tego, czym realnie jest ta decyzja: przeformułowaniem jednego, już istniejącego wymiaru wyszukiwania (rodzina produktu), a nie dodaniem nowego wymiaru do modelu danych. `family` jako pojedyncza wartość URL/filtra to dziś jedyne źródło prawdy używane przez `getProjects()`, `FamilyTabs`, `SearchCard` i trzy komponenty paska filtrów — Opcja 1 zostawia ten kontrakt nietknięty i tylko poszerza zbiór dozwolonych wartości, co wprost odpowiada wymaganiu rozszerzalności (AC-4): nowa rodzina w grupie to jedna linijka w `FAMILY_GROUPS`, nie zmiana typu w pięciu plikach jak w Opcji 2, i nie nowy wymiar URL jak w Opcji 3.

Warto dodać: `SubcategoryFilterBar.tsx` już dziś ma strażnika `if (filter.family !== "spa-modulowe" && filter.family !== "pergola") return null;` — nowa wartość `"wiecej-niz-dom"` naturalnie w niego wpada bez żadnej zmiany kodu, czyli jeden z kluczowych przypadków brzegowych (ukrycie podkategorii przy widoku łączonym) jest już dziś poprawnie obsłużony istniejącą logiką, co dodatkowo potwierdza, że Opcja 1 wpasowuje się w istniejący kształt kodu zamiast go przełamywać.

## References

Brak (poziom referencji: bez referencji, zgodnie z wyborem inżyniera podczas rozmowy projektowej).
