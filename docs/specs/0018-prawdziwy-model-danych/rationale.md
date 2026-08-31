# 0018. Prawdziwy model danych — uzasadnienie

## Context

Dzisiejszy model danych żyje w dwóch niepowiązanych światach: plikach przykładowych (`lib/data/fixtures/*`, typowanych w `lib/data/types.ts`) czytanych po stronie klienta, i `localStorage` kluczowanym NIP-em producenta, obsługującym katalog i onboarding producenta (spec 0016). Te dwa światy nigdy się nie spotykają: producent z fixture'a (`Producer`, oceny, `verified`) to inny byt niż producent zarejestrowany przez `RegistrationDetails`; zapytanie klienta (`lib/inquiry.ts`) nigdy się nie zapisuje, podczas gdy producencki inbox (`ProducerInquiry`) to osobny, ręcznie napisany fixture; oferta istnieje raz jako odpowiedź producenta w `localStorage` (`StoredProducerOffer`) i raz jako nietrwały stan "przyjęcia" po stronie klienta (`BindingOfferView`), bez żadnego połączenia między nimi.

Spec 0017 ustalił narzędzia (Neon Postgres w regionie UE, Drizzle ORM, Auth.js w wersji 5 z sesjami w bazie, Cloudflare R2), zostawiając `lib/db/schema.ts` jako pusty placeholder i wskazując wprost, że dwie sprawy muszą się rozstrzygnąć najpóźniej przy projektowaniu tego schematu, nie później: ścieżka audytu dostępu do danych osobowych (wymóg RODO) i strategia usuwania danych w obecności historii branchy/PITR Neon oraz osieroconych plików R2. Żadna z tych spraw nie ma dziś odpowiedzi w kodzie.

Epika Produkcja deklaruje podejście Tracer Bullet: funkcja 6 dowozi jeden cienki wątek (logowanie, jeden produkt, jedno zapytanie) przez wszystkie warstwy przed pogrubieniem kolejnych segmentów. To działa bez późniejszych migracji łamiących dane tylko wtedy, gdy schemat całej epiki jest znany teraz, nawet jeśli większość tabel czeka nieużywana do swojej kolejki (oferta przy funkcji 7, płatność przy 8, dokumenty przy 9, i tak dalej).

## Options considered

### Option 1: Pełny schemat całej epiki teraz, wdrażany stopniowo

Zaprojektuj wszystkie tabele nazwane w zakresie funkcji 2 (konta, katalog, zapytania, oferty, zamówienia, płatności, dokumenty, zgodność) w jednej migracji teraz; kolejne funkcje (6 do 15) zapisują do nich dane stopniowo, ale nie zmieniają ich kształtu.

**Pros**:
- Zero migracji łamiących dane po drodze, o ile projekt trafny; kolejne funkcje tylko dopisują wiersze.
- Relacje między encjami (zapytanie → oferta → zamówienie) są przemyślane razem, nie po kawałku, co unika dzisiejszych rozjazdów (oferta w dwóch miejscach, zapytanie bez zapisu).
- Zgodne z fazą Foundation w `docs/scope/produkcja.md`: ta funkcja poprzedza wszystkie sloty właśnie po to, żeby dać im stabilny fundament.

**Cons**:
- Część projektu (np. dokładny kształt `payment` czy `offer` przy wielu producentach na jedno zapytanie) jest zgadywana bez presji prawdziwego kodu ją używającego; błąd ujawni się dopiero przy funkcji 7 czy 8.
- Osiemnaście tabel naraz to duży ładunek poznawczy do przeglądu w jednym spec, nawet w kształcie katalogowym (directory shape).

### Option 2: Minimalny schemat teraz, rozbudowa per funkcja

Zaprojektuj tylko to, czego potrzebuje funkcja 6 (konta, produkt, zapytanie); każda kolejna funkcja epiki projektuje własne tabele przez własny przebieg `/architect` tuż przed swoją budową.

**Pros**:
- Każda tabela projektowana tuż przed użyciem, z pełnym kontekstem tego, co faktycznie buduje dana funkcja, mniejsze ryzyko zgadywania na zapas.
- Mniejszy, bardziej przyswajalny spec na start.

**Cons**:
- Prosta ścieżka do dokładnie tego, przed czym ostrzega spec 0017: migracji łamiącej dane, gdy funkcja 7 odkryje, że `inquiry` czy `offer` z funkcji 6 nie mają miejsca na to, czego potrzebuje oferta.
- Rozbija jedną spójną decyzję o kształcie relacji zapytanie → oferta → zamówienie na kilka osobnych decyzji w czasie, z ryzykiem niespójności między nimi (dokładnie problem, który ten spec ma rozwiązać).
- Sprzeczne z jawnym zakresem funkcji 2 w `docs/scope/produkcja.md` ("schemat i relacje obsługują wszystkie funkcje tej epiki bez migracji łamiącej dane").

### Option 3: Jedna elastyczna tabela encji (EAV / dokument JSON)

Zamiast osobnej tabeli na każdą encję, jedna generyczna tabela `entity` z kolumną `type` i danymi w `jsonb`, unikająca migracji przy każdej zmianie pola.

**Pros**:
- Dodanie nowego pola do dowolnej encji to zmiana w kodzie aplikacji, nie migracja bazy danych.
- Jeden, uniwersalny wzorzec zapisu i odczytu dla każdej encji.

**Cons**:
- Zaprzecza całemu powodowi wyboru Postgres i Drizzle w spec 0017: relacje, klucze obce, unikalne indeksy i integralność referencyjna przestają istnieć na poziomie bazy, przenoszą się (niepewnie) do kodu aplikacji.
- Audyt i uprawnienia (kluczowe wymogi RODO tej funkcji) są znacznie trudniejsze do wyegzekwowania nad nietypowanym `jsonb`, niż nad jawnymi kolumnami i kluczami obcymi.
- Sprzeczne z `AGENTS.md`/spec 0017: `Drizzle ORM` wybrano właśnie za "pełną kontrolę nad zapytaniami SQL potrzebną przy audytach RODO", czego ta opcja się zrzeka.

## Rationale

Wybrano Opcję 1. Zakres funkcji 2 w `docs/scope/produkcja.md` wprost wymaga schematu obsługującego "wszystkie funkcje tej epiki bez migracji łamiącej dane"; to nie jest życzenie, to kryterium "Done when" tej funkcji. Podejście Tracer Bullet epiki (dowieźć jeden cienki wątek przez wszystkie warstwy, potem pogrubiać) zakłada, że warstwa danych jest już gotowa na kolejne segmenty, gdy po nie przyjdą; Opcja 2 przenosi to ryzyko z "raz, teraz, z pełnym obrazem całości" na "wielokrotnie, w locie, z ryzykiem niespójności między kolejnymi przebiegami /architect". Mapowanie dzisiejszego modelu mock (patrz niżej) pokazuje, że większość potrzebnych encji już istnieje w jakiejś formie w kodzie, więc realne ryzyko błędnego zgadywania jest niższe niż projektowanie od zera.

Opcja 3 odrzucona bez wahania: unieważnia decyzję o Drizzle+Postgres podjętą w spec 0017 właśnie dla kontroli nad audytem RODO, którą ta funkcja ma dostarczyć.

Trzy dalsze decyzje, ustalone z inżynierem podczas rozmowy projektowej, mają własne, krótkie uzasadnienie:

- **Trzy osobne tabele zgodności** (nie jedna, skonsolidowana): `product_country_eligibility`, `plot_analysis_result` i `producer_export_readiness` mają ten sam kształt `{status, reason}` dziś, ale różne klucze biznesowe (produkt×kraj, produkt×klient, producent×kraj) i różne przyszłe potrzeby (analiza działki dostanie realny adres/geolokalizację przy prawdziwym silniku zgodności, funkcja 10; pozostałe dwie nie). Jedna tabela z nullowalnym dyskryminatorem byłaby węższa dziś, ale wymusza dodanie kolumn nullowalnych dla każdej przyszłej rozbieżności; trzy tabele pozwalają każdej ewoluować niezależnie bez wpływu na pozostałe. Cross check zwrócił uwagę, że `plot_analysis_result` kluczowany tylko po `productId` gubi klienta (dwóch klientów analizujących ten sam produkt dla różnych działek zderzyłoby się na jednym wierszu); poprawione na klucz złożony (productId, clientId) w `index.md`.
- **Enum-y Postgres dla ról i statusów, ale tabela słownikowa dla kraju**: pozorna niespójność, ale różny charakter danych. Kraj to dane, które realnie rosną (epika ma wprost zaplanowane rozszerzenie poza Polskę, Deferred w `docs/scope/produkcja.md`) i dodanie wiersza nie wymaga żadnej nowej logiki aplikacji. Rola czy status zamówienia to struktura zachowania: dodanie nowej wartości (np. nowego etapu realizacji) zawsze wymaga nowego kodu obsługującego tę wartość, więc trzymanie jej jako ENUM (a nie wiersza w tabeli) nie kosztuje nic dodatkowego przy migracji, a daje kontrolę typów w Drizzle.
- **`audit_log` wypełniane triggerem Postgres, nie kodem aplikacji**: cross check trafnie wskazał, że poleganie na dyscyplinie każdego miejsca wywołania w kodzie to gwarantowana luka (ktoś kiedyś zapomni). Jeden trigger na tabelę jest niemożliwy do ominięcia przez nowy kod i jest też jedynym miejscem, które musi znać regułę redakcji pól osobowych, zamiast powielać ją w każdym call site.
- **`product` jako jedna tabela, łącząca dzisiejsze `Project` i `SavedProduct`**: to, co widzi klient, i to, co zapisuje producent, to ten sam byt z dwoma niepołączonymi kopiami tylko dlatego, że epika Prototyp budowała je osobno (spec 0004 i spec 0016, w różnym czasie). Prawdziwy system ma jedno źródło prawdy: producent zapisuje produkt, klient go widzi.
- **Anonimizacja zamiast twardego usuwania**: rekordy z zależnościami (zamówienie, oferta, zapytanie) są potrzebne jako zapis finansowy/prawny nawet po tym, jak osoba zażąda usunięcia danych; zerowanie pól osobowych w miejscu spełnia RODO bez łamania integralności referencyjnej historii transakcji. Twarde usunięcie wybrane tylko tam, gdzie nic nie zależy od rekordu.

## References

Poziom: brak (na życzenie zamawiającego, pełne uzasadnienie zostaje w tym pliku).
