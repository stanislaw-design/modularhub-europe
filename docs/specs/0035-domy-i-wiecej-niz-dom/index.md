# 0035. Domy i Więcej niż dom: dwie grupy wyszukiwania

**Date**: 2026-09-11
**Status**: In Progress

## Summary

Dziś hero na stronie głównej i strona wyników pokazują trzy oddzielne, równe przyciski wyboru rodziny produktu (Domy, Pergole, SPA). Ta zmiana grupuje je na dwa poziomy, zgodnie z tym, co strona główna już dziś nazywa "Więcej niż dom": w hero zostają dwa proste przyciski, Domy i Więcej niż dom, a na stronie wyników dochodzi możliwość doprecyzowania do konkretnej podkategorii (Spa modułowe lub Pergole) albo obejrzenia obu naraz. Rodziny należące do grupy "Więcej niż dom" żyją odtąd w jednym wspólnym miejscu w kodzie, więc dodanie kolejnej w przyszłości nie wymaga przebudowy interfejsu wyszukiwania. Nie ma tu żadnej zmiany w bazie danych, tylko w warstwie wyszukiwania i interfejsu.

## Context

> ⚠️ Notatka o zakresie: to jedna, spójna decyzja (jak grupować rodzinę produktu w wyszukiwaniu, w hero i na wynikach naraz), nie kilka niezależnych. Pełne uzasadnienie, płytkość dzisiejszego katalogu spa/pergola i rozważone opcje techniczne są w [rationale.md](rationale.md), pominięte tu, bo `/develop` tej sekcji nie czyta.

## Requirements

**User stories**:
- Jako odwiedzający stronę główną, chcę od razu widzieć wyszukiwanie podzielone tak samo jak reszta strony (Domy / Więcej niż dom), żeby nie musieć uczyć się dwóch różnych podziałów tej samej oferty.
- Jako odwiedzający wyniki wyszukiwania, chcę móc zawęzić widok "Więcej niż dom" do konkretnie Spa modułowego albo Pergoli, zamiast przeglądać oba naraz.
- Jako producent lub osoba rozwijająca produkt w przyszłości, chcę, żeby dodanie nowej rodziny do grupy "Więcej niż dom" nie wymagało zmian w kilku niezależnych komponentach naraz.

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: Karta wyszukiwania w hero (`SearchCard.tsx`) pokazuje dokładnie dwie górne opcje rodziny, "Domy" i "Więcej niż dom", zamiast dzisiejszych trzech płaskich zakładek (Domy, Pergole, SPA).
- **AC-2**: Wybranie "Więcej niż dom" w hero i kliknięcie szukania prowadzi na `/wyniki` z parametrem `family=wiecej-niz-dom`; strona wyników pokazuje wtedy produkty ze wszystkich rodzin dziś należących do tej grupy (spa modułowe i pergola) połączone.
- **AC-3**: Na `/wyniki`, obok wyboru Domy / Więcej niż dom, można dalej zawęzić do jednej konkretnej podkategorii (Spa modułowe albo Pergole) albo wrócić do widoku łączonego, bez utraty już ustawionych filtrów kraju i powierzchni.
- **AC-4**: Przypisanie rodzin do grup żyje w jednym, typowanym miejscu w kodzie (nowa mapa `FAMILY_GROUPS`); dodanie kolejnej rodziny do grupy "Więcej niż dom" w przyszłości wymaga edycji tylko tej mapy, nie osobnej zmiany w `SearchCard.tsx`, `FamilyTabs.tsx` i `lib/results-filters.ts` każdym z osobna.
- **AC-5**: Pola Budżet i Powierzchnia w karcie wyszukiwania zachowują się dokładnie tak jak dziś (te same progi, ta sama widoczność) niezależnie od tego, która górna grupa jest aktywna.
- **AC-6**: `CategoryFilterBar` (chipy atrybutów domu) i `SubcategoryFilterBar` (chipy podkategorii spa/pergola) zachowują dzisiejsze reguły widoczności bez zmian; wybór łączony "Więcej niż dom" nie pokazuje żadnego z nich.
- **AC-7**: Nieznana lub nieprawidłowa wartość parametru `family` w URL nadal łagodnie pada na dzisiejszą wartość domyślną ("dom"), tak jak dziś.
- **AC-8**: Zmiana działa we wszystkich trzech dzisiejszych wersjach językowych (pl, en, nl), bez brakujących kluczy tłumaczeń.

## Decision

**Chosen option**: Option 1 z [rationale.md](rationale.md): jedna wartość `family` w URL/filtrze, rozszerzona o wartość specjalną grupy `"wiecej-niz-dom"`, rozwijaną po stronie serwera przez wspólną mapę `FAMILY_GROUPS`.

Wprowadzamy jeden nowy, typowany moduł (`FAMILY_GROUPS`), który jest jedynym źródłem prawdy o tym, jakie rodziny należą do grupy "Więcej niż dom"; `SearchCard`, `FamilyTabs` i `getProjects()` czytają z niego zamiast trzymać własne, osobne listy rodzin.

**Implementation skills**: `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Rationale

Pełne uzasadnienie wyboru i porównanie z dwiema odrzuconymi opcjami: [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
Brak zmian w bazie danych. Nowe typy TypeScript, bez migracji:
- `ProductFamilyGroup = "dom" | "wiecej-niz-dom"` — nowy, mały typ obok istniejącego `ProductFamily` (`lib/data/types.ts`).
- `FAMILY_GROUPS: Record<ProductFamilyGroup, ProductFamily[]>` = `{ dom: ["dom"], "wiecej-niz-dom": ["spa-modulowe", "pergola"] }` — jedno miejsce definiujące, które rodziny należą do której grupy.
- `FamilyFilterValue = ProductFamily | "wiecej-niz-dom"` — typ wartości, jaką może przyjąć `family` w URL/filtrze/interfejsie (poszerzenie dzisiejszego `ProductFamily` o sentinel grupy).

**State transitions**: nie dotyczy (brak maszyny stanów, to filtr wyszukiwania).

**API surface**: brak nowych endpointów. Istniejąca strona `/wyniki` (server component) i istniejąca funkcja `getProjects()` (`lib/data/projects.ts`) zyskują nową dozwoloną wartość parametru URL `family`.

| Powierzchnia | Zmiana |
|---|---|
| `GET /[locale]/klient/wyniki?family=wiecej-niz-dom` | Nowa dozwolona wartość `family`; `getProjects()` filtruje przez `inArray(product.family, FAMILY_GROUPS["wiecej-niz-dom"])` zamiast `eq(product.family, family)` |
| `GET /[locale]/klient/wyniki?family=dom` (i pozostałe dzisiejsze wartości) | Bez zmian |

**Key invariants**:
- `family` w `ResultsFilter` i w URL jest zawsze jedną z: `"dom"`, `"spa-modulowe"`, `"pergola"`, `"wiecej-niz-dom"`; każda inna wartość pada na `"dom"` (rozszerzenie dzisiejszego zachowania `parseResultsSearchParams`, AC-7).
- `CategoryFilterBar` renderuje się tylko, gdy `filter.family === "dom"` (bez zmian, już dziś tak działa).
- `SubcategoryFilterBar` renderuje się tylko, gdy `filter.family === "spa-modulowe"` albo `filter.family === "pergola"` (bez zmian, już dziś tak działa — wartość `"wiecej-niz-dom"` naturalnie w to nie wpada, patrz rationale.md).
- Budżet i Powierzchnia w `SearchCard` nie zależą od `activeCategory`/rodziny (bez zmian).
- `matchesResultsFilter` (dopasowanie lokalnych produktów producenta z `localStorage`, spec 0016) rozwiązuje `filter.family` przez `FAMILY_GROUPS` zamiast prostej równości, żeby lokalny podgląd zachowywał się tak samo jak zapytanie serwerowe.

**Security model**: nie dotyczy. Publiczne przeglądanie katalogu, bez logowania, bez nowych danych wrażliwych.

**Configuration required**: brak nowych zmiennych środowiskowych ani sekretów.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: na stronie głównej wybierz "Więcej niż dom" w hero i kliknij szukania → trafiasz na `/wyniki?family=wiecej-niz-dom` i widzisz produkty spa modułowe oraz pergola razem, weryfikuje **AC-1, AC-2**.
- Doprecyzowanie: na `/wyniki?family=wiecej-niz-dom&country=PL` kliknij podkategorię "Spa modułowe" → wynik zawęża się do samego spa modułowego, parametr `country=PL` zostaje zachowany, weryfikuje **AC-3**.
- Brzegowy: wejście na `/wyniki?family=nieznana-wartosc` łagodnie pada na `family=dom`, tak jak dziś przy jakiejkolwiek nieprawidłowej wartości, weryfikuje **AC-7**.
- Widoczność filtrów: na `/wyniki?family=wiecej-niz-dom` ani `CategoryFilterBar`, ani `SubcategoryFilterBar` się nie renderują, weryfikuje **AC-6**.
- Regresja: na `/wyniki?family=dom` i `/wyniki?family=spa-modulowe` wszystko działa dokładnie tak jak przed zmianą (żaden dzisiejszy link się nie psuje), weryfikuje **AC-7**.

## Build plan

Ten build siedzi już na prawdziwym, produkcyjnym zapleczu (Neon Postgres, spec 0023) — mimo że projekt domyślnie idzie ścieżką Facade (najpierw interfejs na danych przykładowych), tu nie ma czego udawać, bo `dom`, `spa-modulowe` i `pergola` już dziś istnieją jako prawdziwe rodziny z działającym filtrowaniem. Kolejność poniżej stawia więc wspólną mapę i warstwę danych na początku (żeby obie zmiany interfejsu od razu łączyły się z czymś prawdziwym, jedna cienka, kompletna "nić" na wylot), potem hero, potem wyniki, potem tłumaczenia i testy.

1. Dodaj `ProductFamilyGroup`, `FAMILY_GROUPS`, `FamilyFilterValue` (nowy mały moduł, np. `lib/product-family-groups.ts`, albo obok `ProductFamily` w `lib/data/types.ts`), satisfies **AC-4**
2. Rozszerz `lib/results-filters.ts`: `VALID_FAMILIES` o `"wiecej-niz-dom"`, typ `ResultsFilter.family` na `FamilyFilterValue`, `matchesResultsFilter` o rozwiązywanie przez `FAMILY_GROUPS`, satisfies **AC-2, AC-4, AC-7**
3. Rozszerz `getProjects()` (`lib/data/projects.ts`): gałąź filtra rodziny używa `inArray(...)` gdy `FAMILY_GROUPS[family]` ma więcej niż jedną wartość, satisfies **AC-2**
4. Przebuduj `SearchCard.tsx`: dwa górne przyciski (Domy / Więcej niż dom) zamiast trzech płaskich zakładek, `activeCategory` typu `FamilyFilterValue`, nowa ikona dla grupy łączonej, satisfies **AC-1, AC-5**
5. Przebuduj `FamilyTabs.tsx`: górny poziom Domy / Więcej niż dom plus drugi poziom (Wszystko / Spa modułowe / Pergole), widoczny gdy aktywna jest grupa "Więcej niż dom", z zachowaniem `country`/`sizeMin`/`sizeMax` w linkach, satisfies **AC-3, AC-6**
6. Dodaj brakujące klucze tłumaczeń w `messages/{pl,en,nl}.json` (`SearchCard`, `FamilyTabs`), usuń nieużywane klucze po starych trzech zakładkach, satisfies **AC-1, AC-3, AC-8**
7. Zaktualizuj/dopisz testy: `SearchCard.test.tsx`/`Hero.test.tsx` (jeśli dotyczy), `FamilyTabs` (nowy plik testowy, dziś go nie ma), `lib/results-filters.ts` i `lib/data/projects.test.ts` o przypadek `wiecej-niz-dom`, satisfies **AC-1, AC-2, AC-3, AC-7**

## Consequences

**Positive**:
- Wyszukiwanie (hero i wyniki) mówi wreszcie tym samym językiem grup co reszta strony głównej (`CategoryShowcase`), zamiast pokazywać inny podział 300 ms później przy przewijaniu.
- Dodanie kolejnej rodziny "stylu życia" w przyszłości to jedna linijka w `FAMILY_GROUPS`, nie zmiana w trzech komponentach naraz.
- Zero migracji bazy danych, jedno wdrożenie, w pełni odwracalne przez cofnięcie commita.

**Negative / tradeoffs**:
- `family`/`ResultsFilter.family` niesie odtąd wartość (`"wiecej-niz-dom"`), która nigdy nie występuje w tabeli `product` — każdy przyszły kod robiący ścisłe porównanie z konkretną rodziną musi o tym pamiętać (nie jest to jednak nowy wzorzec: `matchesResultsFilter` i `SubcategoryFilterBar` już dziś robią ścisłe porównania z `family`).
- Strona wyników zyskuje jeden dodatkowy stan interfejsu (grupa aktywna, żadna konkretna podkategoria niewybrana), którego dziś nie ma i który trzeba było zaprojektować i przetestować.
- Widok łączony "Więcej niż dom" jest dziś tak bogaty, jak najcieńsza rodzina za nim — dopóki katalog spa/pergola nie urośnie, to wciąż będzie blisko jednego przykładowego produktu na rodzinę (patrz notatka w [rationale.md](rationale.md)).

**Neutral**:
- `FAMILY_GROUPS` staje się drugim, obok `ProductFamily` (`lib/data/types.ts`), miejscem, o którym trzeba pamiętać przy dodawaniu lub usuwaniu rodziny produktu.
- Dzisiejsze zapisane/udostępnione linki `/wyniki?family=dom|spa-modulowe|pergola` działają bez zmian (rozszerzenie gramatyki URL, nic nie znika).

## Follow-up

- [ ] Ujednolicić `CategoryShowcase.tsx`'s `OutdoorFamily`/`FAMILY_IMAGES` (dziś własny, osobny `Extract<ProductFamily, "spa-modulowe" | "pergola">`) z nową mapą `FAMILY_GROUPS`, żeby dodanie rodziny wymagało jednej zmiany, nie dwóch osobnych list.
- [ ] Rozważyć wspólny licznik produktów przy przycisku/pigułce "Więcej niż dom" (np. "Więcej niż dom (2)"), gdy katalog spa modułowego i pergoli urośnie ponad symboliczną ilość; poza zakresem tego builda.
- [ ] Gdy do grupy "Więcej niż dom" dołączy naprawdę nowa rodzina produktu (poza spa i pergolą), potrzebuje własnego schematu Zod dla specyfikacji technicznej i pól w kreatorze producenta (wzorzec spec 0022) zanim trafi do `FAMILY_GROUPS` — ten spec przygotowuje tylko kształt wyszukiwania/URL, nie dodaje nowej rodziny.
