# 0084. Formularz zapytania dopasowany do rodziny produktu

**Date**: 2026-11-11
**Updated**: 2026-11-12 (formularz niczego nie pyta, wszystkie pytania są kartami doradcy)
**Status**: In Progress

## Summary

Formularz zapytania (`/inquiry`) i karty startowe po jego wysłaniu są dziś napisane pod dom: przy saunie klient widzi "Wybrane domy", "metraż do ustalenia" i "Adres działki", a po wysłaniu dostaje pytania o dom. Ta specyfikacja dopasowuje do rodziny produktu (dom, spa modułowe, kontenery modułowe, outdoor tv) dwie rzeczy: etykiety formularza oraz zestaw kart startowych, czyli pytań doradcy. Formularz nie dostaje żadnych nowych pytań ani pól odpowiedzi, wszystkie pytania o produkt pojawiają się dopiero jako karty po wysłaniu. Formularz mówi klientowi jedną linią, że doradca zada kilka krótkich pytań, i pokazuje wybraną konfigurację tylko do odczytu. Nie ma migracji bazy.

## Context

Formularz `components/klient/InquiryFlow.tsx` powstał dla zapytań o domy (spec 0005, 0048, 0066). Od tego czasu katalog dostał inne rodziny: spa modułowe (sauny, jacuzzi), kontenery modułowe i outdoor tv, a klient może zapytać o jedną z nich albo o kilka produktów naraz (do trzech, `MAX_ADVISORY_HOMES`). Dla nich formularz pokazuje nagłówek "Wybrane domy", linię "producent · metraż do ustalenia" (sauna nie ma metrażu), "Adres działki", "Kraj działki" i pytanie o użytkowanie przez cały rok lub sezonowo (spec 0075).

Ten sam problem jest za formularzem: `createAdvisoryCase` zawsze wysyła tych samych sześć kart startowych (`lib/cases/start-cards.ts`), a cztery z nich to pytania o dom ("sam dom", "dom z transportem", "gotowość działki", ogrzewanie). Klient zapytujący o saunę dostaje więc pytania, które go nie dotyczą, a doradca nie dostaje informacji, które go obchodzą (miejsce ustawienia, zasilanie).

Doradca jest zarazem ograniczeniem: spec 0048 świadomie zostawia budżet, termin i zakres usług rozmowie, a karta startowa jest już dziś mechanizmem zadawania takich pytań (pytanie z listą odpowiedzi i stanem w `case_field`). Formularz ma więc zostać krótki. Konfiguracja wybrana na stronie produktu (spec 0081) idzie dziś do doradcy jako migawka, ale klient nie widzi jej na formularzu.

## Requirements

**User stories**:
- Jako klient pytający o saunę chcę formularz, który mówi o saunie, a nie o domu i działce.
- Jako klient chcę widzieć na formularzu wybrany wariant, opcje i cenę od, żeby wiedzieć, co dokładnie wysyłam.
- Jako klient chcę wiedzieć przed wysłaniem, że doradca zada mi jeszcze kilka pytań, żeby nie zastanawiać się, czy formularz o czymś zapomniał.
- Jako doradca chcę dostać od klienta pytania dopasowane do produktu, a nie pytania o dom przy saunie.

**Acceptance criteria**:
- **AC-1**: Dla zapytania rodziny `dom` formularz wygląda jak dziś (nagłówek "Wybrane domy", "Adres działki", "Kraj działki", użytkowanie cały rok lub sezonowo, linia producent i metraż). Dla pozostałych rodzin pokazuje neutralne etykiety ("Wybrany produkt", "Miejsce montażu lub dostawy", "Kraj dostawy"), nie pokazuje pytania o użytkowanie i nie pokazuje "metraż do ustalenia".
- **AC-2**: Rodzina zapytania to `dom`, gdy którakolwiek pozycja jest domem, w przeciwnym razie rodzina pierwszego produktu z listy. Przeglądarka i serwer stosują tę samą regułę (jedna czysta funkcja), a serwer liczy rodzinę z bazy po identyfikatorach produktów, nigdy z wartości od klienta.
- **AC-3**: Formularz nie zawiera żadnych nowych pól ani pytań o produkt, a serwer nie przyjmuje żadnych odpowiedzi z formularza. Wysłanie wymaga dokładnie tego samego co dziś. Pod przyciskiem wysyłki każda rodzina pokazuje jedną linię, że doradca zada kilka krótkich pytań o produkt, i ta linia nie opiera się na samym kolorze.
- **AC-4**: Karty startowe zależą od rodziny. Dom dostaje sześć kart jak dziś, w tej samej kolejności. Spa modułowe dostaje karty: miejsce ustawienia, zasilanie 400 V, termin. Kontenery modułowe: przyłącza, liczba sztuk, termin. Outdoor tv: miejsce montażu, liczba sztuk, termin. Budżet jest tylko kartą domu. Kolejność wiadomości pozostaje rosnąca i deterministyczna.
- **AC-5**: Ponowne wysłanie z tym samym kluczem idempotencji nie dubluje kart i zwraca tę samą sprawę, także dla zestawów o innej liczbie kart niż sześć.
- **AC-6**: Przy zapytaniu o jeden produkt z wybraną konfiguracją formularz pokazuje podsumowanie tylko do odczytu w języku strony: wariant, opcje (grupa i etykieta, z ceną lub "na zapytanie"), stylistykę, sumę z oznaczeniem "od", gdy któraś opcja jest na zapytanie. Gdy nic nie wybrano albo produktów jest kilka, podsumowania nie ma. Podsumowanie niczego nie zmienia w tym, co zapisuje serwer (migawka dalej powstaje na serwerze z identyfikatorów).
- **AC-7**: Doradca widzi odpowiedzi na nowe karty w podsumowaniu potrzeb sprawy z polskimi etykietami i może je poprawić (`upsertCaseField` przyjmuje nowe klucze), a klient widzi i zmienia swoje odpowiedzi w panelu sprawy tak jak dla dzisiejszych kart.
- **AC-8**: Wszystkie nowe teksty (etykiety formularza, linia o pytaniach doradcy, karty nowych kluczy) są w pl, en, de i nl, test spójności kluczy przechodzi. Logika kluczuje po rodzinie i kluczu pytania, nigdy po przetłumaczonym tekście.
- **AC-9**: Zapytanie o dom nie zmienia się w niczym poza jedną linią informacyjną pod przyciskiem: te same pola, wymagania, adres, kontakt gościa, pułapka na boty, limity i te same sześć kart (spec 0048, 0066, 0075).

## Options considered

### Option 1: Formularz dopasowany tylko etykietami, pytania wyłącznie jako karty per rodzina

Jedna mapa "rodzina do etykiet" dla formularza i jedna mapa "rodzina do zestawu kart" dla `createAdvisoryCase`. Formularz niczego nie pyta, tylko uprzedza, że karty przyjdą.

**Pros**:
- Formularz zostaje krótki, a spec 0048 ("formularz niczego nie wymaga") działa bez wyjątków.
- Jedno miejsce odpowiedzi na pytania o potrzeby: karta i `case_field`. Zero migracji, zero nowej akcji, zero nowej walidacji wejścia od klienta.
- Nowa rodzina lub pytanie to wpis w danych, a nie nowy ekran.

**Cons**:
- Klient dowiaduje się o pytaniach dopiero po wysłaniu (łagodzi to jedna linia informacyjna). Odpowiedź przychodzi później, bo wymaga wejścia w panel sprawy.
- Katalog kart przestaje być "tylko dom", co zmienia `createAdvisoryCase`, jego testy i potencjalnie `CaseCardStack`.

### Option 2: Trzy opcjonalne pytania w formularzu, zapisywane w `case_field`

Wcześniejsza wersja tej specyfikacji: formularz pokazuje trzy pytania rodziny, a odpowiedź zamyka kartę.

**Pros**:
- Doradca dostaje część odpowiedzi od razu, już w chwili wysłania.

**Cons**:
- Dłuższy formularz tam, gdzie spec 0048 chce go krótkiego, i więcej kodu: schemat wejścia, filtr po rodzinie, zapis w `db.batch`, grupy pól z obsługą klawiatury.
- Dwa miejsca zadawania tego samego pytania (formularz i karta) i reguła "odpowiedź z formularza zamyka kartę".
- Odrzucone przez inżyniera, który chce pytań wyłącznie jako kart doradcy.

### Option 3: Osobne formularze (komponenty) dla każdej rodziny

**Pros**:
- Pełna swoboda wyglądu i pól na rodzinę.

**Cons**:
- Cztery kopie logiki gościa, adresu, idempotencji, pułapki na boty i błędów. Każda poprawka w czterech miejscach.
- Zapytanie mieszane wymaga i tak wybierania, który formularz pokazać.

### Option 4: Tylko zmiana tekstów, karty bez zmian

**Pros**:
- Najmniej pracy, naprawia widoczną usterkę.

**Cons**:
- Karty po wysłaniu nadal pytają saunę o "sam dom" i "gotowość działki". Problem przesuwa się za formularz.

## Decision

**Chosen option**: Option 1: Formularz dopasowany tylko etykietami, pytania wyłącznie jako karty per rodzina

Formularz i `createAdvisoryCase` czytają rodzinę z jednej czystej funkcji. Formularz zmienia etykiety i pokazuje jedną linię o pytaniach doradcy, a zestaw kart startowych wybiera rodzina.

Rozstrzygnięcia drobne, podjęte w tej specyfikacji (z drugą w kolejności opcją):
- **Klucz `termin` wspólny dla wszystkich rodzin**, te same cztery przedziały (jak najszybciej, do 6 miesięcy, do roku, elastyczny): porównywalne dane i jedno tłumaczenie. Alternatywa: osobny klucz z krótszymi przedziałami dla sauny.
- **Rodzina zapytania mieszanego**: dom, jeśli jest na liście, w przeciwnym razie pierwszy produkt. Alternatywa: neutralny zestaw tylko z terminem.
- **Nagłówek dla nie domów to "Wybrany produkt" lub "Wybrane produkty"**, bez podziału na saunę i jacuzzi. Alternatywa: rzeczownik z podkategorii dla jednego produktu.
- **Użytkowanie (spec 0075) tylko dla rodziny `dom`**; dla pozostałych pole nie jest pokazywane, a serwer go nie wymaga.
- **Budżet zostaje kartą tylko dla domu** (pytanie wrażliwe). Alternatywa: budżet także dla sauny, kontenera i tv.
- **Jedna linia informacyjna pod przyciskiem, ta sama dla wszystkich rodzin.** Alternatywa: brak linii, klient dowiaduje się o pytaniach w panelu sprawy.
- **Podsumowanie konfiguracji zostaje** jako podgląd tylko do odczytu, bo nie jest odpowiedzią klienta.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Karta startowa to już dziś "pytanie z listą odpowiedzi i stanem w `case_field`" (spec 0048), więc jest właściwym miejscem na pytania o potrzeby, także dla innych rodzin. Spec 0048 zostawia budżet, termin i zakres rozmowie z doradcą, a formularz, który wymaga lub nawet tylko proponuje wiele odpowiedzi, obniża liczbę wysłanych zapytań. Najkrótszy formularz plus pytania po wysłaniu spełnia obie zasady naraz.

Inżynier świadomie wybrał pytania wyłącznie jako karty, odrzucając wcześniejszy zapis z trzema pytaniami w formularzu (Option 2). Kosztem jest późniejszy moment odpowiedzi, który łagodzi linia informacyjna pod przyciskiem. Zyskiem są mniej kodu (brak nowego wejścia w akcji, filtra odpowiedzi i zapisu w `db.batch`), brak reguły "odpowiedź z formularza zamyka kartę" i jedno miejsce prawdy o potrzebach klienta.

Osobne formularze (Option 3) multiplikują logikę, która jest najbardziej krucha (gość, idempotencja, limity). Sama zmiana tekstów (Option 4) została odrzucona, bo karty po wysłaniu pozostałyby domowe: klient pytający o saunę nadal dostałby "sam dom" i "gotowość działki". To jeden problem w dwóch miejscach, więc jedna specyfikacja.

## Feature design

**Data model sketch**: brak zmian schematu i migracji. Odpowiedzi na karty zapisują się w istniejącej tabeli `case_field` tak jak dziś przy `answerCard`. Formularz nie zapisuje do niej nic.

**Katalog pytań** (rozszerzenie `lib/cases/start-cards.ts`, czyste dane, bez importu React i next-intl). Każdy wpis dostaje listę rodzin, a mapa `FAMILY_CARD_KEYS` mówi, jaki zestaw kart dostaje rodzina:

| Klucz | Rodziny | Opcje (wartości) |
|---|---|---|
| `zakres_uslug`, `budzet`, `gotowosc_dzialki`, `ogrzewanie`, `standard_wykonczenia` | dom | bez zmian |
| `termin` | wszystkie | bez zmian |
| `miejsce_ustawienia` | spa-modulowe | `ogrod`, `taras`, `wnetrze_budynku`, `inne` |
| `zasilanie_400v` | spa-modulowe | `jest_przylacze`, `do_wykonania`, `niepotrzebne` |
| `przylacza` | kontenery-modulowe | `wszystkie`, `czesc`, `brak` |
| `liczba_sztuk` | kontenery-modulowe, outdoor-tv | `jeden`, `od_2_do_5`, `od_6` |
| `miejsce_montazu_tv` | outdoor-tv | `wewnatrz`, `na_zewnatrz_pod_dachem`, `na_zewnatrz_odkryte` |

Zestawy kart: dom dostaje wszystkie sześć dzisiejszych (warstwa 1 i 2, kolejność bez zmian). Spa: `miejsce_ustawienia`, `zasilanie_400v`, `termin`. Kontenery: `przylacza`, `liczba_sztuk`, `termin`. Outdoor tv: `miejsce_montazu_tv`, `liczba_sztuk`, `termin`. Każdy nowy klucz ma ikonę dla każdej opcji (nazwa z `lucide-react`, mapowana w komponencie karty jak dziś) oraz tłumaczenia `CaseCards.<klucz>` (`question`, `options.<wartość>.label`, `options.<wartość>.consequence`).

**Funkcja rodziny**: `resolveInquiryFamily(families: ProductFamily[]): ProductFamily` w `lib/inquiry-family.ts` (czysta, bez importu bazy), używana przez stronę serwerową, komponent i `createAdvisoryCase`.

**State transitions**: bez zmian (etap `nowe`, kanał `klient_doradca`, jak w spec 0048).

**API surface**: brak nowych akcji, tras i pól wejścia. `submitAdvisoryInquiry` przyjmuje to samo co dziś. Zmienia się wewnętrzna `createAdvisoryCase`: dostaje `family` (liczoną po stronie serwera z bazy po identyfikatorach produktów) i wybiera zestaw kart z `FAMILY_CARD_KEYS`.

Strona `/inquiry` (serwerowa) dodatkowo przekazuje do `InquiryFlow` rodzinę i, dla jednego produktu z konfiguracją, gotowe podsumowanie konfiguracji (AC-6): `buildConfigurationSnapshot` dostaje opcjonalny parametr `locale` (domyślnie `pl`, jak dziś dla migawki dla doradcy), a podsumowanie dla klienta jest budowane w języku strony.

**Key invariants**:
- Rodzinę określa serwer z bazy, nigdy klient. Klient nie przesyła niczego, co wpływa na zestaw kart.
- Zestaw kart zależy tylko od rodziny. Dom zawsze dostaje te same sześć kart w tej samej kolejności.
- Karty powstają w tej samej operacji co sprawa, a idempotencja zostaje na kluczu zapytania (AC-5), niezależnie od liczby kart w zestawie.
- Etykiety i teksty tylko w `messages/*.json`, nigdy w katalogu ani w bazie (jak karty dziś).
- Podsumowanie konfiguracji jest wyłącznie wyświetlaniem; migawka dla doradcy powstaje na serwerze z identyfikatorów (spec 0081).

**Security model**: zapytanie nadal składa gość (spec 0066) albo zalogowany klient; nic nowego nie jest dostępne dla innych ról. Klient nie wysyła żadnych nowych danych, więc nie dochodzi nowy zakres RODO ani nowa walidacja wejścia. Akcja `upsertCaseField` doradcy waliduje klucz po katalogu, więc nowe klucze są automatycznie dozwolone dla doradcy.

**Configuration required**: brak nowych zmiennych środowiskowych. Po dodaniu kluczy tłumaczeń trzeba zrestartować `next dev` (cache `messages/*.json`).

**Critical test scenarios**:
- Sauna end to end: zapytanie o produkt `spa-modulowe` pokazuje neutralne etykiety, brak pytania o użytkowanie, brak nowych pól i linię o pytaniach doradcy; po wysłaniu powstają dokładnie trzy karty (miejsce ustawienia, zasilanie 400 V, termin) w tej kolejności, verifies **AC-1**, **AC-3**, **AC-4**.
- Dom: formularz bez zmian poza linią informacyjną, sześć kart jak dziś, verifies **AC-4**, **AC-9**.
- Zapytanie mieszane dom i sauna: zestaw domu (sześć kart), użytkowanie widoczne, verifies **AC-2**, **AC-4**.
- Kontenery i outdoor tv: po trzy karty ze swoich zestawów, verifies **AC-4**.
- Powtórka z tym samym kluczem idempotencji dla sauny (trzy karty): bez duplikatów, ta sama sprawa, verifies **AC-5**.
- Podsumowanie konfiguracji dla jednego produktu z opcją na zapytanie ("od"), brak podsumowania przy kilku produktach, verifies **AC-6**.
- Odpowiedź klienta na kartę sauny pojawia się w widoku doradcy z polską etykietą, a `upsertCaseField` przyjmuje nowe klucze i odrzuca wartość spoza opcji, verifies **AC-7**.
- Test spójności katalogów tłumaczeń (pl, en, de, nl) obejmujący linię informacyjną i nowe karty, verifies **AC-8**.

## Build plan

Podejście projektu to Tracer Bullet (cienki, prawdziwy wątek przez wszystkie warstwy, potem pogrubianie): najpierw sauna (spa modułowe) od formularza do doradcy, potem reszta rodzin jako dane. Część kroków 1, 3 i 4 jest już w drzewie roboczym (rodzina kart, etykiety formularza, tłumaczenia, `lib/inquiry-family.ts`), więc `/develop` zaczyna od sprawdzenia stanu i domyka braki. Nie ma kodu odpowiedzi z formularza, który trzeba by usuwać.

1. Katalog `start-cards.ts`: rodziny, mapa `FAMILY_CARD_KEYS`, klucze `miejsce_ustawienia` i `zasilanie_400v`; `lib/inquiry-family.ts` z testami jednostkowymi reguły (dom, pierwszy produkt), satisfies **AC-2**, **AC-4**
2. `createAdvisoryCase` przyjmuje rodzinę z serwera i tworzy tylko karty jej zestawu, z mikroprzesunięciami czasu dla zmiennej liczby kart; zaktualizuj testy kart i idempotencji, satisfies **AC-4**, **AC-5**, **AC-9**
3. Strona `/inquiry` liczy rodzinę, a `InquiryFlow` dostaje etykiety per rodzina (nagłówek, linia produktu, adres, kraj, użytkowanie tylko dla domu) oraz linię informacyjną pod przyciskiem, satisfies **AC-1**, **AC-3**, **AC-9**
4. Tłumaczenia pl, en, de, nl dla etykiet formularza, linii informacyjnej i kart sauny (z ikonami opcji), satisfies **AC-8**
5. Pozostałe rodziny jako dane i tłumaczenia: `przylacza`, `liczba_sztuk`, `miejsce_montazu_tv` (kontenery, outdoor tv), z ikonami opcji, satisfies **AC-4**, **AC-8**
6. Podsumowanie konfiguracji: parametr `locale` w `buildConfigurationSnapshot`, budowa na stronie serwerowej, komponent tylko do odczytu nad polem tekstowym, satisfies **AC-6**
7. Sprawdź i popraw widoki: `CaseCardStack` (liczba kart z wiadomości, nowe klucze, ikony), `app/[locale]/internal/cases/[id]/page.tsx` i `app/[locale]/panel/inquiries/[id]/page.tsx` (etykiety nowych kluczy, edycja przez doradcę), satisfies **AC-7**
8. Test end to end sauny w Playwright (formularz bez pytań, trzy karty w panelu sprawy), test regresji domu, uruchomiony według zasady z `AGENTS.md` o `DATABASE_URL`, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-9**

## Consequences

**Positive**:
- Klient pytający o saunę, kontener lub tv widzi formularz i karty o swoim produkcie.
- Formularz zostaje tak krótki jak dziś, a spec 0048 nie ma wyjątku od zasady "formularz niczego nie wymaga".
- Brak migracji bazy, brak nowej akcji, brak nowej walidacji wejścia od klienta i brak nowego ekranu admina.
- Nowa rodzina lub pytanie to dane i tłumaczenia, nie nowy komponent.

**Negative / tradeoffs**:
- Doradca dostaje odpowiedzi dopiero wtedy, gdy klient odpowie na karty w panelu sprawy, a nie w chwili wysłania zapytania.
- Katalog kart przestaje być prostą listą sześciu pozycji: `createAdvisoryCase`, jego testy i `CaseCardStack` muszą obsłużyć zmienną liczbę kart.
- Jeden wspólny klucz `termin` oznacza te same przedziały dla sauny i domu; krótszy termin sauny nie ma osobnych opcji.
- Zapytanie mieszane z dwóch nie domowych rodzin dostaje karty pierwszego produktu, co bywa niedokładne.

**Neutral**:
- Każdy dodany klucz wymaga tłumaczeń w czterech językach i ikon dla opcji.
- Nagłówek "Wybrany produkt" dla spa jest celowo ogólny; sauna i jacuzzi nie są rozróżniane na formularzu.

## Follow-up

- [ ] Rozważyć rzeczownik z podkategorii spa ("sauna", "jacuzzi") w nagłówku dla pojedynczego produktu.
- [ ] Rozważyć osobny klucz terminu z krótszymi przedziałami dla sauny, jeśli doradcy uznają przedziały domu za zbyt grube.
- [ ] Rozważyć pytania w samym formularzu (wcześniejszy kształt tej specyfikacji), jeśli odsetek odpowiedzi na karty po wysłaniu okaże się niski. Wymaga danych z `lib/observability/`.
- [ ] Rozważyć dodanie rodziny do zdarzenia analitycznego wysłania zapytania (`lib/observability/`), żeby widzieć, które karty klienci pomijają.
- [ ] Po wdrożeniu `/sync`: dopisać do `components/klient/AGENTS.md` i `lib/cases/AGENTS.md` karty zależne od rodziny.
