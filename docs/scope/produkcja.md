# Epika: Produkcja (prawdziwe zaplecze i utwardzenie)

Drugi etap platformy ModularHub Europe. Zastępuje zaplecze epiki [Prototyp](prototyp.md) (dane mockowe, `localStorage`, brak logowania) prawdziwym, produkcyjnym zapleczem: kontami, bazą danych, płatnościami, przechowywaniem plików, silnikiem zgodności i wyceną transportu, razem z utwardzeniem jakości (RODO, bezpieczeństwo, wydajność, SEO, obserwowalność, CI/CD) wymaganym, zanim platforma obsłuży prawdziwych klientów i producentów.

Start jest pilotem na Polsce. Pozostałe kraje z mocka silnika zgodności i wersje językowe zostają odłożone do kolejnych etapów, patrz Deferred niżej.

**Build approach:** Tracer Bullet (dowieźć jeden prawdziwy wątek przez wszystkie warstwy, logowanie plus jeden produkt w bazie plus jedno zapytanie, zanim pogrubimy kolejne segmenty jak oferty, płatności, pliki, zgodność i transport).
**Weight profile:** większość funkcji `full` (dane osobowe, płatności, zgodność prawna, panel admina, weryfikacja firmy); utwardzenie jakości (SEO, wydajność, testy, CI/CD, obserwowalność) `medium`.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Decyzja o zapleczu produkcyjnym | Foundation | done |
| 2 | Prawdziwy model danych | Foundation | done |
| 3 | CI/CD i środowiska | Foundation | in progress |
| 4 | Obserwowalność produkcyjna | Foundation | planned |
| 5 | RODO i zgodność prawna | Foundation | planned |
| 6 | Rdzeń pętli na prawdziwym zapleczu | Slice 1 | planned |
| 7 | Realna oferta i jej przyjęcie | Slice 2 | planned |
| 8 | Realne płatności | Slice 3 | planned |
| 9 | Realne przechowywanie plików | Slice 4 | planned |
| 10 | Realny silnik zgodności (Polska, pilot) | Slice 5 | planned |
| 11 | Realna wycena transportu | Slice 6 | planned |
| 12 | Realizacja i statusy na prawdziwym zapleczu | Slice 7 | planned |
| 13 | Powiadomienia e mail | Slice 8 | planned |
| 14 | Panel administracyjny | Slice 9 | planned |
| 15 | Weryfikacja firmy producenta (realna) | Slice 10 | planned |
| 16 | SEO podstawowe stron publicznych | Utwardzenie | planned |
| 17 | Wydajność: cel i audyt Core Web Vitals | Utwardzenie | planned |
| 18 | Testy regresyjne ścieżek krytycznych | Utwardzenie | planned |
| 19 | Przegląd bezpieczeństwa przed startem | Utwardzenie | planned |

## Foundations

### 1. Decyzja o zapleczu produkcyjnym · full · done
Wybór technicznego zaplecza (hosting, baza danych, dostawca autoryzacji, przechowywanie plików), zastępującego dzisiejsze dane mockowe i `localStorage`. Jedna decyzja, na której stoją wszystkie kolejne funkcje tej epiki.
**Done when:** decyzja o hostingu, bazie danych, dostawcy autoryzacji i przechowywaniu plików jest zapisana w spec, a środowisko deweloperskie łączy się z prawdziwą, pustą bazą.
- [x] Zaprojektuj (spec): [0017](../specs/0017-zaplecze-produkcyjne/index.md)
- [x] Zbuduj: `/develop zaplecze produkcyjne` (kod w `lib/db/client.ts`, `lib/db/schema.ts`, `drizzle.config.ts`, `.env.local.example`, `package.json`. Neon Postgres, region Frankfurt (UE), projekt `modularhub`, jeszcze bez schematu — schemat i pierwsza migracja to feature 2.)
- [x] Zweryfikuj: `/check verify zaplecze produkcyjne`
- [x] Testuj: `/test zaplecze produkcyjne` (`lib/db/client.test.ts`, 3 testy)

### 2. Prawdziwy model danych · full · done
Schemat encji zastępujący dzisiejsze fixture'y i `localStorage`: konta i role, projekty/produkty, zapytania, oferty, zamówienia i etapy realizacji, płatności, dokumenty, status zgodności per kraj.
**Done when:** schemat i relacje obsługują wszystkie funkcje tej epiki bez migracji łamiącej dane, migracja jest zastosowana na środowisku deweloperskim.
- [x] Zaprojektuj (spec): [0018](../specs/0018-prawdziwy-model-danych/index.md)
- [x] Build it: `/develop prawdziwy model danych` (kod w `lib/db/schema.ts`, `lib/db/queries.ts`, migracje `drizzle/0000_jittery_maverick.sql`, `drizzle/0001_seed_countries.sql`, `drizzle/0002_audit_log_trigger.sql`)
  - [x] Konta i profile: tabele Auth.js (users/accounts/sessions/verification_tokens) rozszerzone o rolę, plus producer/client/country, satisfies AC-1, AC-6
  - [x] Katalog i zgodność: product (połączenie Project+SavedProduct) i trzy tabele statusu zgodności, satisfies AC-1
  - [x] Zapytanie → oferta → zamówienie → płatność → dokument, satisfies AC-1, AC-4
  - [x] Ścieżka audytu: audit_log, trigger Postgres z redakcją pól osobowych, kolumny deletedAt, satisfies AC-2
  - [x] Zastosuj pierwszą migrację na deweloperskiej bazie Neon i sprawdź izolację danych per rola, satisfies AC-3, AC-5
- [x] Verify it: `/check verify prawdziwy model danych`
- [x] Test it: `/test prawdziwy model danych`

### 3. CI/CD i środowiska · in progress (budowana)
Zautomatyzowany pipeline (build, testy, wdrożenie) i osobne środowisko staging przed produkcją, zamiast ręcznych wdrożeń.
**Done when:** push na główną gałąź uruchamia build i testy automatycznie, wdrożenie na staging jest automatyczne, a wdrożenie na produkcję wymaga świadomego kroku.
- [x] Zaprojektuj (spec): [0019](../specs/0019-ci-cd-i-srodowiska/index.md)
- [x] Zbuduj: `/develop CI/CD i środowiska` (kod w `.github/workflows/ci.yml`, `deploy-staging.yml`, `deploy-production.yml`, `playwright.config.ts`; branch Neon `staging` założony. Zostały ręczne kroki poza kodem, patrz Follow-up w spec 0019: Vercel Custom Environments, wyłączenie auto deploy Vercela dla main, sekrety GitHub Actions, ochrona gałęzi main, podłączenie Vercel MCP.)

### 4. Obserwowalność produkcyjna · needs a decision
Śledzenie błędów w czasie rzeczywistym i podstawowa analityka zdarzeń biznesowych (rejestracja, zapytanie, oferta, płatność), żeby awarie i luki w lejku były widoczne od pierwszego dnia prawdziwego ruchu.
**Done when:** błąd w kodzie produkcyjnym trafia do narzędzia śledzenia błędów razem z kontekstem, a kluczowe zdarzenia biznesowe są rejestrowane i widoczne w jednym miejscu.
- [ ] Zaprojektuj (spec): `/architect obserwowalność produkcyjna`

### 5. RODO i zgodność prawna · needs a decision · full
Zgoda na cookies, polityka prywatności, regulamin i udokumentowana podstawa prawna przetwarzania danych klienta i producenta. Musi działać, zanim funkcja 6 zacznie zbierać pierwsze prawdziwe konta.
**Done when:** baner zgody na cookies blokuje niekonieczne śledzenie do momentu zgody, polityka prywatności i regulamin są opublikowane i podlinkowane, a każdy formularz zbierający dane osobowe wskazuje podstawę prawną przetwarzania (basis: RODO, Regulation (EU) 2016/679, art. 4 i 6; ePrivacy Directive 2002/58/EC dla zgody na cookies).
- [ ] Zaprojektuj (spec): `/architect RODO i zgodność prawna`

## Slice 1: rdzeń pętli

### 6. Rdzeń pętli na prawdziwym zapleczu · needs a decision · full
Najcieńszy, ale prawdziwy wątek przez wszystkie warstwy: klient i producent logują się na prawdziwe konta, producent zapisuje jeden produkt w bazie, klient widzi go w prawdziwych, nie mockowych, wynikach i wysyła jedno zapytanie zapisane w bazie i widoczne producentowi. To jest szkielet chodzący tej epiki, dowodzący, że warstwy się łączą (basis: podejście Tracer Bullet, dowieźć jeden prawdziwy wątek przez cały stos przed rozbudową).
**Done when:** producent zakłada konto i loguje się, dodaje jeden produkt trwale zapisany w bazie, klient zakłada konto i widzi ten produkt w wynikach pobranych z bazy, a wysłane zapytanie jest trwale zapisane i widoczne po stronie producenta.
- [ ] Zaprojektuj (spec): `/architect rdzeń pętli na prawdziwym zapleczu`

## Slice 2: oferta

### 7. Realna oferta i jej przyjęcie · needs a decision
Producent odpowiada na zapytanie prawdziwą ofertą zapisaną w bazie; klient ją przyjmuje, co tworzy zamówienie o śledzonym statusie zamiast dzisiejszego mocka „oferta wiążąca”.
**Done when:** oferta złożona przez producenta jest trwale zapisana i widoczna klientowi, a przyjęcie oferty tworzy zamówienie w bazie z pierwszym statusem realizacji.
- [ ] Zaprojektuj (spec): `/architect realna oferta i jej przyjęcie`

## Slice 3: płatności

### 8. Realne płatności · needs a decision · full
Prawdziwa integracja płatnicza za usługi jednorazowe (analiza działki, domykanie luk) i pobranie prowizji platformy od zaakceptowanej oferty, zastępująca dzisiejszą makietę „zapłać”.
**Done when:** płatność za usługę jednorazową i prowizja od zamówienia są realnie autoryzowane i rozliczone, a status płatności jest widoczny użytkownikowi i trwale zapisany (basis: PSD2, Directive (EU) 2015/2366, wymóg silnego uwierzytelnienia płatności elektronicznych; Consumer Rights Directive 2011/83/EU dla sprzedaży na odległość na terenie UE).
- [ ] Zaprojektuj (spec): `/architect realne płatności`

## Slice 4: pliki

### 9. Realne przechowywanie plików · needs a decision · full
Rzuty, zdjęcia i dokumenty producenta trwale przechowywane i pobieralne, zastępujące dzisiejszą makietę uploadu bez zapisu.
**Done when:** wgrany plik jest trwale zapisany, dostępny do pobrania po odświeżeniu strony i w kolejnej sesji, a niedozwolony typ lub rozmiar pliku jest odrzucany z komunikatem.
- [ ] Zaprojektuj (spec): `/architect realne przechowywanie plików`

## Slice 5: silnik zgodności

### 10. Realny silnik zgodności (Polska, pilot) · needs a decision · full
Rzeczywiste, aktualizowalne wymagania prawne dla Polski zamiast trzech statycznych wierszy mocka, z widoczną ścieżką aktualizacji, gdy przepisy się zmienią.
**Done when:** status gotowości eksportowej dla Polski pochodzi z rzeczywistego źródła danych, nie z fixture'u, a zmiana źródłowych danych jest widoczna na ekranie bez zmiany kodu.
- [ ] Zaprojektuj (spec): `/architect realny silnik zgodności`

## Slice 6: transport

### 11. Realna wycena transportu · needs a decision
Wycena transportu z rzeczywistego źródła (sieć przewoźników lub API cenowe) zamiast stałej stawki per kraj dostawy.
**Done when:** widełki cenowe transportu na ofercie pochodzą z rzeczywistego źródła wyceny, a zmiana trasy lub kraju zmienia wynik bez zmiany kodu.
- [ ] Zaprojektuj (spec): `/architect realna wycena transportu`

## Slice 7: realizacja

### 12. Realizacja i statusy na prawdziwym zapleczu · needs a decision
Oś statusów (produkcja, transport, montaż, odbiór, gwarancja) czytana z bazy danych i aktualizowana przez producenta lub operatora, zamiast dzisiejszego mocka i `localStorage`.
**Done when:** zmiana statusu zamówienia przez producenta jest trwale zapisana i natychmiast widoczna klientowi na osi statusów, a historia zmian jest zachowana.
- [ ] Zaprojektuj (spec): `/architect realizacja i statusy na prawdziwym zapleczu`

## Slice 8: powiadomienia

### 13. Powiadomienia e mail · needs a decision
E mail przy kluczowych zdarzeniach transakcyjnych (nowe zapytanie, nowa oferta, zmiana statusu realizacji, potwierdzenie płatności), żeby użytkownik nie musiał ręcznie sprawdzać aplikacji.
**Done when:** każde z czterech zdarzeń wysyła e mail do właściwego odbiorcy w rozsądnym czasie, treść e maila odpowiada zdarzeniu, a błąd wysyłki nie blokuje głównej akcji użytkownika.
- [ ] Zaprojektuj (spec): `/architect powiadomienia e mail`

## Slice 9: panel admina

### 14. Panel administracyjny · needs a decision · full
Wewnętrzny panel do przeglądu i moderacji producentów, projektów i zapytań, chroniony osobną autoryzacją dla personelu.
**Done when:** uprawniony administrator widzi listę producentów, projektów i zapytań, może zablokować lub odblokować producenta, a dostęp do panelu jest niedostępny bez roli administratora.
- [ ] Zaprojektuj (spec): `/architect panel administracyjny`

## Slice 10: weryfikacja firmy

### 15. Weryfikacja firmy producenta (realna) · needs a decision · full
Rzeczywista weryfikacja dokumentów firmy producenta przed pierwszą wypłatą prowizji, zastępująca dzisiejszą listę wymaganych dokumentów bez weryfikacji.
**Done when:** producent wgrywa wymagane dokumenty firmowe, status weryfikacji zmienia się na podstawie rzeczywistego sprawdzenia, a wypłata jest zablokowana do czasu pozytywnej weryfikacji.
- [ ] Zaprojektuj (spec): `/architect weryfikacja firmy producenta`

## Utwardzenie przed startem

### 16. SEO podstawowe stron publicznych · needs a decision
Metadane, sitemapa, dane strukturalne i obrazy OG na stronach publicznych (start, wyniki), żeby platforma była odkrywalna w wyszukiwarce.
**Done when:** każda publiczna strona ma unikalny tytuł i opis, sitemapa XML jest generowana automatycznie i zawiera publiczne strony, a strona wyników ma dane strukturalne dla listy ofert.
- [ ] Zaprojektuj (spec): `/architect SEO podstawowe stron publicznych`

### 17. Wydajność: cel i audyt Core Web Vitals · needs a decision
Konkretne progi wydajnościowe dla stron publicznych i jeden dedykowany audyt oraz utwardzenie przed startem, ważne dla SEO i konwersji.
**Done when:** strona startowa i wyniki spełniają zapisane progi Core Web Vitals w pomiarze produkcyjnym, nie tylko lokalnym, a wyniki audytu są zapisane (basis: web.dev, Core Web Vitals, progi LCP do 2,5 s, INP do 200 ms, CLS do 0,1 na 75 percentylu).
- [ ] Zaprojektuj (spec): `/architect wydajność: cel i audyt Core Web Vitals`

### 18. Testy regresyjne ścieżek krytycznych
Automatyczny test end to end obejmujący krytyczne ścieżki transakcyjne (logowanie, dodanie produktu, zapytanie, oferta, płatność, zmiana statusu realizacji) przechodzące przez prawdziwe zaplecze, łapiący regresje między modułami zamiast tylko wewnątrz jednej funkcji.
**Done when:** jeden lub więcej testów e2e pokrywa pełną ścieżkę klienta i producenta na prawdziwym zapleczu i jest uruchamiany automatycznie w pipeline (funkcja 3) przed wdrożeniem na produkcję.
- [ ] Napisz testy: `/test testy regresyjne ścieżek krytycznych`

### 19. Przegląd bezpieczeństwa przed startem · full
Świadomy punkt kontrolny bezpieczeństwa (autoryzacja, płatności, dane osobowe, panel admina) tuż przed uruchomieniem produkcyjnym, zamiast polegania wyłącznie na utwardzeniu per funkcja (basis: OWASP Application Security Verification Standard, jako struktura wymagań do weryfikacji przed startem).
**Done when:** przegląd bezpieczeństwa jest przeprowadzony na kompletnym, podłączonym zapleczu, a każde krytyczne lub wysokie ustalenie jest naprawione albo świadomie zaakceptowane przed startem.
- [ ] Uruchom przegląd: `/security-review`

## Deferred
Poza zakresem tej epiki, świadomie odłożone.
- **Wersje językowe (EN/DE)**: rozszerzenie z samego polskiego pilotu · needs a decision
- **Rozszerzenie poza Polskę**: pozostałe kraje z dzisiejszego mocka silnika zgodności (np. Niemcy, Holandia) · needs a decision · full weight
- **Zawężenie mapy gotowości eksportowej do krajów rejestracji**: rozszerzenie kontraktu URL, który dziś przenosi tylko nazwę projektu, zostaje odłożone razem z rozszerzeniem poza Polskę · needs a decision
- **Pełna stopka strony** (kontakt, pełne informacje prawne, przełącznik języka): baner zgody i podstawowe dokumenty prawne pokrywa funkcja 5, ale pełna stopka kontaktowa zostaje odłożona · needs a decision
- **Aplikacja mobilna lub natywna** · needs a decision
- **Alternatywny model przychodu** (np. subskrypcja producenta zamiast prowizji), gdyby model prowizyjny z funkcji 8 okazał się niewystarczający · needs a decision

## References

_Poziom: źródła plus zweryfikowane linki, na życzenie zamawiającego (research przed większymi decyzjami)._

**Źródła projektowe:**
- [docs/scope/prototyp.md](prototyp.md), sekcja Deferred: pierwotna lista odłożonych możliwości, z której wywodzi się większość funkcji tej epiki.
- `AGENTS.md` w katalogu głównym: stack (Next.js 16, App Router, TypeScript), podejście Facade dzisiejszego prototypu, zasada asynchronicznych funkcji dostępu do danych.

**Praktyki i standardy (zweryfikowane linki):**
- RODO, Regulation (EU) 2016/679: [eur-lex.europa.eu/eli/reg/2016/679/oj](https://eur-lex.europa.eu/eli/reg/2016/679/oj), art. 4 i 6, zgoda jako podstawa prawna przetwarzania danych osobowych.
- ePrivacy Directive 2002/58/EC: [eur-lex.europa.eu/eli/dir/2002/58/oj/eng](https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng), wymóg zgody na cookies przed zapisem na urządzeniu użytkownika.
- WCAG 2.2, W3C Recommendation: [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/), poziom AA jako obecny standard dostępności (kontynuacja praktyki z epiki Prototyp).
- Core Web Vitals, web.dev: [web.dev/articles/vitals](https://web.dev/articles/vitals), metryki i progi LCP, INP, CLS.
- OWASP Application Security Verification Standard: [owasp.org/www-project-application-security-verification-standard](https://owasp.org/www-project-application-security-verification-standard/), struktura wymagań do przeglądu bezpieczeństwa aplikacji z płatnościami i danymi osobowymi.
- PSD2, Directive (EU) 2015/2366, silne uwierzytelnienie płatności: [finance.ec.europa.eu, Strong Customer Authentication](https://finance.ec.europa.eu/publications/strong-customer-authentication-requirement-psd2-comes-force_en).
- Consumer Rights Directive 2011/83/EU: [eur-lex.europa.eu, CELEX 32011L0083](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011L0083), wymogi informacyjne i prawo odstąpienia przy sprzedaży na odległość w UE.

## Legend

**Pole decyzyjne.** Każda funkcja ma dokładnie jedno, podzadanie kończące się na „(spec)”. Reszta pól to zadania wykonawcze.

**Cykl życia funkcji:**

| Stan | Ustawia | Funkcja pokazuje |
|---|---|---|
| `planned` · needs a decision | `/scope` | jedno pole: `Zaprojektuj (spec): /architect <funkcja>` |
| `in progress` (zaprojektowana) | `/architect` przy zapisaniu spec | „Zaprojektuj” odhaczone; spec podlinkowany; `Zbuduj: /develop <funkcja>` z listą kamieni milowych ze spec |
| `in progress` (budowana) | `/develop` | kamienie milowe odhaczane po kolei |
| `in progress` (zweryfikowana) | `/check verify` | „Zbuduj” i kamienie milowe odhaczone; „Zweryfikuj” odhaczone |
| `done` | `/test`, potem `/sync` | wszystkie pola odhaczone |

- **Następny krok** = pierwsze nieodhaczone pole (zawsze polecenie albo śledzony kamień milowy).
- **needs a decision** = najpierw `/architect`, inaczej od razu `/develop` (albo `/test`/`/security-review` dla dwóch pozycji utwardzenia bez własnej decyzji).
- **Status**: `planned` do `in progress` do `done`, plus `dropped` (wypadło z zakresu, zachowane dla historii).
- **Znacznik wagi** `· full` = warto zrobić świeży `/check review`; `lean`/`medium` bez znacznika.
