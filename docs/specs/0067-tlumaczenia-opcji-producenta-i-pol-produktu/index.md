# 0067. Tłumaczenia EN, DE i NL dla opcji konfiguratora, producenta i pól produktu

**Date**: 2026-10-05
**Status**: Proposed

## Summary

Na stronach produktu w językach EN, DE i NL część tekstów nadal wychodzi po polsku: opcje konfiguratora, opis i notatka producenta, pola takie jak konstrukcja czy dach, powody decyzji zgodności. Mieszanie języków wygląda nieprofesjonalnie i utrudnia korzystanie ze strony. Ten spec dodaje tłumaczenia tych pól w bazie (osobne tabele dla opcji i producenta, kolumny dla pól produktu, jeden słownik dla krótkich, powtarzalnych zdań), a strona pokazuje polski tekst tylko tam, gdzie tłumaczenia jeszcze nie ma. Skrypt kontrolny wypisuje braki, więc nowy produkt nie wejdzie na produkcję po polsku bez ostrzeżenia. Edycja tych tłumaczeń przez producenta w panelu jest zapisana jako zadanie na później.

## Requirements

**User stories**:
- Jako klient oglądający produkt po angielsku, niemiecku lub holendersku chcę, żeby cała treść strony była w moim języku, żebym mógł ją zrozumieć i porównać oferty.
- Jako zespół platformy chcę jednej komendy, która pokazuje, czego brakuje w tłumaczeniach, żebym nie wypuścił produktu z polskimi tekstami w innych językach.
- Jako osoba robiąca import producenta chcę jasnej reguły, że tłumaczenia powstają razem z importem, żeby nie zostawały luki.

**Acceptance criteria** (kontrakt, każde kryterium da się sprawdzić osobno):
- **AC-1**: Nazwy grup i etykiety opcji konfiguratora na `/[locale]/sauna/[slug]` i `/[locale]/project/[slug]` pokazują tłumaczenie w locale `en`, `de`, `nl`, gdy istnieje. Ikona grupy i wykrywanie opcji negatywnej ("Nie") nadal działają, bo opierają się na polskim tekście źródłowym, a nie na wyświetlanym.
- **AC-2**: `producer.description`, `producer.showroom_visit_note` i `producer.inquiry_response_time_label` są pokazywane po tłumaczeniu w sekcji partnera, na kartach producenta i wszędzie, gdzie są dziś renderowane.
- **AC-3**: Pola produktu `construction_system`, `roof_type`, `customization_scope` i `service_scope_description` są pokazywane po tłumaczeniu na stronach produktu i na kartach list (`/[locale]/results`, polecane produkty, producenci z wolumenem), bo `ResultCard` renderuje `constructionSystem`.
- **AC-4**: Nazwy certyfikatów producenta (`producer_certification.name`) są pokazywane po tłumaczeniu wszędzie, gdzie `resolveProducerCertifications` je dostarcza.
- **AC-5**: Powody decyzji zgodności (`product_country_eligibility.reason`, `product_compliance_assessment.reason`) oraz `product_timeline_stage.responsible_party` i `starts_from_label` są tłumaczone przez słownik po polskim tekście. Pole `cost_line_item.responsible_party` jest poza zakresem, bo żadna strona klienta go nie renderuje.
- **AC-6**: Brak tłumaczenia, pusty ciąg lub tłumaczenie z samych spacji w danym polu i języku daje polski tekst tego pola. Pole nigdy nie znika i nie jest puste. Tłumaczenie częściowe (jedno pole tak, drugie nie) jest dozwolone.
- **AC-7**: Dla locale `pl` nic się nie zmienia, a zapytania nie dołączają tabel tłumaczeń.
- **AC-8**: Po backfillu skrypt kontrolny na dev i prod zgłasza zero braków dla opublikowanych produktów w `en`, `de`, `nl`. Brak to pole, w którym tekst źródłowy jest niepusty, a tłumaczenie puste albo nieistniejące. Obejmuje to 39 produktów Kora, Wooden Dream House i Dampol oraz katalog domów, a także 12 brakujących etykiet kosztów w `cost_line_item_label_translation`.
- **AC-9**: Skrypt kontrolny (`npm run check:translations`) tylko czyta bazę, wypisuje braki per język, encja i produkt (pola z tego speca oraz istniejące: opis i `foundation_options`) i kończy się kodem błędu przy brakach. Nie ocenia, czy tłumaczenie jest aktualne wobec zmienionego polskiego źródła (patrz Follow-up).
- **AC-10**: Skill importu `scrape-kora-wdh` i każdy skrypt importu producenta opisują obowiązek dopisania tłumaczeń opcji i producenta razem z importem.
- **AC-11**: Skan stron sauny, projektu i listy wyników w `/en`, `/de`, `/nl` na danych po backfillu nie znajduje w HTML żadnego z polskich tekstów źródłowych tych pól (porównanie z wartościami z bazy, nie z listą znaków diakrytycznych, bo "Tak", "Nie", "Dwuspadowy" nie mają polskich znaków), poza nazwami własnymi.

<!-- Poza zakresem: edycja tych tłumaczeń w panelu producenta, patrz Follow-up. -->

## Decision

**Chosen option**: Option 1: Tabele tłumaczeń per encja, kolumny w `product_translation` i jeden słownik dla krótkich zdań

Każde pole tekstowe dostaje tłumaczenie przypięte do swojego wiersza po `id` (opcje, producent, certyfikaty), pola produktu trafiają jako kolumny do istniejącego `product_translation`, a pola o niewielu powtarzalnych wartościach (powody zgodności, odpowiedzialny, start etapu) tłumaczy jeden słownik po polskim tekście, zgodnie z istniejącym wzorcem `cost_line_item_label_translation`. Każde pole spada na polski tekst, gdy brakuje tłumaczenia.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`)

## Feature design

**Data model sketch** (nowe tabele, wszystkie z `id uuid` klucz główny, `created_at`, `updated_at`, enum `locale` to istniejący `product_translation_locale` z wartościami `en`, `de`, `nl`):

| Tabela | Klucz obcy | Pola tłumaczone | Unikalność |
|---|---|---|---|
| `product_option_group_translation` | `group_id` → `product_option_group` | `name` (text, wymagane) | `(group_id, locale)` |
| `product_option_translation` | `option_id` → `product_option` | `label` (text, wymagane) | `(option_id, locale)` |
| `producer_translation` | `producer_id` → `producer` | `description`, `showroom_visit_note`, `inquiry_response_time_label` (wszystkie text, null) | `(producer_id, locale)` |
| `producer_certification_translation` | `certification_id` → `producer_certification` | `name` (text, wymagane) | `(certification_id, locale)` |
| `reference_text_translation` (słownik) | brak | `source_pl` (text, wymagane), `translated` (text, wymagane) | `(source_pl, locale)` |

Zmiana istniejącej tabeli `product_translation`: cztery nowe kolumny `text`, nullable, bez wartości domyślnej: `construction_system`, `roof_type`, `customization_scope`, `service_scope_description`.

Relacje: każda tabela tłumaczeń to 1:N od wiersza źródłowego (po jednym wierszu na język). Słownik nie ma klucza obcego, łączy się po dokładnym polskim tekście i języku.

**State transitions**: brak, tłumaczenie jest danymi, nie procesem.

**API surface** (zmiany sygnatur w warstwie danych, brak nowych endpointów HTTP):

| Funkcja | Zmiana | Wynik |
|---|---|---|
| `getProductOptionGroups(productId, locale = "pl")` w `lib/db/queries.ts` | dla `en`/`de`/`nl` left join tłumaczeń grup i opcji | `name`, `label` przetłumaczone, plus `sourceName` i `sourceLabel` (polski tekst źródłowy) |
| `getProducerById(id, locale = "pl")`, `getProducers(locale = "pl")` w `lib/data/producers.ts` | left join `producer_translation` | `description`, `showroomVisitNote`, `inquiryResponseTimeLabel` po tłumaczeniu |
| `resolveProducerCertifications(..., locale)` w `lib/data/projects.ts` (używana przez `getProjects`, `getProjectById`, `getVerifiedVolumeManufacturerProjects`) | left join `producer_certification_translation`; klucz i sortowanie zostają na polskiej nazwie lub `id` | nazwy certyfikatów po tłumaczeniu |
| `getProjectById`, `getProjects`, `getFeaturedProjectByFamily`, `getVerifiedVolumeManufacturerProjects` w `lib/data/projects.ts` | każde zapytanie dla `en`/`de`/`nl` selektuje cztery nowe kolumny `product_translation` i przekazuje je do `mapRowToProject` | `constructionSystem`, `roofType`, `customizationScope`, `serviceScopeDescription` po tłumaczeniu |
| `getEligibilityByCountry(countryCode, locale = "pl")`, `getProductComplianceAssessments(productId, locale = "pl")`, wariant harmonogramu | nowy parametr locale, left join słownika po `reason`, `responsible_party`, `starts_from_label`; strona `/results` wywołuje `getEligibilityByCountry` bez locale, bo czyta tylko `status` | tekst po tłumaczeniu |
| `resolveReferenceText(source, translated)` (nowy pomocnik, współdzielony z `resolveTranslatedText`) | `translated` niepuste po `trim` albo `source` | `string` |
| `scripts/check-translations.ts` + `npm run check:translations` | nowy skrypt, tylko odczyt | lista braków i ostrzeżeń, kod wyjścia 1 przy brakach |

**Key invariants**:
- Tłumaczenie nigdy nie zmienia logiki, tylko napis. `getGroupIcon` w `ProjectOptionsConfigurator` i sprawdzenie `option.label.trim().toLowerCase() === "nie"` muszą używać `sourceName` i `sourceLabel`, bo dziś dopasowują polskie słowa kluczowe (`ociepl`, `klimatyzacj`, `nie`). Wyświetlają zaś `name` i `label`.
- Tłumaczenie pasuje po `id` wiersza (opcje, producent, certyfikaty) albo po dokładnym polskim tekście (słownik), nigdy po pozycji.
- Pusty ciąg, same spacje lub brak wiersza dają fallback na polski (ta sama funkcja co `resolveTranslatedText`, spec 0028 AC-6).
- Dla `pl` zapytania nie dołączają żadnej tabeli tłumaczeń.
- Wiersze źródłowe usunięte miękko (`deleted_at`) nie wchodzą do wyników, więc ich tłumaczenia też nie.
- `(klucz źródłowy, locale)` jest unikalne w każdej tabeli tłumaczeń (indeks unikalny), żeby backfill mógł używać `ON CONFLICT`.

**Security model**: tłumaczenia są publiczne tak jak ich pola źródłowe (to treść stron klienta), bez danych osobowych. Zapis do nowych tabel wyłącznie przez backfill i import (skrypty i Neon MCP), żadna ścieżka aplikacji w nich nie zapisuje, więc nie ma nowego pola ataku. Uwaga: część pól źródłowych ma ścieżkę zapisu w aplikacji (`responsible_party` i `starts_from_label` w kreatorze producenta, `product_compliance_assessment.reason` zapisywane przez administratora, spec 0065). Nowy wolny tekst z tych ścieżek nie będzie miał wpisu w słowniku, więc na stronie wyjdzie po polsku, a skrypt kontrolny to zgłosi (patrz Follow-up). Testy zapisujące wiersze pracują na bazie dev (`assertDevDatabase`, `lib/db/AGENTS.md`). Zapis na prod to osobny, jawny krok po sprawdzeniu dev.

**Configuration required**: brak nowych zmiennych środowiskowych. Skrypt kontrolny czyta `DATABASE_URL` z środowiska, więc dla prod uruchamia się go z ustawionym połączeniem prod (najlepiej roli tylko do odczytu).

**Critical test scenarios** (każdy mapuje się na kryterium z `## Requirements`):
- Happy path: grupa i opcja z tłumaczeniem `en` zwracają angielski `name` i `label` oraz polskie `sourceName` i `sourceLabel`, verifies **AC-1**
- Negatywna opcja: etykieta "Nie" przetłumaczona na "No" nadal jest rozpoznana jako negatywna, a grupa "Poziom ocieplenia" nadal dostaje ikonę termometru po tłumaczeniu na "Insulation level", verifies **AC-1**
- Producent: `getProducerById(id, "de")` zwraca niemiecki opis, notatkę i etykietę czasu odpowiedzi, verifies **AC-2**
- Certyfikaty: `getProjectById(id, "de")` zwraca nazwy certyfikatów po tłumaczeniu, a sortowanie i klucz zostają na źródle, verifies **AC-4**
- Pola produktu: `getProjectById(id, "nl")` oraz `getProjects({ ... }, "nl")` zwracają przetłumaczone `roofType` i `constructionSystem` (także dla karty listy), verifies **AC-3**
- Słownik: powód zgodności z wpisem w słowniku wraca po tłumaczeniu, verifies **AC-5**
- Fallback: tłumaczenie `en` tylko jednego pola produktu, drugie pole wraca po polsku; pusty ciąg daje polski tekst, verifies **AC-6**
- Polski bez joinów: `getProductOptionGroups(id, "pl")` nie dotyka tabel tłumaczeń, verifies **AC-7**
- Skrypt kontrolny: baza z brakującym tłumaczeniem (źródło niepuste, tłumaczenie puste lub brak wiersza) daje kod 1 i wypis, baza kompletna kod 0, pole z pustym źródłem nie jest brakiem, verifies **AC-8**, **AC-9**
- Skan końcowy: HTML `/en/sauna/<slug>`, `/de/project/<slug>` i `/nl/results` po backfillu nie zawiera żadnego z polskich tekstów źródłowych pobranych z bazy dla tych produktów, verifies **AC-11**

## Build plan

Założenie: brak zapisanego podejścia do budowy dla tej funkcji, więc zgodnie z dojrzałym etapem produkcyjnym używam cienkich pionowych kawałków, każdy kończy się widocznym efektem na stronie. Jedna migracja z wyprzedzeniem, bo schemat jest potwierdzony w całości i jest tylko dodawany (nie ma ryzyka dla żywych danych).

1. Migracja wygenerowana przez `npm run db:generate` (numer nadaje narzędzie w chwili budowy, bo spec 0066 też planuje migrację, dziś ostatnia to `0050_certification_audit_plain`): pięć nowych tabel z indeksami unikalnymi i cztery nowe kolumny w `product_translation`. Definicje w `lib/db/schema.ts`. Test schematu na dev, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-7**
2. Kawałek A, opcje konfiguratora: `getProductOptionGroups(productId, locale)` ze `sourceName` i `sourceLabel`, `ProjectOptionsConfigurator` używa ich do ikony i wykrywania "Nie", obie strony (`sauna`, `project`) przekazują locale, testy zapytania i komponentu, satisfies **AC-1**, **AC-6**, **AC-7**
3. Kawałek B, producent: `producer_translation` (opis, notatka showroomu, etykieta czasu odpowiedzi) w `lib/data/producers.ts`, `getProducerById` i `getProducers` z locale, aktualizacja wywołań: `sauna/[slug]/page.tsx` (linia 133), `project/[slug]/page.tsx` (linia 169), `outdoor-tv/[slug]/page.tsx` (linia 120), strona główna `(customer)/page.tsx` (linia 30, `getProducers()`), `ProducerCard`, `OutdoorTvPartnerSection`. Osobno certyfikaty: locale w `resolveProducerCertifications` w `lib/data/projects.ts` (nie w `producers.ts`, które certyfikatów nie czyta) i join `producer_certification_translation`. Testy, satisfies **AC-2**, **AC-4**, **AC-6**
4. Kawałek C, pola produktu: cztery kolumny wybierane w `getProjectById`, `getProjects`, `getFeaturedProjectByFamily` i `getVerifiedVolumeManufacturerProjects` i przekazywane do `mapRowToProject` przez `resolveTranslatedText` (karta `ResultCard` renderuje `constructionSystem` z listy, więc same widoki szczegółów nie wystarczą), sprawdzenie `ProjectCompareTable`, testy, satisfies **AC-3**, **AC-6**
5. Kawałek D, słownik: tabela `reference_text_translation`, pomocnik `resolveReferenceText`, parametr locale w `getEligibilityByCountry` (strona `/results` go nie przekazuje) i `getProductComplianceAssessments` (tabela `product_compliance_assessment` istnieje od migracji 0049 i 0050, więc robimy to bezwarunkowo), joiny dla `reason`, `responsible_party` i `starts_from_label` w harmonogramie, testy, satisfies **AC-5**, **AC-6**
6. Skrypt kontrolny `scripts/check-translations.ts` i wpis `check:translations` w `package.json`: rdzeń jako czysta funkcja nad wierszami (testowalna bez bazy), cienka warstwa SQL tylko do odczytu, brak to źródło niepuste przy pustym lub nieistniejącym tłumaczeniu, test jednostkowy, satisfies **AC-8**, **AC-9**
7. Dane tłumaczeń i backfill: plik z unikalnymi polskimi tekstami i ich tłumaczeniami EN/DE/NL (około 200 tekstów: opcje Dampola, Kory i Wooden Dream House, konstrukcja, dach, personalizacja, zakres usług, opisy, notatki i etykiety czasu odpowiedzi producentów, certyfikaty, 25 powodów zgodności, 12 luk w etykietach kosztów). Dopasowanie po unikalnych wartościach (jedno zapytanie SQL ze słownikiem wypełnia setki produktów), nie ręcznie per produkt. Skrypt backfillu `scripts/backfill-translations-0067.ts` (wzorzec `backfill-cost-line-item-label-translations-2026-09-22.ts`), uruchomiony na dev, potem plik `drizzle/_promote_translations_0067_to_prod.sql` dla prod. Zapis na prod dopiero po przeglądzie dev, satisfies **AC-8**
8. Aktualizacja skillów importu (`.claude/skills/scrape-kora-wdh/SKILL.md` i opisów skryptów importu): obowiązek dopisania tłumaczeń opcji i producenta, satisfies **AC-10**
9. Weryfikacja końcowa: `npm run check:translations` na dev i prod (zero braków), skan HTML stron sauny, projektu i listy wyników w trzech językach pod kątem polskich tekstów źródłowych pobranych z bazy, satisfies **AC-8**, **AC-11**

## Migration plan

**Strategy**: feature rozszerzający (expand only), bez usuwania i bez zmiany istniejących kolumn. Nowy kod ma fallback na polski, więc strona działa także przed backfillem.
**Phases**:
1. Zastosuj nową migrację na dev, potem na prod (`npm run db:migrate`). Workflowy CI uruchamiają `db:migrate` przed `vercel build` i wdrożeniem (`deploy-production.yml`, `deploy-staging.yml`), więc kolejność jest poprawna. Migracja musi zadziałać przed wdrożeniem kodu, który czyta nowe tabele, bo zapytania z `left join` do nieistniejącej tabeli się wywrócą.
2. Wdróż kod z fallbackiem (strona wygląda jak dziś, bo tabele są puste).
3. Uruchom backfill na dev, sprawdź skrypt kontrolny i ręcznie stronę, potem backfill na prod.
4. Uruchom skrypt kontrolny na prod (zero braków).
**Rollback**: cofnięcie commitu kodu wystarcza, nowe tabele i kolumny są nieużywane i nieszkodliwe. Ich usunięcie to osobna, późniejsza migracja, jeśli kiedykolwiek potrzebna.
**Risks**: kod wdrożony przed migracją na prod (błąd zapytań, mitigacja: kolejność w kroku 1, oraz brak pewności, czy integracja Vercel z Gitem nie wdraża samodzielnie po pushu z pominięciem kroku migracji, bo repo nie ma `vercel.json`); backfill z literówką w polskim kluczu słownika (tłumaczenie się nie dopasuje, skrypt kontrolny to wyłapie).

## Consequences

**Positive**:
- Cała treść danych produktu na stronach klienta jest w języku klienta, bez mieszania.
- Brak tłumaczeń jest widoczny z jednej komendy, zanim zobaczy go klient.
- Wzorzec jest spójny z `product_translation` i `cost_line_item_label_translation`, więc kolejny zespół od razu go rozumie.

**Negative / tradeoffs**:
- Pięć nowych tabel i cztery kolumny to więcej schematu do utrzymania i więcej joinów w zapytaniach dla `en`, `de`, `nl`.
- Dwa mechanizmy obok siebie (tłumaczenie po `id` i słownik po polskim tekście). Zmiana polskiego tekstu w słowniku po cichu zrywa jego tłumaczenie (fallback na polski, wykryje to tylko skrypt kontrolny, bo brak to źródło bez tłumaczenia).
- Nie wykrywamy tłumaczenia nieaktualnego wobec zmienionego polskiego źródła: w schemacie nie ma automatycznego `updated_at`, więc porównanie dat byłoby fałszywe. Zmiana polskiego tekstu dla tłumaczenia po `id` zostawia stare tłumaczenie bez ostrzeżenia.
- Brak edycji w panelu: dopóki jej nie ma, każde nowe tłumaczenie to praca zespołu (import albo Neon MCP), producent sam tego nie zrobi.
- Fallback na polski oznacza, że luka jest niewidoczna dla klienta, a jej wychwycenie zależy od tego, czy ktoś uruchamia skrypt kontrolny.

**Neutral**:
- Migracja idzie na prod przez `db:migrate` w CI.
- Etykiety kosztów zostają w istniejącej tabeli `cost_line_item_label_translation`, tylko uzupełniamy 12 luk.

## Follow-up

- [ ] Edycja przez producenta w panelu (zadanie na później, na dziś niemożliwe): ekran katalogu opcji z polami EN/DE/NL, edycja opisu i notatki producenta z tłumaczeniami, edycja nazw certyfikatów. Dziś żaden z tych tekstów nie ma ekranu edycji, bo zapisuje je wyłącznie import i Neon MCP, więc najpierw trzeba zbudować sam ekran edycji. Wtedy ścieżkę zapisu tłumaczeń zrobić po wzorcu `lib/producer-product-actions.ts`.
- [ ] Wykrywanie nieaktualnych tłumaczeń (zmieniony polski tekst po zapisaniu tłumaczenia). Wymaga kolumny ze zrzutem tekstu źródłowego per przetłumaczone pole (wzorzec `ai_translated_from_*` w `product_translation`), bo `updated_at` nie jest w tym repo aktualizowany automatycznie.
- [ ] Tłumaczenie nowego wolnego tekstu zapisywanego przez aplikację (`responsible_party` i `starts_from_label` w kreatorze, powód oceny zgodności od administratora): wywołać istniejące automatyczne tłumaczenie przy zapisie, po wzorcu `generateMissingCostLineItemLabelTranslations` w `lib/producer-project-translation-actions.ts`. Do tego czasu nowy tekst wychodzi po polsku i zgłasza go skrypt kontrolny.
- [ ] Rozważyć uogólnienie istniejącego słownika `cost_line_item_label_translation` zamiast osobnego `reference_text_translation` o tym samym kształcie (uwaga z kontroli speca), oraz użycie istniejącego tłumacza AI do backfillu zamiast ręcznego pliku tłumaczeń. Decyzja o osobnych tabelach per encja została podjęta świadomie (patrz rationale.md), ten punkt dotyczy tylko słownika.
- [ ] Po wdrożeniu `/sync` ma dopisać do `lib/db/AGENTS.md` i `lib/data/AGENTS.md` nowe tabele tłumaczeń i regułę "ikona i wykrywanie opcji negatywnej po tekście źródłowym".
- [ ] Zaktualizować komentarz w `ProjectOptionsConfigurator.tsx` ("nie tłumaczone przez next-intl"), który po tym specu przestaje być prawdziwy.
- [ ] Zdecydować osobno, czy skrypt kontrolny ma kiedyś blokować wdrożenie w CI (dziś tylko komenda na żądanie).
- [ ] Potwierdzić, że integracja Vercel z Gitem nie wdraża po pushu z pominięciem kroku `db:migrate` z workflowu CI (repo nie ma `vercel.json`).

## Rationale

Uzasadnienie, rozważone opcje i dane z bazy: patrz [rationale.md](rationale.md).
