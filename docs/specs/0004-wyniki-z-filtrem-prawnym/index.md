# 0004. Wyniki z filtrem prawnym: strona przeglądania ofert

**Date**: 2026-08-13
**Status**: Accepted

## Summary

Ta specyfikacja projektuje stronę `/pl/klient/wyniki`, gdzie klient ląduje po wyszukaniu w hero strony głównej (spec 0003). Strona pokazuje listę domów modułowych jako karty z widełkami cenowymi, odfiltrowaną według kraju (tylko domy prawnie dopuszczalne, w pełni albo warunkowo) i opcjonalnie metrażu. Ustala wzorzec karty wyniku i sposób pokazywania statusu prawnego, na których oprze się dalsza część ścieżki klienta. Wszystko na danych mockowych, zgodnie z etapem Facade projektu.

## Requirements

**User stories**:
- Jako klient, który wybrał kraj i metraż w hero, chcę zobaczyć tylko domy, które faktycznie mogę tam postawić, żeby nie tracić czasu na oferty niedostępne prawnie.
- Jako klient przeglądający wyniki, chcę widzieć pełne widełki cenowe każdego domu (dom, transport, montaż razem), żeby móc od razu porównywać oferty.
- Jako klient, który trafił na wyniki bez wybranego kraju (np. z karty polecanego domu na stronie głównej), chcę zobaczyć wszystkie domy i dyskretną podpowiedź, że wybór kraju pokaże dopuszczalność prawną.
- Jako klient, który chce doprecyzować wyszukiwanie, chcę zmienić kraj albo metraż bezpośrednio na stronie wyników, bez powrotu do strony głównej.
- Jako klient, którego kryteria nie pasują do żadnego domu, chcę jasnego komunikatu i podpowiedzi, jak zmienić filtr, zamiast pustego ekranu.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Strona renderuje się pod `/pl/klient/wyniki`, odczytując parametry `country`, `sizeMin`, `sizeMax` z URL.
- **AC-2**: Gdy `country` jest obecny i to jeden z `PL`/`DE`/`NL`, na liście pokazują się wyłącznie projekty mające dla tego kraju wiersz eligibility ze statusem `approved` lub `conditional`; projekt bez wiersza dla tego kraju albo ze statusem `blocked` się nie pokazuje.
- **AC-3**: Gdy `country` jest nieobecny, filtr prawny nie jest stosowany i pokazują się wszystkie projekty, niezależnie od statusu w jakimkolwiek kraju.
- **AC-4**: Gdy `sizeMin` i/lub `sizeMax` są obecne i prawidłowe (jedna z wartości progu 50/100/150/200), pokazują się wyłącznie projekty, których `floorAreaM2` mieści się w tym przedziale domkniętym.
- **AC-5**: Nieprawidłowy `country` (spoza `PL`/`DE`/`NL`) jest ignorowany niezależnie od `sizeMin`/`sizeMax`: traktowany jak brak filtra kraju, bez błędu.
- **AC-6**: Nieprawidłowy `sizeMin` lub `sizeMax` (nie liczba, albo spoza progów 50/100/150/200) jest ignorowany niezależnie, pole po polu; jeśli po takim czyszczeniu oba pola są obecne, ale `sizeMin > sizeMax`, obie wartości są odrzucane (traktowane jak brak przedziału metrażu), zamiast zgadywać, które jest poprawne.
- **AC-7**: Każda karta wyniku pokazuje zdjęcie, nazwę, widełki cenowe (`priceMin`–`priceMax`, cena całkowita obejmująca dom, transport i montaż), producenta i kraj produkcji, metraż i liczbę sypialni; gdy `country` jest obecny i status danego projektu dla tego kraju to `conditional`, karta dodatkowo pokazuje odznakę (np. "Wymaga dodatkowych dokumentów").
- **AC-8**: Karta wyniku nie jest linkiem ani innym elementem nawigacyjnym w tej wersji ekranu.
- **AC-9**: Nagłówek wyników pokazuje liczbę dopasowanych projektów w poprawnej polskiej odmianie (1 dom / 2 do 4 domy / 5 i więcej domów); gdy `country` jest obecny, nagłówek nazywa kraj wprost (np. "12 domów dopuszczonych w Niemczech"); gdy `country` jest nieobecny, nagłówek nie wspomina kraju, ale zawiera dyskretną wskazówkę, że wybranie kraju pokaże dopuszczalność prawną.
- **AC-10**: Gdy żaden projekt nie pasuje do filtra, zamiast pustej siatki pokazuje się komunikat pustego stanu wraz z akcją ułatwiającą zmianę filtra.
- **AC-11**: Pasek filtra na górze strony pozwala zmienić kraj, metraż od i metraż do (te same pola co w hero), wypełniony aktualnymi wartościami z URL; zatwierdzenie aktualizuje URL i wyniki.
- **AC-12**: Wyniki są posortowane: najpierw projekty z `featured === true`, potem rosnąco po `priceMin`, w obrębie każdej z tych dwóch grup.
- **AC-13**: Pod paskiem filtra i nad siatką wyników renderuje się `CategoryFilterBar`, ten sam zdezaktywowany placeholder co na stronie głównej.
- **AC-14**: Strona spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1, wszystkie pola paska filtra są w pełni obsługiwane z klawiatury, elementy interaktywne mają widoczny fokus (`.focus-ring`).

## Decision

**Chosen option**: Option 1, pokaż `approved` i `conditional`, ukryj tylko `blocked`.

Wyniki pokazują projekty `approved` i `conditional` dla wybranego kraju, ukrywając tylko `blocked`, z widoczną odznaką na kartach `conditional`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Feature design

**Data model sketch**:
- Bez nowych encji. `Project`, `Country`, `EligibilityByCountry` (już w `lib/data/types.ts`) wystarczają.
- Doprecyzowanie semantyki: `Project.priceMin`/`priceMax` to już cena całkowita pakietu (dom plus transport plus montaż), nie sama cena domu. Ten sam sens obowiązuje wstecznie dla kart w `FeaturedHomes` (funkcja 4), bez zmiany ich kodu, tylko udokumentowania tutaj.
- Nowy kształt danych, nie encja: `ResultsFilter { countryCode?: CountryCode; sizeMin?: SizeThreshold; sizeMax?: SizeThreshold }`, produkowany przez nową funkcję parsującą (patrz Build plan krok 1).

**State transitions**: Nie dotyczy, strona statyczna bez cyklu życia.

**API surface** (interfejs strony, brak backendu, ten sam wzorzec co w spec 0003):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → strona wyników | Nawigacja (hero, karta polecanego domu, pasek filtra, ręcznie wpisany URL) | `country?`, `sizeMin?`, `sizeMax?` (surowe stringi z URL) | Lista projektów po zastosowaniu obu filtrów, nagłówek, ewentualny pusty stan | Brak (strona publiczna) | Nieprawidłowe wartości są łagodnie ignorowane pole po polu (patrz Kluczowe niezmienniki), nigdy błąd i nigdy pusta strona bez wyjaśnienia |
| `parseResultsSearchParams(searchParams)` | Wywołanie w `page.tsx` (serwer) | surowe wartości `searchParams` | `ResultsFilter` (oczyszczony) | Nie dotyczy | Zwraca pola `undefined` zamiast rzucać wyjątek; żaden przypadek nie jest błędem |
| `getProjects({countryCode?, sizeMin?, sizeMax?})` | Wywołanie funkcji dostępowej (serwer) | `ResultsFilter` | `Project[]` po filtrze kraju (`approved`/`conditional`) i metrażu | Nie dotyczy | Pusta tablica gdy nic nie pasuje, obsłużona przez pusty stan UI |
| `getEligibilityByCountry(countryCode)` | Wywołanie funkcji dostępowej (serwer), tylko gdy `country` obecny | `CountryCode` | `EligibilityByCountry[]` dla tego kraju | Nie dotyczy | Brak wiersza dla projektu traktowany jak brak odznaki, nie błąd |
| `ResultsFilterBar` → URL wyników | Nawigacja po stronie klienta (klik "Szukaj") | Nowe `country`/`sizeMin`/`sizeMax` wybrane w pasku | Przejście na `/pl/klient/wyniki` z nowymi parametrami | Brak (strona publiczna) | Ten sam mechanizm czyszczenia "do" mniejszego niż nowe "od" co w `Hero` (AC-4 spec 0003) |

**Kluczowe niezmienniki**:
- `country`, jeśli obecny po parsowaniu, jest zawsze jednym z `PL`/`DE`/`NL`.
- `sizeMin` i `sizeMax`, jeśli oba obecne po parsowaniu, spełniają `sizeMin <= sizeMax`; oba to wartości domknięte z listy progów 50, 100, 150, 200.
- Widoczność projektu = (brak `country`) LUB (istnieje wiersz eligibility dla pary projekt plus kraj ze statusem `approved` lub `conditional`), ORAZ (brak `sizeMin`/`sizeMax`) LUB (`floorAreaM2` w przedziale domkniętym).
- Odznaka `conditional` pokazuje się wyłącznie gdy `country` jest obecny (bez wybranego kraju nie ma jednego statusu do pokazania).
- Liczba w nagłówku używa poprawnej polskiej odmiany (1 dom / 2 do 4 domy / 5 i więcej domów).
- Sortowanie: `featured` malejąco (true przed false), potem `priceMin` rosnąco.

**Model bezpieczeństwa**: Strona publiczna, bez logowania, bez zbierania danych osobowych. Status prawnej dopuszczalności pokazywany tu jest danymi mockowymi, ilustracyjnymi, nie prawdziwą opinią prawną (patrz Follow-up o ewentualnym zastrzeżeniu). Brak zakresu zgodności regulacyjnej dla tej specyfikacji samej w sobie.

**Wymagana konfiguracja**: Brak nowych zmiennych środowiskowych.

**Krytyczne scenariusze testowe** (każdy odwołuje się do kryterium z Requirements):
- Happy path: `country=DE&sizeMin=50&sizeMax=100` pokazuje tylko projekty dopuszczone (`approved`/`conditional`) w Niemczech w tym przedziale metrażu, posortowane featured, potem cena, sprawdza **AC-1**, **AC-2**, **AC-4**, **AC-7**, **AC-12**.
- Przypadek brzegowy: `country=FR` (nieznany) i `sizeMin=50` — kraj ignorowany (wszystkie kraje), `sizeMin` nadal filtruje, sprawdza **AC-5**, **AC-6**.
- Przypadek brzegowy: `sizeMin=150&sizeMax=50` (odwrócone) — oba odrzucone, brak filtra metrażu, sprawdza **AC-6**.
- Treść: projekt "Baltyk Studio 38" z `country=NL` (status `conditional`) pokazuje odznakę na karcie, sprawdza **AC-2**, **AC-7**.
- Pusty wynik: `country=NL&sizeMin=200` (brak dopasowań) pokazuje komunikat pustego stanu z akcją zamiast pustej siatki, sprawdza **AC-10**.
- Auth/permission: brak autoryzacji, strona dostępna dla każdego odwiedzającego bez logowania, sprawdza **AC-1**.

## Build plan

1. [x] Dodaj `lib/results-filters.ts` z `parseResultsSearchParams()`: waliduje `country` (musi być `PL`/`DE`/`NL`) i `sizeMin`/`sizeMax` (muszą być jedną z wartości progu 50/100/150/200, a przy obu obecnych `sizeMin <= sizeMax`), z niezależnym odrzucaniem każdego złego pola, satisfies **AC-5**, **AC-6**
2. [x] Rozszerz `getProjects(filters)` w `lib/data/projects.ts` o opcjonalne `sizeMin`/`sizeMax`, filtrujące po `floorAreaM2` (przedział domknięty), zachowując istniejącą logikę filtra kraju (`approved`/`conditional` widoczne, `blocked` ukryty), satisfies **AC-2**, **AC-3**, **AC-4**
3. [x] Dodaj `getEligibilityByCountry(countryCode)` w `lib/data/projects.ts`, zwracającą wiersze eligibility dla danego kraju, do wyznaczenia odznaki `conditional` na karcie, satisfies **AC-7**
4. [x] Zbuduj `app/[locale]/klient/wyniki/page.tsx` (serwerowy komponent): sparsuj `searchParams`, pobierz kraje, przefiltrowane projekty i eligibility równolegle, posortuj (featured, potem cena), przekaż do komponentów niżej, satisfies **AC-1**, **AC-9**, **AC-12**
5. [x] Wydziel `SearchSegment` z `Hero.tsx` do współdzielonego `components/klient/SearchSegment.tsx` (bez zmiany zachowania, `Hero.tsx` zaczyna go importować), i zbuduj na nim `components/klient/ResultsFilterBar.tsx` (kliencki), wypełniony aktualnymi parametrami URL, z przyciskiem zatwierdzającym nawigację do nowych parametrów, reużywając logiki czyszczenia "do" mniejszego niż "od", satisfies **AC-11**
6. [x] Zbuduj `components/klient/ResultsHeader.tsx`: liczba wyników w poprawnej polskiej odmianie, opis z nazwą kraju albo bez niej, dyskretna wskazówka gdy brak `country`, satisfies **AC-9**
7. [x] Zbuduj `components/klient/ResultCard.tsx` (nie link): zdjęcie, nazwa, widełki cenowe, producent plus kraj, metraż plus sypialnie, `StatusPill` (wariant `conditional`) gdy dotyczy, reużywając `Card`/`Heading`/`Text`/`DataText`, satisfies **AC-7**, **AC-8**
8. [x] Zbuduj `components/klient/EmptyResults.tsx`: komunikat plus akcja czyszcząca albo zmieniająca filtr, satisfies **AC-10**
9. [x] Osadź istniejący `CategoryFilterBar` między paskiem filtra a siatką wyników na nowej stronie, satisfies **AC-13**
10. [x] Przejście dostępności: jeden H1 (np. w `ResultsHeader` albo `sr-only`, wzorem `Hero`), logiczna kolejność fokusa pasek filtra, potem karty, `.focus-ring` na każdym elemencie interaktywnym, weryfikacja względem WCAG 2.2 AA, satisfies **AC-14**

## Consequences

**Positive**:
- Ustala definitywny wzorzec karty wyniku (cena jako pakiet całkowity, odznaka statusu prawnego), z którego skorzystają kolejne funkcje ścieżki klienta (7 do 10).
- Rozwiązuje otwarte pytanie zostawione w komentarzu `getProjects()`: `conditional` jest teraz udokumentowaną, celową regułą, nie domysłem.
- Łagodna obsługa nieprawidłowych parametrów URL czyni stronę odporną na ręcznie wpisywane albo zapisane w zakładkach linki, zgodnie z charakterem strony publicznej.

**Negative / tradeoffs**:
- Karty nie są klikalne w tej wersji, więc użytkownik może przeglądać, ale nie wejść w szczegóły techniczne projektu z tego ekranu; luka zostaje otwarta do czasu przyszłej specyfikacji podstrony szczegółów albo funkcji 7 (shortlista).
- Pokazywanie projektów `conditional` na równi z `approved` (ta sama lista, tylko odznaka) oznacza świadomy wybór szerokości oferty nad ukrywaniem tarcia; część domów `conditional` wymaga dokumentów, których treść użytkownik zobaczy dopiero na ekranie dossier (funkcja 8), co przy przeoczeniu odznaki mogłoby wprowadzać w błąd.
- Brak paginacji: strona zakłada, że mały katalog mockowy (6 domów) pozostanie tej wielkości na tym etapie; wzrost katalogu będzie wymagał osobnej decyzji, zanim pojawi się prawdziwy inwentarz (już oznaczone w Deferred jako "full weight").

**Neutral**:
- Dwie nowe, małe funkcje dostępowe (`getEligibilityByCountry`, rozszerzony `getProjects`), bez żadnej trwałości za nimi, nadal mock, zgodnie z etapem Facade.
- Nowy pomocnik parsujący URL (`lib/results-filters.ts`) to jedyne miejsce tolerancji na błędne parametry; przyszłe filtry (np. realne podłączenie paska kategorii) mogą rozszerzyć ten sam wzorzec.
- `SearchSegment` zostaje wydzielony z `Hero.tsx` do wspólnego komponentu; `Hero.tsx` dostaje mały refaktor (sam import), bez zmiany zachowania.

## Follow-up

- [ ] Potwierdź z zamawiającym, czy ten ekran potrzebuje zastrzeżenia w stylu "to nie jest opinia prawna" (jak przyszła funkcja 13 "Gotowość eksportowa"), skoro pokazuje status prawnej dopuszczalności per kraj.
- [ ] `CategoryFilterBar` zostaje zdezaktywowanym placeholderem również tutaj; podłączyć realne filtrowanie dopiero po zaprojektowaniu jego własnej specyfikacji (patrz spec 0003, Follow-up).
- [ ] Karta wyniku nie prowadzi dziś nigdzie. Gdy powstanie specyfikacja podstrony szczegółów projektu, albo funkcja 7 (shortlista) zdefiniuje mechanizm wyboru, zweryfikuj, czy `ResultCard` powinien stać się linkiem albo dostać checkbox.

## Rationale

Pełne uzasadnienie, porównanie opcji i kontekst: patrz [rationale.md](rationale.md).
