# 0060. Podkategorie "Więcej niż dom" bezpośrednio w hero

**Date**: 2026-10-01
**Status**: In Progress

## Summary

Dziś karta wyszukiwania w hero strony głównej pokazuje dwie zakładki rodziny, Domy i Więcej niż dom (spec 0035), ale po wybraniu "Więcej niż dom" nie ma żadnego sposobu, żeby od razu wskazać, o którą konkretną kategorię stylu życia chodzi (Spa modułowe, Kontenery modułowe, Outdoor TV). Trzeba dopiero przejść na stronę wyników i tam dopiero zawęzić wybór. Ta zmiana dodaje trzy klikalne podkategorie bezpośrednio w hero, które po wybraniu od razu otwierają stronę wyników z gotowym filtrem, bez żadnego pośredniego kroku. Kosztem jest to, że dotychczasowa ścieżka do widoku łączonego (wszystkie trzy kategorie naraz) znika z hero, zostaje dostępna tylko ze strony wyników.

## Requirements

**User stories**:
- Jako odwiedzający stronę główną, który już wie, że interesuje go konkretna kategoria stylu życia (np. spa modułowe), chcę przejść prosto do przefiltrowanych wyników jednym kliknięciem, zamiast przechodzić przez widok połączony i dopiero tam zawężać.
- Jako producent lub osoba rozwijająca produkt, chcę, żeby dodanie kolejnej rodziny do grupy "Więcej niż dom" w przyszłości nie wymagało osobnej zmiany w tym nowym pasku skrótów, tylko edycji jednej wspólnej mapy (tak jak dziś działa to dla `FamilyTabs`).

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: Gdy w karcie wyszukiwania hero aktywna jest zakładka "Więcej niż dom", pola Gdzie/Budżet/Powierzchnia i przycisk Szukaj znikają, zastąpione rzędem trzech klikalnych linków, po jednym na każdą rodzinę dziś należącą do `FAMILY_GROUPS["wiecej-niz-dom"]` (Spa modułowe, Kontenery modułowe, Outdoor TV).
- **AC-2**: Kliknięcie jednego z tych linków od razu nawiguje na `/results?family=<ta rodzina>`, bez pośredniego kroku (bez klikania osobnego przycisku Szukaj) i bez wymogu wcześniejszego wyboru kraju.
- **AC-3**: Zakładka "Domy" (domyślna) działa dokładnie tak jak dziś: pola Gdzie/Budżet/Powierzchnia i przycisk Szukaj widoczne bez zmian, Szukaj nadal wymaga wybranego kraju.
- **AC-4**: Lista linków jest wyprowadzona z `FAMILY_GROUPS["wiecej-niz-dom"]` (ten sam współdzielony moduł co spec 0035 AC-4), nie z osobnej, zaszytej na sztywno listy w `SearchCard.tsx`; dodanie kolejnej rodziny do tej mapy w przyszłości automatycznie dodaje kolejny link, bez zmiany w `SearchCard.tsx`.
- **AC-5**: Widok łączony (wszystkie rodziny stylu życia naraz) przestaje być osiągalny bezpośrednio z hero; pozostaje osiągalny ze strony wyników (zakładka "Wszystko" w `FamilyTabs`, bez zmian). To świadoma zmiana względem spec 0035 AC-2/AC-5, które zakładały, że Szukaj i pola Budżet/Powierzchnia działają tak samo niezależnie od aktywnej zakładki hero; ten spec zawęża to zachowanie tylko do zakładki "Domy".
- **AC-6**: Zmiana działa we wszystkich trzech dzisiejszych wersjach językowych (pl, en, nl), bez brakujących kluczy tłumaczeń.
- **AC-7**: Linki są prawdziwymi, klawiaturowo obsługiwanymi elementami (nie przyciskami sterowanymi wyłącznie JS-em), z widocznym `.focus-ring`, w jednym rzędzie z przewijaniem poziomym na wąskich ekranach (ten sam wzorzec co dzisiejsze paski chipów).

## Decision

**Chosen option**: Option 1, podkategorie zastępują pola wyszukiwania w zakładce "Więcej niż dom".

`SearchCard.tsx` renderuje rząd linków wyprowadzony z `FAMILY_GROUPS["wiecej-niz-dom"]` (`lib/product-family-groups.ts`) zamiast pól Gdzie/Budżet/Powierzchnia i przycisku Szukaj, gdy ta zakładka jest aktywna; zakładka "Domy" zostaje bez zmian.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Feature design

**Data model sketch**: Brak zmian. Żadnych nowych encji ani pól; zmiana działa wyłącznie na istniejącym typowanym module `FAMILY_GROUPS`/`FamilyFilterValue` (spec 0035).

**API surface**: Brak nowego endpointu. Istniejąca strona `/results` i istniejący `parseResultsSearchParams` (`lib/results-filters.ts`) obsługują parametr `family` bez zmian; nowe linki tylko go ustawiają.

| Powierzchnia | Zmiana |
|---|---|
| Linki podkategorii w `SearchCard.tsx` → `/${locale}/results?family=<rodzina>` | Nowe, zwykła nawigacja klienta (`<Link>`), ten sam wzorzec co `FamilyTabs.hrefFor`, bez parametrów `country`/`sizeMin`/`sizeMax` |
| `/${locale}/results?family=dom` (zakładka Domy, Szukaj) | Bez zmian |

**Key invariants**:
- Rząd linków podkategorii renderuje się wtedy i tylko wtedy, gdy `resolveFamilyGroup(activeCategory) === "wiecej-niz-dom"` (ten sam resolver co `FamilyTabs`).
- Lista linków to zawsze `FAMILY_GROUPS["wiecej-niz-dom"]` odczytane programowo, nigdy osobna, zaszyta na sztywno tablica w `SearchCard.tsx` (AC-4).
- Gdy zakładka "Domy" aktywna, zachowanie karty (pola, Szukaj, wymóg kraju) jest identyczne jak przed tą zmianą.
- Kliknięcie linku podkategorii nigdy nie jest zablokowane brakiem wybranego kraju (inaczej niż przycisk Szukaj dla "Domy").

**Security model**: Nie dotyczy. Publiczna strona główna, bez logowania, bez nowych danych wrażliwych.

**Configuration required**: Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy mapuje się na kryterium w `## Requirements`):
- Happy path: na stronie głównej kliknij "Więcej niż dom", potem "Spa modułowe" → trafiasz od razu na `/results?family=spa-modulowe`, bez klikania Szukaj, weryfikuje **AC-1**, **AC-2**.
- Regresja celowa: kliknij "Więcej niż dom" bez wybierania kraju → linki podkategorii są mimo to klikalne i nawigują, weryfikuje **AC-2**.
- Regresja: zakładka "Domy" (domyślna) zachowuje się dokładnie jak dziś, Szukaj zablokowany bez kraju, weryfikuje **AC-3**.
- Rozszerzalność: test jednostkowy renderujący trzy linki z dzisiejszej zawartości `FAMILY_GROUPS["wiecej-niz-dom"]` zamiast z zaszytej na sztywno listy, weryfikuje **AC-4**.
- i18n: te same trzy testy uruchomione (albo odpowiednik) dla `en`/`nl` bez brakujących kluczy, weryfikuje **AC-6**.

## Build plan

Mała, jednowarstwowa zmiana czysto frontendowa (routing po stronie klienta, żadnego nowego zaplecza), więc kolejność jest prosta: najpierw tłumaczenia (żeby komponent miał z czego korzystać), potem sam komponent, na końcu testy.

1. Dodaj nowe klucze tłumaczeń w przestrzeni `SearchCard` w `messages/{pl,en,nl}.json` dla trzech etykiet podkategorii (te same teksty co już istniejące w przestrzeni `FamilyTabs`: Spa modułowe/Modular spas, Kontenery/Modular containers, Outdoor TV) plus etykieta `aria-label` nowego rzędu, satisfies **AC-6**
2. Przebuduj `SearchCard.tsx`: gdy `resolveFamilyGroup(activeCategory) === "wiecej-niz-dom"`, zamień rząd pól Gdzie/Budżet/Powierzchnia + Szukaj na rząd linków zbudowany iteracją po `FAMILY_GROUPS["wiecej-niz-dom"]` (import z `lib/product-family-groups.ts`), każdy `<Link>` prowadzący do `/${locale}/results?family=<rodzina>`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**
3. Zaktualizuj `SearchCard.test.tsx`: popraw dwa dzisiejsze testy, które zakładają, że Szukaj i pola Budżet/Powierzchnia działają niezależnie od aktywnej zakładki (spec 0035 AC-2/AC-5, teraz zawężone do zakładki Domy, AC-5 tego spec), dodaj nowe testy na nawigację z linków podkategorii bez wymogu kraju i na rozszerzalność z `FAMILY_GROUPS`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**

## Consequences

**Positive**:
- O dwa kliknięcia krócej dla kogoś, kto od razu wie, że interesuje go konkretna kategoria stylu życia.
- Zero zmian w bazie danych czy zapleczu, jedno wdrożenie, w pełni odwracalne cofnięciem jednego commita.
- Rozszerzalność dziedziczona wprost ze spec 0035: nowa rodzina w `FAMILY_GROUPS["wiecej-niz-dom"]` automatycznie dostaje swój link w hero.

**Negative / tradeoffs**:
- Widok łączony przestaje być osiągalny bezpośrednio z hero (AC-5); to świadomy koszt, akceptowalny bo zostaje w pełni dostępny ze strony wyników.
- Dwa dzisiejsze, zielone testy ze spec 0035 (`SearchCard.test.tsx`, AC-2 i AC-5) przestają być prawdziwe dla zakładki "Więcej niż dom" i wymagają poprawy w ramach tego builda, nie tylko dopisania nowych.
- Kraj/powierzchnia ustawione przed przełączeniem na "Więcej niż dom" nie przenoszą się na wyniki osiągnięte przez link podkategorii (pola i tak znikają z widoku, więc nic nie ginie z perspektywy użytkownika, ale warto o tym pamiętać przy przyszłych zmianach karty).

**Neutral**:
- Karta wyszukiwania ma teraz zauważalnie inny układ w zależności od aktywnej zakładki (pełny formularz kontra rząd linków), zamiast dzisiejszego stałego układu z jedynie innym parametrem `family` w tle.

## Follow-up

- [ ] Jeśli w przyszłości katalog spa/kontenery/outdoor TV urośnie na tyle, że sama rodzina przestanie wystarczać jako filtr wejściowy, rozważyć, czy link podkategorii w hero powinien nieść też głębszą podkategorię (Option 3 tego spec, dziś odrzucona jako przedwczesna).
- [ ] Rozważyć wskaźnik liczby produktów przy każdym linku podkategorii w hero (np. "Spa modułowe (3)"), ten sam odłożony pomysł co w spec 0035 Follow-up, teraz bardziej widoczny, bo linki są bezpośrednio klikalne bez pośredniego ekranu.
