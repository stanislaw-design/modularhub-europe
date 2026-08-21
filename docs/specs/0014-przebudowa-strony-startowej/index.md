# 0014. Przebudowa strony startowej na pełny układ marketingowy

**Date**: 2026-08-18
**Status**: In Progress

## Summary

Strona startowa (`/pl/klient`) zbudowana pod spec [0003](../0003-strona-startowa/index.md) była świadomie minimalna: sam pasek wyszukiwania, bez zdjęcia, bez widocznego nagłówka. Ta specyfikacja zastępuje ją pełnym układem marketingowym według grafiki referencyjnej dostarczonej przez zamawiającego (`public/references.png`): ciemne hero ze zdjęciem i hasłem, rozszerzony nagłówek z pełną nawigacją, pasek statystyk, sekcja kategorii domów, sekcja „dlaczego my", pasek zaufanych producentów i zamykający pasek CTA. Kolory ciemnych sekcji i głównego przycisku akcji pochodzą z nowego zestawu tokenów v4 (spec [0013](../0013-tokeny-marki-v4.md)). Ta specyfikacja zastępuje spec 0003 (supersedes); dotychczasowe sekcje „Polecane domy" i „Jak to działa" znikają ze strony startowej, zastąpione strukturą z grafiki.

## Requirements

**User stories**:
- Jako klient wchodzący na stronę główną, chcę od razu zobaczyć, czym jest platforma i jakie ma zaufanie (liczby, zweryfikowani producenci), zanim jeszcze zacznę szukać, żeby nabrać zaufania przed wypełnieniem czegokolwiek.
- Jako klient, chcę wyszukać dom po kraju i orientacyjnej powierzchni z poziomu hero, tak jak dziś, żeby od razu trafić do pasujących wyników.
- Jako klient przeglądający stronę główną, chcę zobaczyć kategorie domów i konkretne powody, dla których warto użyć tej platformy, żeby zrozumieć ofertę bez czytania długiego tekstu.
- Jako klient, który nie wie od czego zacząć, chcę widocznego wezwania do działania z krótkim wyjaśnieniem procesu, żeby mieć alternatywną ścieżkę wejścia niż samodzielne wyszukiwanie.
- Jako producent rozważający platformę, chcę oczywistego linku do rejestracji z poziomu strony głównej klienta, tak jak dziś.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Nagłówek renderuje pełną nawigację z grafiki (Domy, Producenci, Projekty, Inspiracje, Jak to działa, O nas), przełącznik języka, Ulubione, Zaloguj się i przycisk „Zacznij"/„Zostań producentem". Tylko linki do faktycznie istniejących tras są prawdziwymi linkami: logo i „Domy" → `/pl/klient`, „Jak to działa" → kotwica do wyjaśniacza w sekcji CTA (AC-9), „Zostań producentem"/„Zacznij" → `/pl/producent` (tak jak dziś). Pozostałe (Producenci, Projekty, Inspiracje, O nas, przełącznik języka, Ulubione, Zaloguj się) renderują się jako widoczne, ale `disabled` placeholdery — ten sam wzorzec co dzisiejsze przyciski Menu/Konto w `SiteHeader`.
- **AC-2**: Hero renderuje się na tle `--brand-v4-night` ze zdjęciem (picsum.photos, tak jak inne zdjęcia w projekcie), prawdziwym (nie `sr-only`) nagłówkiem h1 z hasłem, akapitem opisowym, trzema odznakami zaufania (ikona plus tekst) i dwoma przyciskami: „Znajdź swój dom" (główna akcja, kolor `--brand-v4-amber`, przewija do karty wyszukiwania z AC-3) i „Dla producentów" (drugorzędny, obrys, prowadzi do `/pl/producent`). To odwraca AC-2 z spec 0003 (wcześniej: sam pasek wyszukiwania, h1 `sr-only`) — potwierdzone w tej sesji, patrz Follow-up.
- **AC-3**: Karta wyszukiwania (nakładająca się na dół hero, tło `--brand-v4-surface`) renderuje 5 pól. Gdzie (kraj, wymagane do aktywacji „Szukaj domów") i Powierzchnia (jedno pole, wybór z przedziałów zamiast dwóch pól „od"/„do", patrz Feature design) są prawdziwymi, niezmodyfikowanymi instancjami istniejącego `SearchSegment` (żadnej zmiany w jego publicznym API). Typ domu, Budżet, Dostawa renderują się jako statyczne, wizualnie dopasowane do `SearchSegment` (etykieta plus wyszarzony placeholder), ale **nie są instancjami `SearchSegment`** — to zwykłe `disabled` przyciski, bez stanu i bez modelu danych za sobą, ten sam wzorzec co istniejące, już zaakceptowane placeholdery w `CategoryFilterBar`. Przycisk „Szukaj domów" jest nieaktywny, dopóki kraj nie jest wybrany (ta sama reguła co AC-3 z spec 0003).
- **AC-4**: Kliknięcie „Szukaj domów" przenosi na `/pl/klient/wyniki` z `country` (zawsze, gdy wybrany) i `sizeMin`/`sizeMax` wyliczonymi z wybranego przedziału Powierzchni (patrz Feature design) — dokładnie ten sam kontrakt URL co spec 0003, zmienia się tylko sposób zbierania wartości w UI.
- **AC-5**: Pasek statystyk renderuje 5 pozycji z grafiki (250+ zweryfikowanych producentów, 1 000+ projektów, 15 000+ zadowolonych klientów, 25+ krajów, 4,8/5 z ikonami gwiazdek i liczbą opinii) jako statyczną treść marketingową, wprost nieobliczaną z rzeczywistej liczby fixture'ów (dziś 6 projektów, 3 kraje) — potraktowaną jak każda inna ilustracyjna treść mockowa w tym etapie.
- **AC-6**: Sekcja „Odkryj popularne kategorie domów" renderuje dokładnie 4 statyczne karty (zdjęcie, nazwa, ilustracyjna liczba projektów, strzałka) odpowiadające czterem kategoriom z grafiki, bez pola `houseType` w modelu danych i bez filtrowania po nich. Każda karta i nagłówkowy link „Zobacz wszystkie kategorie" prowadzą do `/pl/klient/wyniki` bez parametrów (pełna, nieprzefiltrowana lista) — świadomie nieprzefiltrowane, bo model danych na to nie pozwala, ale funkcjonalne, nie martwe.
- **AC-7**: Sekcja „Dlaczego ModularHub Europe?" renderuje etykietę, nagłówek, akapit, przycisk „Dowiedz się, jak to działa" (kotwica jak w AC-1) i cztery kafelki korzyści (ikona, nagłówek, opis) z treścią z grafiki (Porównuj wygodnie / 100% przejrzystości / Compliance Engine™ / Oszczędzaj czas i pieniądze).
- **AC-8**: Pasek „Zaufaj nam wiodący producenci" (tło `--brand-v4-night`) renderuje unikalne nazwy producentów odczytane z rzeczywistych danych mockowych (`producerName` z `lib/data/fixtures/projects.ts`) jako stylizowane napisy tekstowe — nigdy prawdziwe nazwy/loga firm trzecich z grafiki referencyjnej (Honda, Baufritz, Rubner Haus i ELK to realne, istniejące marki producentów domów, nie wolno ich reprodukować). Przycisk „Zobacz wszystkich producentów" jest widoczny, ale `disabled` — nie istnieje dziś strona katalogu producentów.
- **AC-9**: Zamykający pasek CTA (tło `--brand-v4-night`, zdjęcie) renderuje etykietę, nagłówek „Otrzymaj 3 dopasowane oferty w 48 godzin", akapit, przycisk „Otrzymaj darmowe oferty" (przewija z powrotem do karty wyszukiwania z AC-3, patrz rationale.md) i trzy ponumerowane kroki wyjaśniające (Powiedz nam czego potrzebujesz / Dobieramy najlepszych producentów / Otrzymujesz oferty), z treścią z grafiki. To jest cel kotwic z AC-1 i AC-7 („Jak to działa" / „Dowiedz się, jak to działa").
- **AC-10**: Ostatni rząd (tło jasne) renderuje 4 statyczne pozycje zaufania z grafiki (Bezpiecznie i pewnie / Niezależna platforma / Ekspercka pomoc / Wyprodukowane w Europie), ikona plus krótki tekst każda. To jest zamykająca treść tej konkretnej strony, nie stopka serwisu (kontakt/informacje prawne) — ta zostaje odłożona zgodnie z `docs/scope/scope.md`, Deferred.
- **AC-11**: Strona spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1 (hasło hero, już nie `sr-only`), link „Przejdź do treści" jest pierwszym elementem w kolejności Tab (nawigacja jest teraz zbyt rozbudowana, żeby zastosować wyjątek zaakceptowany w spec 0003 dla dwulinkowego nagłówka), wszystkie `disabled` placeholdery mają realny atrybut `disabled`/`aria-disabled`, obrazy dekoracyjne mają puste `alt`, obrazy znaczące (karty kategorii, zdjęcia hero/CTA) mają opisowy `alt`, kontrast tekstu na tle `--brand-v4-night` i `--brand-v4-amber` spełnia 4.5:1 (tekst) / 3:1 (elementy nietekstowe). W szczególności: każdy przycisk czy etykieta z wypełnieniem `--brand-v4-amber` używa tekstu `--brand-v4-amber-foreground` (ciemny granat, ~7.4:1), nigdy białego (~2.17:1, poniżej progu AA) — patrz spec [0013](../0013-tokeny-marki-v4.md), tabela tokenów.
- **AC-12**: Układ jest responsywny: hero i karta wyszukiwania układają się pionowo na wąskich ekranach, pasek statystyk zawija się do dwóch kolumn, siatka kategorii do jednej/dwóch kolumn, kafelki „dlaczego my" do jednej kolumny, pasek producentów przewija się poziomo, pasek CTA układa treść nad zdjęciem.
- **AC-13**: Po wdrożeniu, `/pl/klient` nie renderuje już sekcji „Polecane domy" ani „Jak to działa" w ich dotychczasowej formie ze spec 0003 (zastąpione strukturami z AC-6/AC-7/AC-9); pole `Project.featured` i jego użycie w sortowaniu wyników (`/wyniki`, spec 0004 AC-12) **zostają nietknięte** — usuwana jest wyłącznie dedykowana funkcja `getFeaturedProjects()` i komponenty, które ją wyłącznie konsumowały (patrz Feature design, „Komponenty do usunięcia").

## Decision

**Chosen option**: pełne przyjęcie struktury z grafiki referencyjnej (Option 1, patrz rationale.md), zastępując dotychczasowe sekcje „Polecane domy" i „Jak to działa".

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Struktura strony (kolejność sekcji)**:
1. Nagłówek (`SiteHeader`, przebudowany) — AC-1
2. Hero (`Hero`, przebudowany) — AC-2
3. Karta wyszukiwania (nowy komponent lub rozszerzenie `Hero`, osadzona wewnątrz/nachodząca na hero) — AC-3, AC-4
4. Pasek statystyk (nowy komponent `StatsBar`) — AC-5
5. Kategorie domów (nowy komponent `CategoryShowcase`) — AC-6
6. Dlaczego ModularHub Europe (nowy komponent `WhyUs`) — AC-7
7. Pasek zaufanych producentów (nowy komponent `TrustedProducers`) — AC-8
8. Zamykający pasek CTA (nowy komponent `ClosingCta`) — AC-9
9. Rząd zaufania na dole (nowy komponent `TrustFooterRow` — nazwa świadomie inna niż „stopka", żeby nie kolidować z odłożoną decyzją o prawdziwej stopce serwisu) — AC-10

**Komponenty do usunięcia** (używane wyłącznie przez dzisiejszą stronę startową, nigdzie indziej w kodzie): `components/klient/FeaturedHomes.tsx`, `components/klient/HowItWorks.tsx`, i funkcja `getFeaturedProjects()` w `lib/data/projects.ts`. Żaden z nich nie ma innego konsumenta poza dzisiejszą stroną startową.

**Uwaga, coś, co NIE jest do usunięcia mimo pozornego podobieństwa**: pole `featured` na `Project` (`lib/data/types.ts`, `lib/data/fixtures/projects.ts`) ma drugiego konsumenta — `app/[locale]/klient/wyniki/page.tsx` sortuje po nim wyniki (`sortResults`, `a.featured !== b.featured`), co realizuje **spec 0004 AC-12** („najpierw projekty z `featured === true`"), już zweryfikowane i `done`. Pole `featured` i to sortowanie **zostają bez zmian**; usuwana jest wyłącznie funkcja `getFeaturedProjects()` (dedykowany filtr „tylko featured", którego jedynym konsumentem był `FeaturedHomes.tsx`), nie samo pole ani jego użycie gdzie indziej. Ośmiu innych miejsc w testach konstruuje `Project` z polem `featured:` (np. `ResultCard`, `InquiryFlow`, `BindingOfferView`) — te fixture'y testowe też zostają nietknięte, bo pole typu się nie zmienia.

**Komponenty do zachowania bez zmian** (współdzielone z `/wyniki`, spec 0004): `CategoryFilterBar` (przestaje być importowany na stronie startowej, zostaje na `/wyniki`), `SearchSegment` (reużywany przez nowe pole Gdzie, zostaje też w `ResultsFilterBar`).

**Zasoby (obrazy)**: zdjęcie hero i zdjęcie w pasku CTA pochodzą z `picsum.photos`, tak jak zdjęcia projektów — `next.config.ts` już to dopuszcza, żadna nowa konfiguracja nie jest potrzebna. Cztery zdjęcia kart kategorii — tak samo.

**Reguła przedziałów dla pola „Powierzchnia" (AC-3, AC-4)**: jedno pole zastępuje dzisiejszą parę „od"/„do". Opcje (oparte na istniejących `SIZE_THRESHOLDS = [50, 100, 150, 200]` z `lib/size-thresholds.ts`, bez nowych wartości): „Dowolna" (brak `sizeMin`/`sizeMax`), „do 50 m²" (`sizeMax=50`), „50–100 m²" (`sizeMin=50&sizeMax=100`), „100–150 m²" (`sizeMin=100&sizeMax=150`), „150–200 m²" (`sizeMin=150&sizeMax=200`), „powyżej 200 m²" (`sizeMin=200`, brak `sizeMax`). Zachowuje dokładnie ten sam kontrakt parametrów co dziś (wielokrotność 50, `sizeMin <= sizeMax`, oba opcjonalne, domknięte). Wartość graniczna (np. dokładnie 100 m²) pasuje jednocześnie do dwóch sąsiednich przedziałów („50–100" i „100–150") — to nie jest nowa wada tego pola, tylko bezpośrednia konsekwencja domkniętego kontraktu `sizeMin <= sizeMax` już ustalonego w spec 0003 (ten sam efekt istniał przy dwóch osobnych polach „od"/„do"). Jedna realna zmiana zachowania: jedno pole nie pozwala wybrać dowolnie szerokiego, niestandardowego zakresu (np. `sizeMin=50&sizeMax=200`) tak jak dwa niezależne pola „od"/„do" pozwalały — tylko te sześć predefiniowanych przedziałów jest osiągalnych z hero (patrz Consequences).

**Dane producentów (AC-8)**: unikalne wartości `producerName` odczytane z `getProjects()` (albo bezpośrednio z fixture'ów po stronie serwera), bez nowej funkcji dostępowej — to już jest pole na istniejącym typie `Project`.

**Kluczowe niezmienniki**:
- Kontrakt URL do `/wyniki` (`country`, `sizeMin`, `sizeMax`) jest identyczny z tym ustalonym w spec 0003 — ta specyfikacja zmienia wyłącznie sposób zbierania wartości w UI, nigdy sam kontrakt.
- `CategoryFilterBar` i `SearchSegment` nie zmieniają publicznego API — `/wyniki` (spec 0004) używa ich dalej bez żadnej zmiany.
- Żadna z nowych sekcji (statystyki, kategorie, „dlaczego my", producenci, CTA) nie zapisuje ani nie czyta niczego trwałego — to strona w pełni statyczna poza istniejącym stanem hero (kraj, powierzchnia).

**Security model**: strona publiczna, bez logowania, bez zbierania danych osobowych — bez zmian względem spec 0003.

**Configuration required**: brak nowej konfiguracji; `next.config.ts` już dopuszcza `picsum.photos`.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wybór kraju i przedziału powierzchni w karcie wyszukiwania, klik „Szukaj domów", lądowanie na `/pl/klient/wyniki` z poprawnymi parametrami, sprawdza **AC-3**, **AC-4**.
- Przypadek brzegowy: wybrany tylko kraj, „Powierzchnia" na „Dowolna", nawigacja mimo to działa, URL zawiera wyłącznie `country`, sprawdza **AC-4**.
- Treść: pasek producentów renderuje tylko unikalne, prawdziwe nazwy z fixture'ów, ani jednej nazwy spoza mocka, sprawdza **AC-8**.
- Dostępność: skip link jest pierwszym elementem w kolejności Tab, wszystkie oznaczone jako `disabled` elementy nawigacji faktycznie mają atrybut `disabled`, sprawdza **AC-11**.
- Regresja: `/pl/klient/wyniki` (spec 0004) renderuje się i filtruje dokładnie tak jak przed tą zmianą, bez modyfikacji w `ResultsFilterBar`/`CategoryFilterBar`/`SearchSegment`, sprawdza niezmiennik współdzielonych komponentów.
- Regresja: istniejący test `e2e/wyniki.spec.ts` („a featured home card on the home page…", linie ok. 89–100) dziś nawiguje na `/pl/klient` i klika link `FeaturedHomes`; po tej zmianie ten test musi zostać przepisany (nie usunięty bez zamiennika), żeby dalej pokrywać `sizeMin`/`sizeMax` w linkach wychodzących ze strony startowej — teraz z karty wyszukiwania (AC-4), nie z kart polecanych domów, sprawdza **AC-13**.

## Build plan

1. Utwórz `assets/tokens/brand-v4-tokens.css`/`.json` z tabelą tokenów ze spec [0013](../0013-tokeny-marki-v4.md) (w tym `--brand-v4-amber-foreground`) i zarejestruj je w `app/globals.css` (`@theme inline`, obok istniejącego importu v3) — wymagane przez wszystkie kolejne kroki
2. Przebuduj `SiteHeader`: pełna nawigacja, realne linki gdzie istnieją, `disabled` placeholdery gdzie nie, satisfies **AC-1**
3. Przebuduj `Hero`: tło v4, zdjęcie, prawdziwy h1, akapit, odznaki zaufania, dwa przyciski, satisfies **AC-2**
4. Zbuduj kartę wyszukiwania (5 pól, w tym nowe jednopolowe „Powierzchnia" na przedziałach z Feature design), podłącz istniejącą logikę nawigacji do `/wyniki`, satisfies **AC-3**, **AC-4**
5. Zbuduj `StatsBar` (5 statycznych pozycji), satisfies **AC-5**
6. Zbuduj `CategoryShowcase` (4 karty, linki do nieprzefiltrowanych `/wyniki`), satisfies **AC-6**
7. Zbuduj `WhyUs` (nagłówek, akapit, przycisk, 4 kafelki), satisfies **AC-7**
8. Zbuduj `TrustedProducers` (unikalne nazwy z `getProjects()`, `disabled` przycisk „Zobacz wszystkich"), satisfies **AC-8**
9. Zbuduj `ClosingCta` (nagłówek, akapit, przycisk przewijający do karty wyszukiwania, 3 kroki), satisfies **AC-9**
10. Zbuduj `TrustFooterRow` (4 statyczne pozycje), satisfies **AC-10**
11. Usuń `FeaturedHomes.tsx`, `HowItWorks.tsx` i `getFeaturedProjects()` (nie pole `featured`, patrz Feature design); zaktualizuj `app/[locale]/klient/page.tsx` do nowej struktury sekcji; przepisz test `e2e/wyniki.spec.ts` opisany w Critical test scenarios, satisfies **AC-13**
12. Przejście dostępności: jeden H1, skip link pierwszy w kolejności Tab, `disabled`/`aria-disabled` na wszystkich placeholderach, `alt` na obrazach, kontrast tokenów v4 na obu tłach, satisfies **AC-11**
13. Przejście responsywności: hero/karta wyszukiwania, pasek statystyk, siatka kategorii, kafelki „dlaczego my", pasek producentów, pasek CTA na wąskich ekranach, satisfies **AC-12**

## Consequences

**Positive**:
- Strona startowa wygląda i działa jak w pełni dopracowana strona marketingowa, zgodnie z tym, co zamawiający faktycznie chce pokazywać.
- Ustala pierwszy realny wzorzec użycia tokenów v4 w produkcie, gotowy do skopiowania przy przyszłych migracjach innych ekranów.
- Kontrakt URL do `/wyniki` (spec 0004) zostaje w pełni zachowany — zero ryzyka regresji na stronie wyników.

**Negative / tradeoffs**:
- Strona startowa traci bezpośrednią witrynę prawdziwych danych projektowych (patrz rationale.md); kompensowane tylko częściowo przez prawdziwe nazwy producentów w pasku zaufania.
- Trzy z pięciu pól wyszukiwania (Typ domu, Budżet, Dostawa) są widoczne, ale nic nie robią — to świadomy placeholder, ale realne ryzyko, że użytkownik spróbuje ich użyć i nic się nie stanie (ten sam kompromis co istniejący `CategoryFilterBar`, teraz w bardziej wyeksponowanym miejscu, bo w samym hero, nie pod nim).
- Przycisk „Otrzymaj darmowe oferty" w zamykającym CTA obiecuje w treści („Otrzymaj 3 dopasowane oferty w 48 godzin") funkcję, której nie ma — przekierowanie do karty wyszukiwania jest uczciwym substytutem, ale nie realizuje dosłownej obietnicy tekstu.
- Jedno pole „Powierzchnia" (AC-3) nie pozwala wybrać dowolnie szerokiego zakresu tak jak dwa niezależne pola „od"/„do" w spec 0003 — tylko sześć predefiniowanych przedziałów jest osiągalnych z hero (patrz Feature design). Realna, świadomie zaakceptowana zawężenie elastyczności wyszukiwania.
- Dziś **nie istnieją** dedykowane testy komponentów dla `Hero`, `SiteHeader`, `CategoryFilterBar`, `FeaturedHomes` ani `HowItWorks` (zweryfikowane: `components/klient/*.test.tsx` nie obejmuje żadnego z nich) — więc nie ma nic do „przepisania" na poziomie komponentu, tylko do napisania od zera (zadanie `/test`). Jest natomiast jeden konkretny e2e test do przepisania, nie tylko odnotowania: `e2e/wyniki.spec.ts` zawiera test strony startowej klikający kartę `FeaturedHomes` (patrz Feature design, Critical test scenarios, i Build plan krok 11) — ten musi zostać zaktualizowany w ramach tej zmiany, inaczej `npm run test:e2e` zacznie failować.

**Neutral**:
- Strona startowa staje się pierwszym i na razie jedynym konsumentem tokenów v4 (spec 0013); reszta produktu zostaje bez zmian.
- `components/klient/AGENTS.md` (lista komponentów i governing specs dla tego obszaru) będzie wymagał aktualizacji po zbudowaniu — zadanie `/sync`, nie tej specyfikacji.

## Migration plan

**Strategy**: big bang (bezpośrednia podmiana w jednym przejściu `/develop`), nie strangler. Uzasadnienie: to prototyp demonstracyjny bez realnych użytkowników w trakcie sesji i bez trwałych danych do zepsucia (`docs/scope/scope.md`: „żaden ekran nic trwale nie zapisuje"); stopniowe współistnienie starej i nowej strony startowej nie chroni niczego realnego, tylko dodaje złożoność.

**Phases**:
1. Tokeny v4 (Build plan krok 1) — warunek wstępny, zero zmiany widocznej treści.
2. Nowe sekcje strony startowej (kroki 2–10) — strona startowa działa na nowej strukturze; `/wyniki` i reszta produktu nietknięte.
3. Sprzątanie (krok 11) — usunięcie martwego kodu (`FeaturedHomes`, `HowItWorks`, `featured`), tylko po tym, jak krok 2 jest gotowy i nic więcej ich nie potrzebuje.

**Rollback**: `git revert` commitów tej zmiany; brak migracji danych do cofnięcia, bo nic trwałego się nie zapisuje.

**Risks**: przypadkowe dotknięcie `CategoryFilterBar`/`SearchSegment` (współdzielonych z `/wyniki`) podczas budowy nowych sekcji — złagodzone przez AC-11 z spec 0004 i regresyjny scenariusz testowy w tej specyfikacji (Feature design, Critical test scenarios).

## Follow-up

- [ ] Ta specyfikacja zależy od spec [0013](../0013-tokeny-marki-v4.md) będącej `Accepted` (nie tylko `Proposed`) zanim `/develop` zacznie Build plan krok 1 — jako samodzielna decyzja (standalone decision spec), 0013 przechodzi w `Accepted` przy potwierdzeniu w tej samej sesji, więc w praktyce oba warunki są spełnione razem, ale kolejność jest tu odnotowana wprost, żeby `/develop` nie zaczynał budowy strony startowej, jeśli z jakiegoś powodu 0013 zostałoby odrzucone przy przeglądzie.
- [ ] Przy pisaniu tej specyfikacji poprawiono też tekst **AC-11** i **AC-13** w spec [0004](../0004-wyniki-z-filtrem-prawnym/index.md), bo dosłownie odwoływały się do „tych samych pól co w hero" i „tego samego placeholdera co na stronie głównej" — oba zdania stałyby się fałszywe po tej przebudowie, mimo że sam kod `/wyniki` się nie zmienia. To poprawka tekstu kontraktu, nie zmiana zachowania.
- [ ] **Wymaga potwierdzenia zamawiającego**: AC-2 odwraca AC-2 z spec 0003 (hero z pełną grafiką zamiast samego paska wyszukiwania) po raz drugi w historii tej strony. W tej sesji zamawiający potwierdził to wprost przez dostarczenie grafiki referencyjnej i odpowiedzi w rozmowie projektowej, ale ktoś z zespołu powinien to jeszcze raz świadomie zapisać jako ostateczną decyzję, żeby nie odwracać jej po raz trzeci bez pełnego kontekstu.
- [ ] Przycisk „Otrzymaj darmowe oferty" (AC-9) dziś tylko przewija do karty wyszukiwania. Jeśli zamawiający chce dosłownie zrealizować obietnicę „3 dopasowane oferty w 48 godzin", to osobna funkcja (zbliżona do odłożonego wcześniej „Kreatora ceny", funkcja 5 w `docs/scope/scope.md`, status `dropped`) wymagałaby własnej decyzji projektowej (`/architect`), nie cichego dobudowania tutaj.
- [ ] Po zbudowaniu: `/sync` powinien zaktualizować `components/klient/AGENTS.md` (nowa lista komponentów strony głównej) i `docs/scope/scope.md` (funkcja 4 wraca do `in-progress`, potem `done` po weryfikacji i testach).
- [ ] `/test` powinien napisać testy komponentów dla nowych/przebudowanych `Hero`, `SiteHeader`, `StatsBar`, `CategoryShowcase`, `WhyUs`, `TrustedProducers`, `ClosingCta`, `TrustFooterRow` od zera — dziś żaden z komponentów strony startowej nie ma dedykowanego testu (`components/klient/*.test.tsx` go nie obejmuje), więc to nie jest przepisywanie istniejących asercji, tylko nowa praca.

## Rationale

Pełne uzasadnienie, porównanie opcji i szczegóły: patrz [rationale.md](rationale.md).
