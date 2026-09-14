# 0038. Ekrany wejściowe dla dużych zamówień B2B — uzasadnienie

## Context

> ⚠️ Premise note: dostarczony obraz referencyjny pokazuje dwa kafle (inwestor i producent), choć pierwotny temat mówił tylko o kaflu inwestora. Kafel producenta ("Dołącz jako producent B2B") obiecuje ekran zgłaszania zdolności produkcyjnej, który dziś nie istnieje (spec 0037 ustalił tylko walidację Zod dla jego pól jsonb, bez formularza ani funkcji zapisu). W rozmowie projektowej inżynier świadomie zdecydował: zbudować sekcję z obydwoma kaflami teraz, przekierować kafel producenta na istniejącą stronę rejestracji jako tymczasowy cel, a prawdziwy ekran zdolności produkcyjnej zostawić jako osobną, przyszłą decyzję (patrz index.md, Follow-up). Ta decyzja jest tu jawnie zapisana, żeby oczekiwanie sugerowane przez kafel nie zostało pomylone z rzeczywistym zakresem tej funkcji.

Spec 0037 zbudował pełny model danych i funkcje serwerowe dla dużych zamówień B2B (`project_request`, `submitProjectRequest`, limit zgłoszeń, powiązanie producentów), ale świadomie zostawił bez odpowiedzi pytanie, jak inwestor w ogóle trafia do tej funkcji. Dziś jedyna droga to wywołanie `submitProjectRequest` programistycznie, bez żadnego ekranu. Inwestorzy tacy jak Lammert (10 i więcej domów naraz) nie mają żadnego punktu wejścia na stronie głównej ani żadnej dedykowanej strony formularza.

Kluczowe siły: strona główna jest już długa (Hero, PopularHomes, ComplianceEngineShowcase, HowItWorksExplainer, CompareHomesTeaser, ProducerShowcase, ClosingCta, Faq), więc nowa sekcja nie może rozsadzić tego doświadczenia dla zwykłego klienta detalicznego; adresy URL klienta są od spec 0036 po angielsku i bez segmentu `klient`; strona formularza jest publiczna i ma przyciągać zimny ruch inwestorski (reklamy, wyszukiwarka), więc potrzebuje pełnych metadanych SEO od startu; spec 0037 jawnie zostawił otwartą lukę w treści formularza — informację, że dane kontaktowe trafią do dopasowanych producentów — jako zadanie tego właśnie ekranu.

## Kontekst aktualizacji (ten sam dzień)

Po zbudowaniu i wpisaniu do scope funkcji 33 (wciąż `in progress`, przed `/check verify`) inżynier wrócił z nowym pomysłem: kafel inwestora nie powinien prowadzić od razu do pustego formularza, tylko dawać najpierw powód do zaufania, czyli realne projekty sprawdzonych, dużych producentów, z dużym przyciskiem "Zgłoś zapytanie" widocznym obok. Wskazał wprost, że dziś jedynym producentem, który realnie kwalifikuje się do obsługi takich zamówień, jest Budman House.

W trakcie tej rozmowy projektowej sprawdzono realną bazę (Neon MCP) i znaleziono trzy fakty, które zmieniły zakres tej aktualizacji:
- Żaden producent nie ma dziś wiersza `producer_capacity_profile` z `volumeVerificationStatus = approved`; tabela `producerDeliveryCountry` jest całkowicie pusta dla wszystkich siedmiu producentów w bazie. Automatyczne dopasowanie z AC-2 spec 0037 nie działałoby dziś dla nikogo, nie tylko dla ekranu przeglądania.
- Funkcja `submitBulkProductInquiry` (spec 0037, ścieżka "zapytanie o konkretny produkt") już istnieje i jest przetestowana (`lib/project-request-actions.ts`, `lib/project-request-actions.test.ts`), wbrew wcześniejszemu Follow-up tej samej strony, który mylił ten gotowy zapis z brakującym ekranem producenta do zgłaszania zdolności (to dwie różne, niepowiązane luki). Brakuje wyłącznie interfejsu, który ją wywoła.
- `getProducerById`/`getProducers` (`lib/data/producers.ts`) czytają z fixture'ów, których id (`"prod-budman"`) nigdy nie pasuje do prawdziwego UUID producenta w bazie. Karta producenta na `/project/[id]` i sekcja `ProducerShowcase` na stronie głównej w praktyce nigdy się dziś nie renderują na realnych stronach, bo dopasowanie po id zawsze zawodzi.

## Options considered

### Option 1: Dedykowana strona `/project-request` wołająca wprost istniejącą funkcję serwerową (wybrane)

Nowa trasa z pełnym formularzem, wołająca `submitProjectRequest` bezpośrednio przez `useTransition`, dokładnie jak dzisiejszy `InquiryFlow` woła `submitInquiry`.

**Pros**:
- Osobny, trwały adres URL: można go linkować z reklam, e maili, ofert handlowych, bez konieczności przechodzenia przez stronę główną.
- Pełne wsparcie SEO (metadane, hreflang) możliwe tym samym wzorcem co inne strony klienta.
- Zero nowego zaplecza: formularz to czysty interfejs na już zbudowaną, przetestowaną funkcję z spec 0037.

**Cons**:
- Wymaga jednego dodatkowego kliknięcia (kafel → strona → formularz) zamiast wypełnienia od razu na stronie głównej.

### Option 2: Formularz w oknie modalnym otwieranym z kafla

Kliknięcie kafla otwiera formularz w modalu, bez opuszczania strony głównej.

**Pros**:
- Szybsza ścieżka: jedno kliknięcie mniej niż dedykowana strona.

**Cons**:
- Brak własnego, linkowalnego adresu URL, więc nie da się go użyć w reklamie czy kampanii e mail bez dodatkowej logiki otwierania modala z parametru URL.
- Modal konkuruje wizualnie z resztą przewijanej, sekcyjnej strony głównej, która dziś nie ma innego wzorca modalnego tej wagi.

### Option 3: Sekcja z formularzem wbudowana niżej na stronie głównej (kafel jako link kotwicowy)

Formularz renderuje się w nowej sekcji na dole strony głównej; kafel jest linkiem `#`.

**Pros**:
- Brak nowej trasy, jeden mniej plik do utrzymania.

**Cons**:
- Znacząco zwiększa i tak już długą stronę główną kodem formularza, który większość odwiedzających (klienci detaliczni) nigdy nie użyje.
- Ten sam brak samodzielnego, linkowalnego adresu co Option 2.

## Rationale

Osobna, dedykowana strona wygrywa z modalem i sekcją kotwicową głównie z jednego powodu: ta funkcja ma przyciągać zimny ruch inwestorski z zewnątrz (reklamy, wyszukiwarka, bezpośrednie linki w rozmowach handlowych), a tylko własny adres URL to umożliwia z pełnym wsparciem SEO (AC-10 w index.md). Koszt jednego dodatkowego kliknięcia jest akceptowalny wobec korzyści z niezależnego adresu i braku dokładania kolejnej, ciężkiej sekcji do już długiej strony głównej.

Kafel producenta prowadzący dziś do zwykłej rejestracji (AC-3 w index.md) jest świadomym kompromisem: dostarczony obraz referencyjny pokazuje sekcję z dwoma kaflami jako jedną spójną całość, więc budowanie tylko połowy wizualnie wyglądałoby na błąd, nie na decyzję. Prawdziwy ekran zgłaszania zdolności produkcyjnej (dane z `producer_capacity_profile`) wymaga własnej rozmowy projektowej (model formularza dla `leadTimeTiers`, certyfikatów, referencji, plus nowej funkcji zapisu) i zostaje osobną, przyszłą decyzją, zgodnie z pierwotnym Follow-up spec 0037.

## Options considered (aktualizacja: jak inwestor dociera do zweryfikowanych producentów)

### Option 4: Osobny ekran przeglądania `/verified-manufacturers` jako krok pośredni (wybrane)

Kafel inwestora prowadzi na nową, samodzielną stronę z siatką projektów producentów zweryfikowanych wolumenowo, z jednym wspólnym przyciskiem "Zgłoś zapytanie" do `/project-request`. Karty produktów linkują do już istniejącej `/project/[id]`.

**Pros**:
- Zero nowego kodu do wyświetlania szczegółów projektu; pełny opis, galeria i dane techniczne już istnieją na `/project/[id]`.
- Własny, linkowalny adres, tą samą logiką co uzasadnienie dedykowanej strony `/project-request` wyżej w tym pliku (SEO, reklamy, brak dokładania kolejnej ciężkiej sekcji do strony głównej).
- Formularz `/project-request` zostaje nietknięty i dalej samodzielnie linkowalny.

**Cons**:
- Jedno dodatkowe kliknięcie (kafel → przeglądanie → formularz albo `/project/[id]` → modal) zamiast trafienia od razu do formularza.

### Option 4b: Rozszerzenie istniejącego `/results` o parametr "tylko zweryfikowani wolumenowo"

Zamiast nowej trasy i nowych funkcji odczytu, dodać do już istniejącego ekranu `/results` (i jego `getProjects(filters)`) nowy filtr producenta zweryfikowanego wolumenowo, wywoływany np. z `/results?volumeVerified=1`.

**Pros**:
- Zero nowej trasy, zero nowego komponentu karty; `ResultCard`, siatka, metadane SEO już istnieją.

**Cons**:
- `/results` i `ResultCard` niosą mechanikę dla zalogowanego klienta detalicznego (ulubione, zaznaczanie do shortlisty, dopasowanie do działki), której inwestor B2B bez konta nie potrzebuje i która nie ma tu sensu; wyciszanie jej za flagą zamieniłoby jeden, czytelny komponent w dwa tryby w jednym pliku, wbrew konwencji "jeden komponent na ekran/koncern" z `components/klient/AGENTS.md`.
- Nagłówek producenta z odznaką, zdolnością miesięczną, certyfikatami i krajami dostawy (AC-13) nie ma dziś odpowiednika na `/results`, który grupuje po rodzinie produktu, nie po producencie; dopisanie tego pod flagą tylko dla jednego z wielu wariantów strony jest bardziej inwazyjne niż nowa, prosta strona.

Odrzucone: nowa, dedykowana strona kosztuje więcej kodu na dziś, ale trzyma osobną intencję (przeglądanie B2B, publiczne, bez logowania) z dala od dobrze ugruntowanego, ale skoncentrowanego na kliencie detalicznym `/results`.

### Option 5: Formularz wbudowany bezpośrednio pod siatką projektów na jednej stronie

Jedna strona: siatka projektów u góry, formularz `/project-request` wbudowany niżej, bez osobnej trasy dla formularza.

**Pros**:
- Jedno kliknięcie mniej między przejrzeniem projektów a wysłaniem zapytania.

**Cons**:
- Formularz traci własny, niezależnie linkowalny adres; dokładnie ten sam kompromis, który Option 3 (wyżej w tym pliku) już raz przegrał dla strony głównej, teraz przeniesiony na nową stronę.
- Miesza dwie różne intencje (przeglądanie i wysyłanie wolnego zapytania) na jednej trasie, utrudniając osobne mierzenie każdego kroku.

### Option 6: Zapytanie o konkretny model przez pełnostronicowy formularz zamiast modala

Kliknięcie "Zapytaj o ten model" na `/project/[id]` prowadzi na nową, osobną trasę z pełnostronicowym formularzem, tym samym wzorcem co `ProjectRequestFlow`.

**Pros**:
- Więcej miejsca na docelowy "konfigurator" bez ściskania go w oknie modalnym.

**Cons**:
- Więcej kodu na dziś dla czegoś, co inżynier sam nazwał tymczasowym ("na razie modal, konfigurator doprecyzujemy potem"); modal łatwiej później zastąpić czymś większym niż odwrotnie.
- Wypycha użytkownika ze strony produktu, którą właśnie oglądał, zamiast zapytać w miejscu.

## Rationale (aktualizacja)

Option 4 wygrywa z tych samych powodów, co oryginalna decyzja o dedykowanej stronie `/project-request`: własny adres płaci się w SEO i możliwości linkowania z zewnątrz, a koszt jednego dodatkowego kliknięcia jest akceptowalny wobec korzyści z budowania zaufania realnymi projektami, zanim inwestor poda dane kontaktowe. Reużycie `/project/[id]` zamiast budowania nowego widoku szczegółów jest oczywistym wyborem: ta strona już ma pełną galerię, dane techniczne i warunki handlowe, a spec 0037 od początku zaprojektował `bulk_product_inquiry` właśnie pod zapytanie o konkretny, istniejący produkt.

Modal (nie pełna strona) dla zapytania o model wprost odzwierciedla wyraźną wskazówkę z rozmowy projektowej: to świadomie tymczasowe rozwiązanie, "konfigurator" to osobna, przyszła decyzja. Budowanie dziś pełnej strony pod coś nazwanego tymczasowym byłoby przedwczesną robotą do wyrzucenia.

Kryterium "kto się kwalifikuje" (`producer_capacity_profile.volumeVerificationStatus = approved`) nie było realną alternatywą do wyważenia: to jedyna opcja spójna z już zbudowanym, przetestowanym modelem danych spec 0037, gdzie dokładnie to samo pole już decyduje, kogo `submitProjectRequest` automatycznie dopasowuje. Tymczasowa lista producentów na sztywno w kodzie rozjechałaby się z tym modelem od pierwszego dnia.

Naprawa `getProducerById`/`getProducers` (Follow up decyzja: inżynier poprosił o włączenie jej do tego samego build planu, nie o osobny, przyszły `/debug`) jest naturalnym efektem ubocznym: obie funkcje trzeba było i tak dotknąć, żeby ekran przeglądania i nowy blok na `/project/[id]` miały prawdziwe dane zdolności producenta, a odkryty defekt (fixture id kontra prawdziwy UUID) dotyczy dokładnie tych samych funkcji.

**Cross check tej aktualizacji (inny model)** znalazł cztery rzeczy warte poprawy w pierwszym szkicu, wszystkie już wprowadzone do index.md: (1) `AC-17` zakładał, że kształt typu `Producer` wystarczy zachować, pomijając że `rating` z bazy jest `null` do pierwszej recenzji, a `StarRating` dziś zakłada liczbę bez zabezpieczenia; naprawiono przez jawne mapowanie `null → 0` i pominięcie producentów bez opublikowanych produktów w `getProducers()`. (2) Modal z AC-15 dzieli ten sam, wspólny limit 3 zgłoszeń na e mail co `/project-request` (spec 0037 AC-10 liczy obie tabele razem); świadomie zostawione bez nowej ochrony, zapisane w Consequences i Follow-up. (3) Ręczne zasianie danych Budmana (Build plan) nie zostawia żadnego artefaktu w repozytorium, więc każde środowisko poza produkcją zobaczy pusty ekran, dopóki ktoś nie powtórzy zasiania tam; uznane za świadomy, już przyjęty w tym projekcie sposób pracy (ten sam co pierwsze ręczne zasianie producenta w funkcji 7), nie nowy dług. (4) `submitBulkProductInquiry` ma odczyt produktu poza blokiem `try/catch`, więc błąd bazy przy tym sprawdzeniu wyrzuciłby wyjątek zamiast zwrócić błąd; dodano jako zadanie 10 Build planu, bo dopiero ta decyzja czyni tę ścieżkę realnie osiągalną z UI. Reużycie `/results` zamiast nowej strony (Option 4b powyżej) było też brakującą alternatywą w pierwszym szkicu; dodane i odrzucone z jasnym powodem.

## Kontekst aktualizacji (2026-09-14, pasek wyszukiwania)

Po zbudowaniu i zasianiu Budman House inżynier wrócił z kolejnym pomysłem: `/verified-manufacturers` dziś pokazuje wszystkie projekty jednego producenta naraz, bez żadnego sposobu zawężenia listy. To nie problem przy jednym producencie i trzynastu projektach, ale zamienia się w problem, gdy katalog zweryfikowanych wolumenowo producentów urośnie.

## Options considered (aktualizacja: pasek wyszukiwania)

### Option 7: Zwykły, statyczny pasek ze słowem kluczowym, krajem dostawy i metrażem (wybrane)

Nowy komponent kliencki nad siatką producentów, reużywający `SearchSegment`/`SIZE_THRESHOLDS` z `ResultsFilterBar`, stan w parametrach URL, przewijany razem z treścią (bez dokowania).

**Pros**:
- Reużywa w całości już istniejącą, przetestowaną infrastrukturę (pełnotekstowe wyszukiwanie, `producerDeliveryCountry`, komponent `SearchSegment`), zero nowej zależności.
- Kraj dostawy odpowiada wprost na pytanie "czy ten producent mnie obsłuży", które na tej stronie ma większe znaczenie niż na `/wyniki` (tam kraj dotyczy zgodności prawnej produktu).
- Prosty, statyczny pasek jest najmniejszym kodem, jaki realnie rozwiązuje dzisiejszy problem (brak jakiegokolwiek zawężenia listy).

**Cons**:
- Przy dzisiejszym jednym producencie i trzynastu projektach pasek wyprzedza realną potrzebę; wartość ujawni się dopiero z liczbą producentów.
- Bez sortowania i bez filtra rodziny produktu (patrz Follow-up w index.md), więc nie jest kompletnym odpowiednikiem `ResultsFilterBar`.

### Alternatywa A: Tylko słowo kluczowe, bez kraju dostawy i metrażu

Jedno pole tekstowe, bez dodatkowych filtrów.

**Pros**:
- Najmniejszy możliwy zakres, najmniej kodu.

**Cons**:
- Nie rozwiązuje dzisiejszego, realnego pytania inwestora ("który z tych producentów w ogóle dostarczy do mojego kraju"), na które słowo kluczowe nie odpowiada; inżynier wybrał szerszy zakres świadomie z tego powodu.

### Alternatywa B: Pasek przyklejony (dokowany) przy przewijaniu, tym samym wzorcem co spec 0034

Zadokowana wersja paska pod `SiteHeader` po przewinięciu, ten sam mechanizm `IntersectionObserver` co spec 0034 na `/wyniki`.

**Pros**:
- Spójne UX z `/wyniki` przy długiej liście wyników.

**Cons**:
- Znacząco więcej kodu (obserwator przecięcia, druga, skrócona wersja paska, panel filtrów) dla strony, która dziś ma tylko trzynaście kart pod jednym producentem, więc scroll z powrotem na górę nie jest dziś realnym problemem; inżynier świadomie odłożył ten wariant do czasu, gdy lista faktycznie urośnie (patrz Follow-up w index.md).

## Rationale (aktualizacja, pasek wyszukiwania)

Pełny zakres (słowo kluczowe, kraj dostawy, metraż) nad samym słowem kluczowym wygrywa, bo kraj dostawy jest tu pytaniem, na które inwestor faktycznie potrzebuje odpowiedzi, nie kosmetycznym dodatkiem; to inne pole niż eligibility'owy "kraj" na `/wyniki`, patrz Key invariants w index.md. Metraż dokłada się prawie bez kosztu, bo `SIZE_THRESHOLDS` i `SearchSegment` już istnieją i są przetestowane na `/wyniki`.

Zwykły, statyczny pasek (nie dokowany jak spec 0034) wygrywa z jasnego, proporcjonalnego powodu: dzisiejsza strona ma jednego producenta i trzynaście kart, więc mechanizm dokowania (obserwator przecięcia, druga wersja paska, panel filtrów) rozwiązywałby problem, który jeszcze nie istnieje. Ten sam wzorzec zostaje w Follow-up jako gotowa, przyszła decyzja, gdy katalog realnie urośnie, zamiast budować go dziś na wyrost.

Sortowanie i filtr rodziny produktu zostały świadomie pominięte: dziś każdy zweryfikowany wolumenowo producent publikuje wyłącznie rodzinę "dom", więc filtr rodziny nie miałby dziś żadnego efektu, a przy jednym producencie i trzynastu projektach kolejność listy nie jest jeszcze realnym problemem. Oba zapisane w Follow-up jako naturalne rozszerzenie tego samego modułu filtra, nie nowa decyzja architektoniczna.

## Design reference

Wizualny kierunek tej decyzji pochodzi z obrazu referencyjnego dostarczonego przez zamawiającego w rozmowie projektowej (nie z Figma ani z `design.md`): dwukolumnowa sekcja "Projekty inwestycyjne i produkcja seryjna" z odznaką "NOWOŚĆ B2B", po jednym kaflu z tłem fotograficznym na stronę (inwestor/producent), każdy z nagłówkiem, trzema punktami z ikoną checkmark, przyciskiem CTA w kolorze `--brand-v5-amber` (`#fca311`, już istniejący token marki v5) i podpisem w rogu. Realne pliki graficzne już istnieją w repozytorium (`public/images/b2b/investor-background.png`, `public/images/b2b/manufacturer-background-2x1.png`), więc ta decyzja nie potrzebuje żadnej strategii placeholderów.

**Aktualizacja**: dla `/verified-manufacturers` i nowego bloku na `/project/[id]` nie dostarczono żadnego obrazu referencyjnego ani `design.md`. Kierunek wizualny to wprost istniejący system projektowy: karty projektów w stylu `ResultCard`/siatki `/wyniki` (uproszczone, bez mechaniki ulubionych i zaznaczania, bo ten ekran jest publiczny, bez logowania), nagłówek producenta w stylu `ProducerCard`, odznaka zweryfikowanego producenta tym samym wzorcem co plakietka `BadgeCheck` już użyta w `ProducerCard`, a modal przez Headless UI Dialog (już zainstalowany, zgodny z konwencją WCAG tego obszaru). Realne zdjęcia produktów Budmana już istnieją w bazie (`product.coverImageUrl`), więc i tu nie potrzeba żadnej strategii placeholderów.

**Aktualizacja (2026-09-14, pasek wyszukiwania)**: również bez obrazu referencyjnego. Wizualnie to wprost segmentowy pasek `ResultsFilterBar` (`components/klient/ResultsFilterBar.tsx`), reużywający jego komponent `SearchSegment` i tokeny `brand-v5`, tylko z trzema polami zamiast pięciu (bez sortowania, bez rodziny produktu) i bez wariantu dokowanego/mobilnego arkusza z dołu, bo pasek jest tu zwykły i statyczny.
