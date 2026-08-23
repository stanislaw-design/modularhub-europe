# 0015. Redesign strony startowej w kierunku premium (jasny, oparty na zdjęciach)

**Date**: 2026-08-23
**Status**: In Progress

## Summary

Strona startowa (`/pl/klient`) zbudowana pod spec 0014 działa, ale wygląda jak klasyczny portal ogłoszeniowy: dużo ciemnych sekcji, mozaika sześciu zdjęć w hero, producenci pokazani samym tekstem, cena jako jeden suchy zakres. Ta specyfikacja zastępuje ją (supersedes 0014) wersją zaprojektowaną tak, żeby wyglądać jak droga, europejska platforma premium: jedno duże zdjęcie domu w hero, dużo białej przestrzeni, ciemny kolor zarezerwowany tylko dla zamykającego paska CTA, prawdziwe domy pokazane od razu po wyszukiwarce, karty producentów ze zdjęciem i oceną, i osobna, wyeksponowana sekcja Compliance Engine. Wprowadza jedną nową encję danych (Producer) i dwa nowe współdzielone komponenty (Accordion, StarRating).

## Requirements

**User stories**:
- Jako klient wchodzący na stronę główną, chcę od razu poczuć, że to premium, zaufana platforma (nie portal ogłoszeniowy), zanim jeszcze zacznę cokolwiek klikać.
- Jako klient, chcę wyszukać dom od razu z poziomu hero, bez czytania sekcji wstępnych, bo traktuję tę stronę jak narzędzie, nie jak stronę do przeczytania.
- Jako klient przeglądający stronę główną, chcę zobaczyć prawdziwe domy (zdjęcie, metraż, cena) zaraz po wyszukiwarce, żeby produkt zaczął się sam sprzedawać, zanim przeczytam cokolwiek o marce.
- Jako klient rozważający budowę w innym kraju niż kraj producenta, chcę zobaczyć, na czym polega sprawdzanie zgodności z lokalnym prawem, żeby zrozumieć, dlaczego ta platforma różni się od kupowania wprost od producenta.
- Jako klient porównujący oferty, chcę widzieć cenę rozbitą na dom / transport / montaż tam, gdzie znam już kraj docelowy, żeby rozumieć z czego się składa całkowity koszt.
- Jako klient rozważający konkretnego producenta, chcę zobaczyć jego zdjęcie realizacji, ocenę i kraje dostawy, nie tylko nazwę, żeby ocenić wiarygodność przed wysłaniem zapytania.
- Jako klient z pytaniami przed rozpoczęciem, chcę sekcji FAQ i prawdziwych opinii innych klientów, żeby nabrać pewności bez kontaktowania się z nikim.
- Jako producent rozważający platformę, chcę oczywistego linku do rejestracji z poziomu strony głównej klienta, tak jak dziś.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):

- **AC-1**: `SiteHeader` renderuje się na jasnym tle (nie `--brand-v4-night`), pozostaje sticky, z dokładnie tym samym zestawem elementów nawigacji co dziś (Domy, Producenci, Projekty, Inspiracje, Jak to działa, O nas, przełącznik języka, Ulubione, Zaloguj się, Zacznij) i tą samą regułą realne-linki-vs-disabled-placeholdery co spec 0014 AC-1 — zmienia się wyłącznie warstwa wizualna (tokeny v5 zamiast v4), nie zestaw linków ani ich stan.
- **AC-2**: Hero renderuje się z **jednym** dużym zdjęciem domu (nie mozaiką wielu zdjęć jak dziś), zachowuje niezmieniony h1 („Twój dom. Mądrze wybrany.”), akapit i trzy odznaki zaufania z dzisiejszego `Hero.tsx`. Dwa przyciski akcji z dzisiejszej wersji (scroll do karty wyszukiwania, link do `/pl/producent`) zostają bez zmian zachowania.
- **AC-3**: Karta wyszukiwania renderuje się wewnątrz/nachodząc na hero bez własnego nagłówka „Znajdź idealny dom dla siebie” (usunięty razem z podpisem „Ponad 1000 projektów…”) — wygląda jak jeden pasek narzędziowy, nie osobna sekcja ze wstępem. Zachowuje dokładnie dzisiejsze trzy pola (Gdzie, Budżet jako `disabled` placeholder, Powierzchnia) i identyczny kontrakt nawigacji do `/wyniki` (`country`, `sizeMin`, `sizeMax`) z dzisiejszego `SearchCard.tsx` — zero zmiany zachowania, tylko usunięcie nagłówka i wizualny restyle.
- **AC-4**: Nowa sekcja „Popularne domy” renderuje się jako druga sekcja strony (zaraz po hero), pokazując projekty z `Project.featured === true` z istniejących fixture'ów, każdy jako karta z dedykowanym, nowym komponentem (zdjęcie, nazwa, `floorAreaM2` m² · `rooms` pokoi · nazwa kraju z flagą emoji, cena jako „od €{priceMin}”). Każda karta linkuje do `/pl/klient/wyniki` (bez parametrów — nie istnieje dziś trasa pojedynczego projektu). Sekcja jawnie podpisana jako ilustracyjna (nie realna analityka wyświetleń), zgodnie z tym, że `featured` już oznacza „polecane” w kodzie (spec 0004 AC-12). Bez przycisków Zapisz/Porównaj (nie istnieją dziś w produkcie).
- **AC-5**: `CategoryShowcase` (kategorie domów) renderuje się bez zmiany treści i zachowania (4 karty, link do nieprzefiltrowanych `/wyniki`), przeniesiona na trzecią pozycję, restylowana na jasne tło (tokeny v5) zamiast dzisiejszego `--brand-v4-night`.
- **AC-6**: Nowa sekcja Compliance Engine renderuje jeden, zaszyty na sztywno przykład (dom „Nordic 126”, lokalizacja „Venlo”), z listą pięciu punktów (Konstrukcja, Izolacja, Wentylacja, Dokumentacja — ze znacznikiem spełnione; Lokalne pozwolenie — ze znacznikiem ostrzeżenia), wynikiem „92% zgodności” i przyciskiem „Sprawdź dom →” linkującym do `/pl/klient/wyniki`. Stylistyka wyraźnie odróżnia się od reszty strony (ciemna karta na jasnym tle sekcji, monospace na liczbach i etykietach punktów przez istniejący `DataText`), tak żeby czytać się jak produkt technologiczny (SaaS), nie jak zwykły kafelek korzyści. Treść jawnie oznaczona jako ilustracyjna (nie realne dane `EligibilityByCountry`).
- **AC-7**: Nowa sekcja „Jak działa ModularHub” renderuje pięcioetapowy wyjaśniacz całej ścieżki klienta (Szukaj → Porównaj → Sprawdź zgodność → Zapytaj o oferty → Odbierz dom), treść statyczna, różna od trzykrokowego skrótu w zamykającym CTA (AC-10), który dotyczy wyłącznie etapu zapytania o oferty.
- **AC-8**: Nowa sekcja „Porównaj domy” renderuje marketingową zapowiedź funkcji porównywania (treść + wizualne zestawienie 2–3 przykładowych domów obok siebie, dane z istniejących fixture'ów), z przyciskiem prowadzącym do `/pl/klient/wyniki`, gdzie realne zaznaczanie do 3 projektów już działa (spec 0004/0005). Bez nowej logiki porównywania na stronie głównej.
- **AC-9**: Nowa sekcja „Zweryfikowani producenci” zastępuje dzisiejszy przewijany pasek nazw (`TrustedProducers`) siatką kart, jedna karta na każdego z trzech producentów z fixture'ów (odczytanych z nowej encji `Producer`, patrz Feature design): stylizowany napis z nazwą producenta (nie prawdziwe logo — patrz Feature design), flaga kraju, ocena gwiazdkowa i liczbowa, liczba modeli, zakres metrażu, flagi krajów dostawy, odznaka „Zweryfikowany przez ModularHub ✓” i jedno zdjęcie realizacji (jedno z istniejących zdjęć projektów tego producenta). Przycisk „Zobacz wszystkich producentów” zostaje widoczny, ale `disabled` — tak jak dziś, bez nowej strony katalogu.
- **AC-10**: Zamykający pasek CTA (`ClosingCta`, „Otrzymaj 3 dopasowane oferty w 48 godzin”) renderuje się bez zmiany treści i zachowania względem dzisiejszej wersji, na tym samym ciemnym tle — jedyna sekcja strony, która świadomie zostaje ciemna.
- **AC-11**: Nowa sekcja „Opinie” renderuje 4 do 6 statycznych, mockowych opinii klientów (imię, kraj, ocena gwiazdkowa, krótki cytat po polsku), każda z gwiazdkami renderowanymi przez nowy współdzielony komponent `StarRating` (read only, `components/ui/`).
- **AC-12**: Nowa sekcja FAQ renderuje 5 do 8 statycznych pytań i odpowiedzi jako rozwijaną listę, zbudowaną na nowym współdzielonym komponencie `Accordion` (`components/ui/`, oparty o Headless UI `Disclosure`, ten sam wzorzec dostępności co istniejący `Select` na `Listbox`).
- **AC-13**: Po wdrożeniu `/pl/klient` nie renderuje już: `StatsBar` (pasek statystyk), `WhyUs` („Dlaczego ModularHub Europe?”), `TrustedProducers` (zastąpiony przez AC-9) ani `TrustFooterRow` (rząd zaufania na dole) — usuwane są te komponenty i ich importy w `app/[locale]/klient/page.tsx`. Treść, którą niosły, jest wchłonięta przez inne sekcje (Compliance Engine, Porównaj domy, rozbita cena, Opinie) zgodnie z zasadą „jedna sekcja, jedna myśl”.
- **AC-14**: Na `/pl/klient/wyniki`, gdy parametr `country` jest obecny w URL, `ResultCard` renderuje rozbitą cenę: „Dom: od €{housePriceMinEur}”, „Transport do {nazwa kraju}: ~€{mockowa stawka}”, „Montaż: ~€{mockowa stawka}”, „Razem: od €{suma}” — zamiast dzisiejszego jednego zakresu „Szacowany pakiet”. Gdy `country` jest nieobecny, karta zachowuje dzisiejszy jeden zakres bez zmian (nie da się policzyć transportu/montażu bez kraju docelowego).
- **AC-15**: Strona spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1, link „Przejdź do treści” jako pierwszy element w kolejności Tab, wszystkie `disabled` placeholdery mają realny atrybut `disabled`/`aria-disabled`, obrazy dekoracyjne mają puste `alt`, obrazy znaczące mają opisowy `alt`, `Accordion` ma poprawne `aria-expanded`/powiązanie nagłówek-panel, kontrast tekstu na tle `--brand-v5-night` i `--brand-v5-amber` spełnia 4.5:1 (tekst) / 3:1 (elementy nietekstowe) — te same reguły kontrastu co dziś (spec 0013 nie się zmienia, wartości v5 są tymi samymi kolorami).
- **AC-16**: Układ jest responsywny: hero i karta wyszukiwania układają się pionowo na wąskich ekranach, Popularne domy i Porównaj domy przewijają się poziomo lub układają w jedną kolumnę, siatka kategorii i siatka producentów do jednej/dwóch kolumn, Compliance Engine karta zostaje czytelna na wąskim ekranie, FAQ zachowuje pełną szerokość dotykową dla nagłówków rozwijania.

## Decision

**Chosen option**: Option 1: Pełny redesign według briefu zamawiającego.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`, dla nowego `Accordion` opartego o `Disclosure`)

## Rationale

Pełne uzasadnienie, opcje rozważone i szczegóły rozmowy projektowej: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Nowa encja `Producer` w `lib/data/types.ts`:

| Pole | Typ | Wymagane | Uwagi |
|---|---|---|---|
| `id` | `string` | tak | klucz główny, np. `"prod-modulor"` — dokładnie te same trzy ID, które `Project.producerId` już dziś używa |
| `name` | `string` | tak | musi odpowiadać istniejącym `producerName` z fixture'ów projektów |
| `countryCode` | `CountryCode` | tak | kraj siedziby/produkcji |
| `rating` | `number` | tak | 0.0–5.0, jedna liczba po przecinku |
| `reviewCount` | `number` | tak | liczba opinii (ilustracyjna) |
| `modelsCount` | `number` | tak | liczba modeli w ofercie (ilustracyjna) |
| `sizeRangeM2Min` | `number` | tak | dolna granica metrażu oferty |
| `sizeRangeM2Max` | `number` | tak | górna granica metrażu oferty |
| `deliveryCountries` | `CountryCode[]` | tak | podzbiór `["PL","DE","NL"]` |
| `featuredPhotoUrl` | `string` | tak | jedno ze zdjęć realizacji producenta, reużyte z `Project.coverImageUrl` istniejących projektów tego producenta |
| `verified` | `boolean` | tak | dziś zawsze `true` dla wszystkich trzech mockowych producentów |

Relacja: `Project.producerId` (istniejące pole) → `Producer.id`, kardynalność 1 Producer : N Project. Bez zmiany schematu `Project` — pole już istnieje.

**Świadomie bez `logoUrl`**: żadne pliki logo producentów nie istnieją w projekcie, a wymyślanie graficznych logo dla fikcyjnych firm ryzykuje wyglądać jak prawdziwa marka (to samo ryzyko, które spec 0014 AC-8 już odnotowała dla nazw producentów). Karta producenta renderuje stylizowany napis z nazwą (większy, bardziej wyeksponowany niż dzisiejszy przewijany tekst), nie plik graficzny.

Testimoniale i FAQ **nie** dostają wpisu w `lib/data/types.ts` — zostają statyczną treścią lokalną w komponencie, dokładnie jak dzisiejszy `StatsBar.tsx` (`const stats = [...]`). To już ustalony w projekcie podział: dane domenowe (relacje, filtrowanie, wielokrotne użycie) w `lib/data/`, treść marketingowa lokalnie w komponencie.

**Nowe pliki danych**: `lib/data/fixtures/producers.ts` (trzy rekordy, kluczowane istniejącymi `producerId`), `lib/data/producers.ts` (`getProducers(): Promise<Producer[]>`, asynchroniczna od startu, ta sama konwencja co każda inna funkcja dostępowa w projekcie).

**Nowe współdzielone komponenty** (`components/ui/`):
- `Accordion`: oparty o Headless UI `Disclosure` (biblioteka już jest zależnością projektu, używana przez `Select`), więc pełna obsługa klawiatury i `aria-expanded` za darmo. Pierwszy realny współdzielony wzorzec rozwijanej listy w projekcie (dziś lokalny wzorzec istnieje tylko w `ExportReadinessCountryRow` i `PlotDossierPanel` — ten spec go nie zmienia, tylko nie kopiuje po raz trzeci).
- `StarRating`: prosty, tylko do odczytu (`rating: number`, opcjonalnie `reviewCount`), renderuje wypełnione/puste ikony `Star` z `lucide-react` — dokładnie ten sam wizualny wzorzec, który dziś jest zaszyty bezpośrednio w `StatsBar.tsx` (linie 28–32), tylko wydzielony do wspólnego użycia (karty producentów, opinie).

**Zasoby (obrazy)**: zero nowych plików. Wszystkie sekcje reużywają sześć istniejących zdjęć w `public/images/houses/golden-hour/` (już wykorzystywanych przez `Hero`, `CategoryShowcase` i `ClosingCta` dziś): jedno jako duże zdjęcie hero (np. `baltyk-loft-120.webp`, dziś już największy kafelek mozaiki), po jednym na kartę w Popularne domy i Porównaj domy (z `Project.coverImageUrl`), po jednym na producenta w karcie Zweryfikowani producenci (`Producer.featuredPhotoUrl`, jedno z dwóch zdjęć projektów tego producenta).

**Tokeny v5** (`assets/tokens/brand-v5-tokens.css`/`.json`, nowy plik zarejestrowany w `app/globals.css` obok istniejących v3/v4 importów): te same wartości hex co v3/v4 (patrz Rationale), nowe nazwy aliasów gdzie domyślna powierzchnia jest jasna:

```
--brand-v5-paper: #ffffff       /* domyślne tło strony i większości sekcji */
--brand-v5-surface: #ffffff     /* powierzchnia kart */
--brand-v5-ink: #000000         /* główny tekst, nagłówki */
--brand-v5-muted: #4d5562       /* graphite, tekst drugorzędny — ta sama wartość co --brand-technical-graphite */
--brand-v5-night: #000000       /* zarezerwowane wyłącznie dla ClosingCta */
--brand-v5-amber: #fca311
--brand-v5-amber-strong: #e89200
--brand-v5-amber-foreground: #000000
--brand-v5-line: #e5e5e5
--brand-v5-radius-card: 16px    /* świadomie mniejszy niż v4 (20px) — "delikatnie zaokrąglone", nie bąblowate */
--brand-v5-radius-panel: 24px
--brand-v5-radius-pill: 999px
```

**Rozbita cena na `/wyniki`** (AC-14): nowa funkcja `getMockAssemblyPriceEur(countryCode)` w `lib/pricing.ts`, ten sam wzorzec co już istniejące `getMockTransportPriceEur` (stała mockowa stawka per kraj docelowy, jawnie oznaczona jako placeholder). Dom = `project.commercial.housePriceMinEur` (już istnieje, cena samego budynku bez logistyki). `ResultCard` dostaje nowy opcjonalny prop `countryCode?: CountryCode`; strona `/wyniki` przekazuje go, gdy `country` jest w URL. **Świadomie nie zmieniamy** `Project.priceMin`/`priceMax` ani logikę `getBindingOfferPriceEur` (feature 9, już `done`) — rozbita cena na `/wyniki` to dodatkowy, osobny szacunek, nie przeliczenie już ustalonego zakresu (patrz Consequences, ta rozbieżność jest świadomym kompromisem, nie błędem).

**Klucz komponentów strony (kolejność, AC referencja)**:
1. `SiteHeader` (restyle v5) — AC-1
2. `Hero` (jedno zdjęcie, restyle v5) + `SearchCard` (bez nagłówka, restyle v5) — AC-2, AC-3
3. `PopularHomes` (nowy, + nowy komponent karty) — AC-4
4. `CategoryShowcase` (restyle v5, bez zmiany zachowania) — AC-5
5. `ComplianceEngineShowcase` (nowy) — AC-6
6. `HowItWorksExplainer` (nowy) — AC-7
7. `CompareHomesTeaser` (nowy) — AC-8
8. `ProducerShowcase` (nowy, zastępuje `TrustedProducers`) — AC-9
9. `ClosingCta` (bez zmian) — AC-10
10. `Testimonials` (nowy) — AC-11
11. `Faq` (nowy) — AC-12

**Komponenty do usunięcia** (żaden nie ma innego konsumenta poza dzisiejszą stroną startową): `components/klient/StatsBar.tsx`, `components/klient/WhyUs.tsx`, `components/klient/TrustedProducers.tsx`, `components/klient/TrustFooterRow.tsx`.

**Kluczowe niezmienniki**:
- Kontrakt URL do `/wyniki` (`country`, `sizeMin`, `sizeMax`) pozostaje identyczny — ta specyfikacja nie zmienia sposobu zbierania wartości w karcie wyszukiwania (już ustalony w spec 0014), tylko usuwa jej nagłówek i restyluje.
- `SearchSegment`, `CategoryFilterBar` nie zmieniają publicznego API — `/wyniki` używa ich dalej bez zmian.
- Żadna nowa sekcja nie zapisuje ani nie czyta niczego trwałego poza istniejącym stanem karty wyszukiwania.
- `Producer.id` musi zawsze odpowiadać istniejącemu `Project.producerId` — referencyjna spójność w nowym fixture, nie nowe, niepowiązane dane.

**Security model**: strona publiczna, bez logowania, bez zbierania danych osobowych — bez zmian względem spec 0014.

**Configuration required**: brak nowej konfiguracji zewnętrznej; zero nowych hostów obrazów (wszystko lokalne).

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wybór kraju i przedziału powierzchni w karcie wyszukiwania, klik „Szukaj domów”, lądowanie na `/pl/klient/wyniki` z poprawnymi parametrami — niezmienione zachowanie, sprawdza **AC-3**.
- Treść: sekcja Popularne domy pokazuje wyłącznie projekty z `featured === true`, w liczbie zgodnej z danymi mocka, sprawdza **AC-4**.
- Cena: na `/wyniki?country=NL` karta pokazuje cztery pozycje (Dom/Transport/Montaż/Razem); na `/wyniki` bez `country` karta pokazuje dzisiejszy pojedynczy zakres, sprawdza **AC-14**.
- Referencyjna spójność: każda karta w sekcji Zweryfikowani producenci odpowiada dokładnie jednemu `producerId` obecnemu w fixture'ach projektów, żadnego osieroconego ani zmyślonego producenta, sprawdza **AC-9**.
- Dostępność: `Accordion` w FAQ poprawnie przełącza `aria-expanded` i jest w pełni obsługiwalny klawiaturą (Tab, Enter/Spacja), sprawdza **AC-12**, **AC-15**.
- Regresja: `/pl/klient/wyniki` (spec 0004) renderuje się i filtruje dokładnie tak jak przed tą zmianą poza samą kartą (AC-14), bez modyfikacji `ResultsFilterBar`/`CategoryFilterBar`/`SearchSegment`, sprawdza niezmiennik współdzielonych komponentów.
- Regresja: `e2e/wyniki.spec.ts` (przepisany pod spec 0014, dziś nawiguje przez `SearchCard`) dalej przechodzi bez zmian w logice nawigacji, tylko ewentualnie w selektorach DOM zmienionych przez usunięcie nagłówka karty wyszukiwania (AC-3).

## Build plan

1. Utwórz `assets/tokens/brand-v5-tokens.css`/`.json` (tabela z Feature design) i zarejestruj w `app/globals.css` obok istniejących importów v3/v4 — warunek wstępny dla wszystkich kolejnych kroków wizualnych
2. Utwórz encję `Producer` w `lib/data/types.ts`, fixture `lib/data/fixtures/producers.ts` (trzy rekordy kluczowane istniejącymi `producerId`), `lib/data/producers.ts` (`getProducers()`) — warunek wstępny dla kroku 9
3. Zbuduj współdzielone `components/ui/Accordion.tsx` (Headless UI `Disclosure`) i `components/ui/StarRating.tsx`, dodaj do `components/ui/index.ts` — warunek wstępny dla kroków 6, 10, 11, 12
4. Restyluj `SiteHeader` na tokeny v5 (jasne tło), bez zmiany elementów nawigacji, satisfies **AC-1**
5. Przebuduj `Hero`: jedno zdjęcie zamiast mozaiki, tokeny v5, bez zmiany h1/akapitu/odznak/przycisków; przebuduj `SearchCard`: usuń wewnętrzny nagłówek, restyle v5, bez zmiany pól i kontraktu nawigacji, satisfies **AC-2**, **AC-3**
6. Zbuduj `PopularHomes` i jego dedykowany komponent karty (zdjęcie, nazwa, metraż, pokoje, kraj z flagą, cena „od €X”), filtrujący `featured === true`, satisfies **AC-4**
7. Restyluj `CategoryShowcase` na tokeny v5 (jasne tło), przenieś na trzecią pozycję, bez zmiany treści/zachowania, satisfies **AC-5**
8. Zbuduj `ComplianceEngineShowcase` (statyczny przykład Nordic 126 / Venlo, lista punktów, wynik 92%, przycisk do `/wyniki`), satisfies **AC-6**
9. Zbuduj `HowItWorksExplainer` (pięcioetapowy wyjaśniacz), satisfies **AC-7**
10. Zbuduj `CompareHomesTeaser` (treść + zestawienie 2–3 domów z fixture'ów, link do `/wyniki`), satisfies **AC-8**
11. Zbuduj `ProducerShowcase`, konsumujący `getProducers()` i dopasowujący projekty przez `producerId` (siatka kart: nazwa, flaga, `StarRating`, liczba modeli, zakres metrażu, flagi krajów dostawy, odznaka zweryfikowany, zdjęcie realizacji), zastępujący `TrustedProducers` w `app/[locale]/klient/page.tsx`, satisfies **AC-9**
12. Zbuduj `Testimonials` (4 do 6 mockowych opinii, `StarRating`), satisfies **AC-11**
13. Zbuduj `Faq` (5 do 8 par pytanie/odpowiedź na `Accordion`), satisfies **AC-12**
14. Usuń `StatsBar.tsx`, `WhyUs.tsx`, `TrustedProducers.tsx`, `TrustFooterRow.tsx` i ich importy; przepisz `app/[locale]/klient/page.tsx` do nowej kolejności jedenastu sekcji, satisfies **AC-13**
15. Dodaj `getMockAssemblyPriceEur()` do `lib/pricing.ts`; dodaj `countryCode` prop do `ResultCard`, warunkową rozbitą cenę; przekaż `country` z URL w `app/[locale]/klient/wyniki/page.tsx`, satisfies **AC-14**
16. Przejście dostępności: jeden H1, skip link pierwszy w kolejności Tab, `disabled`/`aria-disabled`, `alt` na obrazach, `aria-expanded` na `Accordion`, kontrast tokenów v5, satisfies **AC-15**
17. Przejście responsywności: wszystkie nowe i zrestylowane sekcje na wąskich ekranach, satisfies **AC-16**

## Consequences

**Positive**:
- Strona startowa przestaje wyglądać jak portal ogłoszeniowy: jedno duże zdjęcie, dużo bieli, jeden zdyscyplinowany akcent koloru, prawdziwe domy widoczne od razu po wyszukiwarce.
- Compliance Engine™ dostaje wizualną wagę odpowiadającą temu, że to realna przewaga konkurencyjna, nie jedna z czterech równorzędnych korzyści.
- Wprowadza pierwszą realną encję `Producer` — krok w stronę modelu danych, który był świadomie odłożony w spec 0002 („Deferred on purpose: a Producer entity beyond Project.producerId/producerName”).
- Dwa nowe współdzielone komponenty (`Accordion`, `StarRating`) domykają braki w bibliotece, które i tak trzeba było uzupełnić przy pierwszej sekcji, która ich potrzebuje.

**Negative / tradeoffs**:
- Rozbita cena na `/wyniki` (AC-14) to osobny szacunek (dom + mockowy transport + mockowy montaż), który **nie musi sumować się dokładnie** do już ustalonego `Project.priceMin`/`priceMax` (użytego np. w `BindingOfferView`, feature 9, `done`). To świadomy kompromis: przeliczenie istniejącego zakresu ryzykowałoby regresję w już zweryfikowanym kroku oferty wiążącej; dwa lekko rozbieżne szacunki w ścieżce klienta (jeden na liście wyników, inny przy wiążącej ofercie) są akceptowalne na etapie Facade, gdzie żaden z nich nie jest ostateczną, wiążącą liczbą.
- Duży jednorazowy zasięg zmiany: 4 komponenty usunięte, 6 nowych, 4 zmodyfikowane, jedna nowa encja, jeden nowy plik tokenów — większe ryzyko regresji niż punktowa poprawka.
- `assets/tokens/brand-v4-tokens.css` (spec 0013) traci swojego jedynego konsumenta (dzisiejsza strona startowa) — plik zostaje w repozytorium nieużywany, dopóki ktoś świadomie nie zdecyduje, czy go usunąć, czy zachować na przyszłość (patrz Follow-up).
- Karty producentów (AC-9) pokazują ocenę, liczbę opinii, liczbę modeli — wszystko liczby ilustracyjne, nie realne dane, tak jak dzisiejszy pasek statystyk był ilustracyjny; to samo ryzyko nadinterpretacji przez klienta, tylko przeniesione na poziom pojedynczego producenta.
- Testy komponentów dla `Hero`, `SiteHeader`, `CategoryShowcase`, `SearchCard` nie istnieją dziś (`components/klient/*.test.tsx` ich nie obejmuje) — więc nie ma nic do „przepisania” na poziomie komponentu przy tej zmianie, tylko do napisania od zera (`/test`).

**Neutral**:
- Strona startowa staje się pierwszym i na razie jedynym konsumentem tokenów v5; reszta produktu (włącznie z `/wyniki` poza samą kartą ceny) zostaje na v3.
- `components/klient/AGENTS.md` będzie wymagał aktualizacji po zbudowaniu (nowa lista komponentów, nowe governing spec) — zadanie `/sync`.

## Migration plan

**Strategy**: big bang (bezpośrednia podmiana w jednym przejściu `/develop`), ta sama logika co spec 0014.

**Uzasadnienie**: prototyp demonstracyjny bez realnych użytkowników w trakcie sesji i bez trwałych danych do zepsucia (`docs/scope/scope.md`: „żaden ekran nic trwale nie zapisuje”). Stopniowe współistnienie starej i nowej strony startowej nie chroniłoby niczego realnego.

**Phases**:
1. Fundament (Build plan kroki 1–3): tokeny v5, encja `Producer`, nowe współdzielone komponenty — zero zmiany widocznej treści.
2. Restyle i nowe sekcje (kroki 4–13): strona startowa przechodzi na nową strukturę; `/wyniki` i reszta produktu nietknięte poza krokiem 15.
3. Sprzątanie (krok 14): usunięcie martwego kodu, dopiero po tym, jak krok 2 jest gotowy i nic więcej go nie potrzebuje.
4. Rozbita cena na `/wyniki` (krok 15): osobna, ostatnia zmiana poza granicą jednego ekranu, żeby ułatwić rollback tylko tej części, gdyby była potrzebna.

**Rollback**: `git revert` commitów tej zmiany; brak migracji danych do cofnięcia.

**Risks**: przypadkowe dotknięcie `SearchSegment`/`CategoryFilterBar` (współdzielonych z `/wyniki`) podczas restyle'u — złagodzone przez regresyjny scenariusz testowy w Critical test scenarios. Krok 15 (rozbita cena) dotyka już zweryfikowanej spec 0004 — ograniczony wyłącznie do dodania opcjonalnego propa, bez zmiany istniejących propów ani zachowania, gdy `country` jest nieobecny.

## Follow-up

- [ ] **Wymaga potwierdzenia zamawiającego**: to drugi duży redesign wizualny tej strony w krótkim czasie (po spec 0014). Warto świadomie zapisać tę wersję jako docelową na dłużej, żeby nie odwracać kierunku po raz trzeci bez pełnego kontekstu.
- [ ] `assets/tokens/brand-v4-tokens.css` (spec 0013) traci swojego jedynego konsumenta po tej zmianie. Osobna decyzja: usunąć plik, czy zachować na przyszłość (np. dla innego, celowo ciemnego ekranu)? Nie rozstrzygane w tym spec.
- [ ] Przycisk „Otrzymaj darmowe oferty” w zamykającym CTA (dziedziczone z 0014) dalej tylko przewija do karty wyszukiwania, nie realizuje dosłownie obietnicy „3 dopasowane oferty w 48 godzin” — ten dług nie jest adresowany w tym spec, patrz spec 0014 Follow-up.
- [ ] Po zbudowaniu: `/sync` powinien zaktualizować `components/klient/AGENTS.md` (nowa lista komponentów strony głównej, nowy governing spec) i `docs/scope/scope.md` (funkcja 4 wraca do `in-progress`, wskazuje na ten spec zamiast 0014).
- [ ] `/test` powinien napisać testy komponentów od zera dla wszystkich nowych i zmodyfikowanych komponentów strony startowej (dziś żaden nie ma dedykowanego testu), plus testy dla nowych współdzielonych `Accordion` i `StarRating`.
- [ ] Katalog producentów (strona za przyciskiem „Zobacz wszystkich producentów”) i realne, interaktywne porównywanie domów z poziomu strony głównej zostały świadomie wyłączone z zakresu tej specyfikacji (patrz rationale.md) — obie to kandydaci na przyszłe, osobne decyzje `/architect`, jeśli zamawiający zechce je rozwinąć.
