# 0065. Rozdział certyfikatów producenta od oceny zgodności projektu

**Date**: 2026-10-03
**Status**: In Progress

## Summary

Dziś jeden płaski wpis "Zgodność z Bbl" wygląda na certyfikat, a w rzeczywistości jest deklaracją producenta o konkretnym kraju. Ta decyzja rozdziela trzy rzeczy: certyfikaty firmy (z oznaczeniem, czy platforma je potwierdziła), ocenę zgodności konkretnego projektu z przepisami kraju (w osobnej tabeli, z tym samym zastrzeżeniem co Compliance Engine) oraz dwie odznaki zaufania, które nie zależą od siebie. Certyfikat bez potwierdzenia administratora nigdy nie wygląda jak potwierdzony.

## Requirements

**User stories**:
- Jako inwestor przeglądający projekt, chcę wiedzieć, czy certyfikat jest potwierdzony przez platformę, czy to tylko deklaracja producenta, żeby nie wziąć deklaracji za dokument.
- Jako inwestor, chcę zobaczyć ocenę zgodności konkretnego projektu z przepisami kraju osobno od certyfikatów firmy, żeby wiedzieć, czego ta ocena dotyczy.
- Jako producent, chcę dodać i usunąć swoje certyfikaty, żeby aktualizować profil.
- Jako administrator, chcę potwierdzić albo cofnąć potwierdzenie certyfikatu lub oceny, żeby oznaczenie "potwierdzone" zawsze miało pokrycie.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Tabela `producer_certification` ma pola: `producer_id` (FK na `producer`, kasowanie kaskadowe), `name` (niepusta, do 200 znaków), `issuer` (opcjonalny), `confirmation_status` (`self_reported` albo `platform_confirmed`, domyślnie `self_reported`), `confirmed_at`, `confirmed_by` (FK na `users`, puste przy braku potwierdzenia). CHECK w bazie wymusza: `platform_confirmed` wymaga `confirmed_at` i `confirmed_by`, a `self_reported` wymaga, żeby oba były puste. Unikat na (`producer_id`, `name`).
- **AC-2**: Tabela `product_compliance_assessment` ma pola: `product_id` (FK na `product`, kasowanie kaskadowe), `country_code` (kraj z istniejącego typu kodu kraju), `rule` (niepusty, np. `bbl`), `status` (`approved`, `conditional` albo `blocked`, te same wartości co `eligibility`), `reason` (niepusty), oraz to samo potwierdzenie co w AC-1. Unikat na (`product_id`, `country_code`, `rule`). Ten sam CHECK co w AC-1.
- **AC-3**: Migracja przenosi każdy string z `producer_capacity_profile.certifications` każdego producenta do wiersza `producer_certification` ze statusem `self_reported` i pustym `issuer`. Wpis Budmana "Zgodność z Bbl (holenderskie przepisy budowlane)" dostaje nazwę "Zgodność z Bbl (deklaracja producenta)". Migracja jest idempotentna (ponowne uruchomienie nie duplikuje wierszy). Migracja NIE tworzy dla Budmana żadnego wiersza `product_compliance_assessment` (patrz Decision, odstępstwo od wcześniejszej odpowiedzi).
- **AC-4**: Po wdrożeniu odczytów z AC-12 kolumna `producer_capacity_profile.certifications` zostaje usunięta w osobnej, późniejszej migracji (patrz Migration plan).
- **AC-5**: Strona `/project/[id]` pokazuje sekcję "Certyfikaty producenta" z certyfikatami firmy. Każdy certyfikat ma wyraźny stan tekstem i ikoną: "Potwierdzone przez platformę" albo "Deklaracja producenta, niepotwierdzona". Sekcja nie renderuje się, gdy producent nie ma certyfikatów (zgodnie ze spec 0020 AC-4).
- **AC-6**: Strona `/project/[id]` pokazuje sekcję "Ocena zgodności projektu z przepisami" z wierszami `product_compliance_assessment` dla tego produktu: kraj, przepis, status (odznaka), powód, stan potwierdzenia tekstem i ikoną oraz zastrzeżenie Compliance Engine (ten sam tekst co na ekranie zgodności prawnej). Sekcja nie renderuje się, gdy nie ma wierszy.
- **AC-7**: Karta na `/verified-manufacturers` pokazuje odznakę "Zweryfikowana zdolność wolumenowa" oraz wyłącznie certyfikaty `platform_confirmed`. Deklaracje producenta i oceny projektów na karcie się nie pojawiają.
- **AC-8**: Odznaka "Zweryfikowana tożsamość firmy" (gdy `producer.verificationStatus = approved`) i odznaka "Zweryfikowana zdolność wolumenowa" (gdy `volumeVerificationStatus = approved`) są niezależne. Żadna nie wynika z drugiej. Budman ma zdolność wolumenową zweryfikowaną i tożsamość firmy niezweryfikowaną, i tak ma zostać pokazany.
- **AC-9**: Producent w swoim panelu dodaje certyfikat (nazwa, wystawca opcjonalny) i usuwa własne wpisy. Nowy wpis zawsze startuje jako `self_reported`. Zmiana nazwy lub wystawcy potwierdzonego wpisu ustawia go z powrotem na `self_reported` i czyści `confirmed_at`/`confirmed_by`.
- **AC-10**: Administrator na istniejącej stronie `/internal/producers/[id]` widzi certyfikaty firmy i oceny produktów tego producenta. Może dodać, zmienić i usunąć ocenę produktu (kraj, przepis, status, powód; to zapis tego, co producent zadeklarował) oraz oznaczyć certyfikat albo ocenę jako `platform_confirmed` albo cofnąć do `self_reported`. Każda taka zmiana zapisuje się w `audit_log` z aktorem: akcje idą przez `withAdminActor` (spec 0064), a nowe tabele dostają trigger `audit_log_capture` (wzorzec z `drizzle/0048`), bo sam `withAdminActor` nic nie zapisuje.
- **AC-11**: Zmianę `confirmation_status`, `confirmed_at` i `confirmed_by` może wykonać wyłącznie zalogowany administrator, sprawdzane po stronie serwera (nie tylko ukryciem przycisku). Producent nie może ustawić potwierdzenia nawet przez bezpośrednie wywołanie akcji. Każda zmiana zwiększa `version` w tej samej instrukcji `UPDATE`; potwierdzenie z nieaktualną wersją zwraca `stale`.
- **AC-12**: Odczyt projektów (`lib/data/projects.ts`) czyta certyfikaty z `producer_certification`, a oceny z `product_compliance_assessment`. Funkcja `applyCertifications` oraz odczyt z jsonb zostają usunięte. Listing z AC-7 filtruje do potwierdzonych już w zapytaniu, nie w komponencie.
- **AC-13**: Nowe etykiety mają prawdziwe tłumaczenia pl/en/nl (nie kopię polskiego tekstu), zgodnie z AC-11 spec 0038.
- **AC-14**: Każdy nowy stan (potwierdzone, niepotwierdzone, status oceny, odznaka) jest komunikowany tekstem i ikoną, nigdy samym kolorem (WCAG 2.2 AA, jak w `components/klient/AGENTS.md`).
- **AC-15**: Fixture `lib/data/fixtures/eligibility.ts` (ocena dla Polski i pozostałych wpisów) zostaje bez zmian. Ta decyzja nie przenosi całego Compliance Engine do bazy (to funkcja 14).
- **AC-16**: Formularz pojemności producenta i jego zapis (`lib/project-quote-actions.ts`, zapisy `certifications` około linii 454 i 492) nie zapisują już pola `certifications`. Producent zarządza certyfikatami wyłącznie przez sekcję z AC-9.

## Decision

**Chosen option**: Option 1: Rozdział w modelu danych, potwierdzanie przez administratora, trzy niezależne etykiety.

Certyfikat firmy trafia do nowej tabeli `producer_certification`. Ocena zgodności projektu z przepisami kraju trafia do nowej tabeli `product_compliance_assessment` w realnej bazie. Każdy z tych wpisów ma status `self_reported` albo `platform_confirmed`, a ustawia go wyłącznie administrator. Odznaki tożsamości firmy i zdolności wolumenowej pozostają niezależne i dostają osobne etykiety.

**Odstępstwo od wcześniejszej odpowiedzi (do potwierdzenia przy ratyfikacji)**: w rozmowie wybrano, żeby dzisiejsze "Zgodność z Bbl" Budmana przenieść jako ocenę dla NL. Ocena zgodności wymaga werdyktu dla konkretnego projektu (approved, conditional albo blocked). Dla Budmana takiego werdyktu nie ma, bo wpis był deklaracją ogólną dla całego producenta. Zamiana go na 13 ocen per projekt tworzyłaby statusy, których producent nigdy nie podał. Dlatego wpis trafia jako certyfikat firmy `self_reported`, a tabela ocen dla Budmana zostaje pusta do czasu, aż zespół Budmana poda werdykt dla każdego modelu.

## Rationale

Pełne uzasadnienie, rozważane opcje i kontekst decyzji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

- `producer` (istnieje): `verification_status` (tożsamość firmy, bez zmian).
- `producer_capacity_profile` (istnieje): `volume_verification_status` (bez zmian). Kolumna `certifications` (jsonb `string[]`) jest wygaszana w AC-4.
- `producer_certification` (nowa): `id` uuid PK · `producer_id` uuid NOT NULL FK → `producer.id` ON DELETE CASCADE · `name` text NOT NULL, niepusta, max 200 · `issuer` text NULL · `confirmation_status` enum `producer_certification_status` (`self_reported`, `platform_confirmed`) NOT NULL DEFAULT `self_reported` · `confirmed_at` timestamptz NULL · `confirmed_by` uuid NULL FK → `users.id` ON DELETE RESTRICT (konta administratora, który cokolwiek potwierdził, nie da się skasować bez cofnięcia potwierdzeń; SET NULL złamałby CHECK) · `created_at`, `updated_at`. Relacja 1:N, `producer` → `producer_certification`. Indeks na `producer_id`.
- `product_compliance_assessment` (nowa): `id` uuid PK · `product_id` uuid NOT NULL FK → `product.id` ON DELETE CASCADE · `country_code` (istniejący typ kodu kraju) NOT NULL · `rule` text NOT NULL (np. `bbl`) · `status` enum `compliance_assessment_status` (`approved`, `conditional`, `blocked`) NOT NULL · `reason` text NOT NULL · `confirmation_status`, `confirmed_at`, `confirmed_by` jak wyżej · `created_at`, `updated_at`. Unikat (`product_id`, `country_code`, `rule`). Relacja 1:N, `product` → `product_compliance_assessment`.
- CHECK na obu tabelach: (`confirmation_status = 'platform_confirmed'` AND `confirmed_at` IS NOT NULL AND `confirmed_by` IS NOT NULL) OR (`confirmation_status = 'self_reported'` AND `confirmed_at` IS NULL AND `confirmed_by` IS NULL).
- Kolumna `version` (int NOT NULL, domyślnie 1) w obu tabelach rośnie o 1 w każdym `UPDATE`; służy do blokady optymistycznej.

**State transitions**:
- `self_reported` → `platform_confirmed`: tylko admin, zapisuje `confirmed_at` i `confirmed_by`.
- `platform_confirmed` → `self_reported`: admin cofa potwierdzenie (czyści pola), albo producent zmienia nazwę lub wystawcę (automatycznie).
- Każde przejście to jedna instrukcja `UPDATE` (zgodnie z `lib/db/AGENTS.md`, zmiana flagi bez okna z zerem potwierdzeń).

**API surface** (akcje serwerowe, nie endpointy REST; istniejący wzorzec projektu):

| Akcja | Plik | Kluczowe dane wejściowe | Kluczowe dane wyjściowe | Auth | Kluczowe błędy |
|---|---|---|---|---|---|
| `addProducerCertification` | `lib/producer-certification-actions.ts` (nowy) | `name`, `issuer?` | `{ ok, id, error }` | producent właściciel | `unauthorized`, walidacja |
| `updateProducerCertification` | j.w. | `id`, `name`, `issuer?` | `{ ok, error }` | producent właściciel | `not_found`, walidacja; zmiana resetuje do `self_reported` |
| `deleteProducerCertification` | j.w. | `id` | `{ ok, error }` | producent właściciel | `not_found` |
| `setProducerCertificationConfirmation` | `lib/producer-certification-admin-actions.ts` (nowy) | `id`, `status`, `expectedVersion` | `{ ok, error }` | admin, `withAdminActor` | `stale` (wiersz zmieniony od odczytu), `unauthorized` |
| `upsertProductComplianceAssessment` | j.w. | `productId`, `countryCode`, `rule`, `status`, `reason`, `expectedVersion?` | `{ ok, id, error }` | admin, `withAdminActor` | `stale`, walidacja, `unauthorized` |
| `deleteProductComplianceAssessment` | j.w. | `id`, `expectedVersion` | `{ ok, error }` | admin, `withAdminActor` | `stale`, `unauthorized` |
| `setProductComplianceAssessmentConfirmation` | j.w. | `id`, `status`, `expectedVersion` | `{ ok, error }` | admin, `withAdminActor` | `stale`, `unauthorized` |

**Key invariants**:
- Publicznie (`/project/[id]`, `/verified-manufacturers`) nigdy nie pokazuje się `confirmed_by` (identyfikator administratora). Publicznie widać wyłącznie stan i datę potwierdzenia.
- Budman nie dostaje żadnego wiersza `product_compliance_assessment` bez werdyktu podanego przez jego zespół.
- Listing na `/verified-manufacturers` nie pokazuje deklaracji (AC-7). Filtr jest w zapytaniu SQL (AC-12).
- Zmiana nazwy lub wystawcy potwierdzonego certyfikatu zawsze cofa go do `self_reported` w tej samej instrukcji `UPDATE` (nie w dwóch krokach).
- `expectedVersion` w akcjach admina (optymistyczna blokada): zapis działa tylko wtedy, gdy `version` w bazie równa się wersji, którą admin widział. Inaczej admin dostaje błąd `stale`. Zapobiega to potwierdzeniu nazwy, której admin nie widział.

**Security model**:
- Odczyt publiczny, bo to informacja o produkcie, wyświetlana już dziś na stronie produktu. Bez logowania.
- Zapis certyfikatu: wyłącznie właściciel producent (sprawdzenie `producer_id` z sesji po stronie serwera).
- Zapis `confirmation_status`: wyłącznie rola `admin`, przez `withAdminActor`, z wpisem do `audit_log` (spec 0064). Brak zależności od UI.
- Brak danych osobowych w nowych tabelach poza `confirmed_by` (identyfikator konta admina, widoczny tylko w panelu i w `audit_log`).
- Zakres zgodności: ta decyzja nie zmienia podstawy prawnej ani zakresu udostępniania danych (RODO bez zmian). Zastrzeżenie tekstowe dotyczy treści przepisów, nie danych osobowych.

**Configuration required**: brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy mapuje się na AC):
- Happy path: producent dodaje certyfikat, admin go potwierdza, inwestor na `/project/[id]` widzi "Potwierdzone przez platformę", weryfikuje **AC-5, AC-9, AC-10**.
- Happy path (ocena): admin dodaje ocenę NL dla produktu, strona projektu pokazuje wiersz z zastrzeżeniem, weryfikuje **AC-6, AC-10**.
- Failure case (zmiana po potwierdzeniu): producent zmienia nazwę potwierdzonego certyfikatu; wpis wraca do `self_reported`, na listingu znika, weryfikuje **AC-7, AC-9**.
- Failure case (stale): admin potwierdza wpis, który producent właśnie zmienił; akcja zwraca `stale`, nic nie zapisuje, weryfikuje **AC-11** i zasadę optymistycznej blokady.
- Auth/permission: producent wywołuje `setProducerCertificationConfirmation`, dostaje odmowę i nic się nie zmienia, weryfikuje **AC-11**.
- Budman po migracji: jeden wiersz `producer_certification` self_reported, zero wierszy `product_compliance_assessment`, weryfikuje **AC-3**.
- Karta listingu: deklaracja Budmana nie pojawia się, odznaka zdolności tak, odznaka tożsamości nie, weryfikuje **AC-7, AC-8**.
- Regresja: `lib/data/fixtures/eligibility.ts` nietknięty, ekran zgodności dla Polski działa jak dziś, weryfikuje **AC-15**.

**Build approach**: Tracer Bullet (cienki, pełny przekrój przez bazę, dane, UI i admina, potem pogrubianie), zgodnie z kontynuacją podejścia epiki Produkcja (spec 0038).

## Build plan

1. Migracja: enumy `producer_certification_status` i `compliance_assessment_status`, tabele `producer_certification` i `product_compliance_assessment`, CHECK, unikaty, indeksy, kolumna `version`, `confirmed_by` ON DELETE RESTRICT, trigger `audit_log_capture` na obu tabelach (wzorzec `drizzle/0048`), w `lib/db/schema.ts`. Zastosowanie najpierw na gałęzi Neon, potem na dev. satisfies **AC-1**, **AC-2**, **AC-10**
2. Walidacja Zod: `lib/producer-certification-specs.ts` (nazwa, wystawca) i `lib/product-compliance-assessment-specs.ts` (status, powód), z testami jednostkowymi. satisfies **AC-1**, **AC-2**, **AC-9**
3. Backfill wszystkich producentów: każdy string z jsonb staje się wierszem `producer_certification` (self_reported), idempotentnie (`ON CONFLICT` po `producer_id`, `name`). Wpis Budmana z nazwą z AC-3, bez wierszy oceny. Uruchamiany tuż przed wdrożeniem kodu z zadania 4 (patrz Migration plan). Dla Budmana przez Neon MCP po akceptacji inżyniera. satisfies **AC-3**
4. Odczyt: `lib/data/projects.ts` czyta z nowych tabel, `applyCertifications` usunięte, filtr potwierdzonych w zapytaniu listingu, nowa funkcja odczytu ocen dla produktu. satisfies **AC-5**, **AC-6**, **AC-7**, **AC-12**
5. Komponenty klienta: przepisany `ProjectCertifications.tsx` (dwa stany), nowy `ProjectComplianceAssessments.tsx` (wiersze ocen z zastrzeżeniem Compliance Engine), zmiana etykiety w `VerifiedManufacturerProjectCard.tsx`, odznaka tożsamości w `ProducerCard.tsx`. satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-14**
6. Akcje producenta i panel: `lib/producer-certification-actions.ts`, sekcja w panelu producenta (dodaj, usuń, edytuj), usunięcie pola `certifications` z formularza pojemności i z zapisu w `lib/project-quote-actions.ts` (linie około 454 i 492). satisfies **AC-9**, **AC-11**, **AC-16**
7. Akcje admina i strona: `lib/producer-certification-admin-actions.ts` (`withAdminActor`, `expectedVersion`), CRUD ocen produktu (dodaj, zmień, usuń), sekcja na `/internal/producers/[id]`. satisfies **AC-10**, **AC-11**
8. Usunięcie kolumny `producer_capacity_profile.certifications` w osobnej migracji, po wdrożeniu odczytów z zadania 4 (patrz Migration plan). satisfies **AC-4**
9. Tłumaczenia pl/en/nl dla nowych etykiet i stanów. satisfies **AC-13**
10. Testy: walidacja, CHECK przeciw dev DB (zgodnie z `lib/db/AGENTS.md`), autoryzacja akcji (producent i admin), reset przy zmianie, komponenty dwóch stanów, filtr listingu, regresja fixture Polski. satisfies **AC-1** do **AC-12**, **AC-15**
11. Przegląd dostępności nowych stanów (tekst i ikona, kolejność fokusu w panelu admina). satisfies **AC-14**

## Consequences

**Positive**:
- Inwestor widzi różnicę między tym, co producent deklaruje, a tym, co platforma potwierdziła. Dziś tej różnicy nie widać.
- Ocena zgodności projektu jest w realnej bazie i powiązana z konkretnym produktem, a nie z fikcyjnym kluczem.
- Odznaki tożsamości i zdolności są rozdzielone, więc żadna nie udaje drugiej.
- Mechanizm potwierdzania i blokady optymistycznej nie zależy od ekranu dokumentów (funkcja 19).

**Negative / tradeoffs**:
- Listing `/verified-manufacturers` pokaże Budmanowi mniej certyfikatów, dopóki admin czegokolwiek nie potwierdzi. To zamierzone, ale widoczna zmiana.
- Budman nie dostaje żadnej oceny zgodności projektu, dopóki jego zespół nie poda werdyktów. Sekcja na stronie projektu będzie pusta dla wszystkich jego modeli.
- Dwie nowe tabele, dwa zestawy akcji i dwa miejsca w panelach to więcej kodu do utrzymania.
- Potwierdzenie wymaga ręcznej pracy administratora. Bez tego wszystko zostaje deklaracją, nawet prawdziwy dokument.

**Neutral**:
- Polska ocena zgodności nadal czyta fixture `eligibility.ts` do czasu funkcji 14, więc przez jakiś czas są dwa źródła ocen (fixture dla PL i baza dla pozostałych).
- Wymagany dwuetapowy plan migracji (patrz poniżej), bo kolumna jsonb jest czytana przez działający kod.

## Migration plan

**Strategy**: expand and contract (strangler na poziomie danych): nowe tabele obok starej kolumny, przepięcie odczytów, potem usunięcie kolumny.

**Phases**:
1. Dodać enumy i tabele (zadanie 1), zrobić backfill wszystkich producentów (zadanie 3), wdrożyć kod czytający z nowych tabel i usuwający zapis do jsonb (zadania 4 do 7). Kolumna `certifications` zostaje, ale od tego wdrożenia nic jej nie zapisuje i nic nie czyta.
2. Po zweryfikowaniu na produkcji, osobna migracja usuwa kolumnę `producer_capacity_profile.certifications` (zadanie 8).

**Rollback**: cofnięcie kodu przywraca odczyty z jsonb, ale pokazuje stan sprzed migracji, bo od wdrożenia nic już nie zapisuje do jsonb. Zmiany zrobione w nowych tabelach zostają w bazie, tylko poprzedni kod ich nie czyta. Rollback jest więc bezpieczny dla danych, ale nie dla widoku: Bbl wróci jako zwykły wpis bez oznaczenia deklaracji. Faza 2 nie ma odwrotu bez backupu, dlatego wykonuje się ją dopiero po zweryfikowanej fazie 1 na produkcji.

**Risks**: producent zmieni wpis w jsonb między backfillem a wdrożeniem kodu. Zabezpiecza to ponowne uruchomienie backfillu tuż przed wdrożeniem (jest idempotentny). Admin potwierdzi wpis z błędną nazwą (blokada wersją to ogranicza). Pusty widok przed backfillem, gdy nowe tabele są już czytane, dlatego backfill i wdrożenie idą w jednym oknie.

## Follow-up

- [ ] Odstępstwo do ratyfikacji: Bbl Budmana trafia jako certyfikat firmy `self_reported`, a nie jako 13 ocen per projekt. Potwierdzić przy akceptacji spec.
- [ ] Zespół Budmana podaje werdykt zgodności dla każdego modelu (`approved`, `conditional`, `blocked`, z powodem), wtedy powstają wiersze `product_compliance_assessment`. Wymaga kontaktu biznesowego, nie kodu.
- [ ] Funkcja 14 (realny silnik zgodności, Polska): przeniesienie `eligibility.ts` do bazy i wygaszenie fixture. Dopiero wtedy znika podwójne źródło ocen.
- [ ] Funkcja 19 (weryfikacja firmy producenta, realna): osobny `/architect` na upload i sprawdzanie dokumentów firmy. Ta decyzja tylko definiuje znaczenie odznaki tożsamości i pole potwierdzenia.
- [ ] Przed uznaniem treści zastrzeżenia za finalną potwierdzić z prawnikiem: zakres obowiązku kwaliteitsborgera (Wkb) zależy od kategorii budynku, a relacja typegoedkeuring do Erkende Kwaliteitsverklaring (EKV) wymaga weryfikacji.
- [ ] Tłumaczenie etykiet na niemiecki (DE), jeśli ma być w zakresie produkcji (dziś pl/en/nl, zgodnie z spec 0038 AC-11).
- [ ] Ekran administratora do przeglądu wszystkich niepotwierdzonych wpisów w jednym miejscu, gdy liczba producentów wzrośnie (dziś wystarcza strona producenta).
- [ ] Certyfikat per produkt/model (tabela łącząca), gdy pojawi się producent, którego certyfikat dotyczy tylko jednego modelu. Dziś poza zakresem.
