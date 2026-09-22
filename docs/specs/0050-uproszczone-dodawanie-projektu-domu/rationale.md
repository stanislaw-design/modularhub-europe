# 0050. Rationale

## Context

Spec 0047 opisał pełny import produktu z PDF: do pięciu dokumentów, Azure Document Intelligence Layout do OCR, Azure OpenAI GPT 5 mini do ekstrakcji, Azure Service Bus i Function do przetwarzania w tle, dziesięć nowych tabel do sesji, kandydatów, dowodów i decyzji, a każde pole miało pokazywać dokument, stronę i fragment jako dowód. Zamysł był słuszny (producent zawsze zatwierdza, nic nie publikuje się automatycznie), ale zakres ekstrakcji (wszystkie pola kreatora naraz) wymusił ciężką infrastrukturę: OCR jako osobny krok, kolejkę błędów, worker z heartbeatem i lease, oraz osobny model danych do śledzenia pochodzenia każdej wartości.

W międzyczasie spec 0049 już zredukował dziewięć z siedemnastu pól technicznych domu, bo w praktyce tworzyły jeden opisowy akapit rozbity na osobne, klikalne pola. To pokazało wzorzec: producent PDF oferty jest zbyt zróżnicowany (różne układy, różne waluty, różne poziomy szczegółu), żeby opłacało się analizować go w całości. Łatwiej i taniej jest poprosić o kilka kluczowych danych wprost, a AI zostawić tylko tam, gdzie ręczne przepisywanie naprawdę boli: układ pomieszczeń z rzutu (wizualny, trudny do opisania tekstem) i cennik standardów (tabelaryczny, powtarzalny).

Migracje 0024 i 0027 (trzynaście tabel i trzy funkcje bazodanowe) są już zastosowane na żywej bazie Neon. Sprawdzone bezpośrednio przy pisaniu tego spec (poprawka po cross checku innym modelem): wejście "Uzupełnij z PDF" jest dziś odblokowane dla każdego producenta bez żadnej flagi (`AI_IMPORT_ENABLED` nie istnieje w kodzie), a na żywej bazie są realne wiersze (20 sesji, 25 dokumentów, 92 decyzje). Potwierdzone z inżynierem: to jego własne dane testowe, nie dane żadnego prawdziwego producenta, więc pełne zastąpienie zostaje niskim ryzykiem, ale migracja usuwająca jest mimo to budowana z pełną ostrożnością (zapytanie liczące wiersze, weryfikacja na gałęzi Neon) na wypadek pomyłki.

## Options considered

### Option 1: Naprawa w miejscu, zawężenie pól istniejącego pipeline'u

Zostawić Azure Document Intelligence, Service Bus i worker, tylko ograniczyć `HOUSE_AI_FIELD_CATALOG` do węższego zestawu pól (na przykład tylko układ pomieszczeń i standardy) w istniejącym modelu sesji i kandydatów.

**Pros**:
- Najmniej pracy przy usuwaniu, część kodu (schemat Zod, normalizacja) da się przenieść bez przepisywania.

**Cons**:
- Cała infrastruktura (OCR, kolejka, worker, dziesięć tabel) zostaje, mimo że nowy zakres (kilka obrazów rzutu, jeden cennik naraz) jej nie potrzebuje. Koszt operacyjny i złożoność nie maleją proporcjonalnie do zwężonego zakresu.

### Option 2: Strangler, nowe wąskie zdolności obok starego pipeline'u, stopniowe wygaszanie

Zbudować nowe, wąskie akcje AI równolegle do istniejącego przepływu importu, przekierować cały ruch na nowe, dopiero potem usunąć stary kod i tabele.

**Pros**:
- Bezpieczny wzorzec migracji dla systemu z prawdziwym ruchem produkcyjnym.

**Cons**:
- Nie ma żadnego ruchu produkcyjnego do migrowania: flaga `AI_IMPORT_ENABLED` nigdy nie była włączona. Utrzymywanie dwóch równoległych ścieżek AI w tym samym kreatorze przez okres przejściowy dodaje złożoność bez odpowiadającej jej korzyści.

### Option 3: Zastąpić bezpośrednio (wybrana)

Usunąć całą infrastrukturę spec 0047 i zbudować dwa wąskie, synchroniczne wywołania Azure OpenAI, reużywające już istniejącego, ogólnego klienta (`lib/ai/openai.ts`, `lib/ai/azure-config.ts`), tego samego, którego dziś używa `lib/ai/product-translation.ts`.

**Pros**:
- Najmniejszy możliwy pipeline: brak OCR jako osobnego kroku (model z wejściem wizualnym czyta obraz albo PDF wprost), brak kolejki, brak workera, brak nowych tabel.
- Spójne z resztą stosu: `product-translation.ts` już dziś robi dokładnie to, jedno wywołanie Azure OpenAI, synchronicznie z akcji serwerowej.
- Najniższy koszt operacyjny i najmniej ruchomych części do monitorowania.

**Cons**:
- Traci pełny ślad dowodowy (dokument, strona, fragment) i możliwość analizy całego dokumentu w jednym przebiegu; producent nie może już wgrać jednego PDF oferty i dostać kompletnie wypełnionego projektu.

## Rationale

Opcja 3 wygrywa, bo jedyny powód, dla którego spec 0047 potrzebował ciężkiej infrastruktury (Document Intelligence, Service Bus, worker, dziesięć tabel), był zakres: próba wypełnienia wszystkich pól kreatora z dowolnego, nieprzewidywalnego PDF. Gdy zakres AI kurczy się do dwóch wąskich, wizualnie naturalnych zadań (przeczytaj obraz rzutu, przeczytaj cennik), ta infrastruktura przestaje być proporcjonalna: to samo zadanie da się zrealizować jednym wywołaniem modelu z wejściem wizualnym, tym samym klientem, który już działa dla tłumaczeń produktu.

Opcja 1 (naprawa w miejscu) była kuszącym kompromisem, ale zostawiłaby drogą, trudną w utrzymaniu infrastrukturę (Azure Function, Service Bus, worker z lease i heartbeatem) tylko po to, żeby obsłużyć zadanie, które mieści się w jednym synchronicznym wywołaniu. Opcja 2 (strangler) jest właściwym wzorcem dla migracji z prawdziwym ruchem produkcyjnym do przeniesienia, ale tu takiego ruchu nie ma: cała dotychczasowa aktywność to dane testowe inżyniera, więc nie ma nic do stopniowego wygaszania, tylko nieużywany kod do usunięcia.

**Dwie dalsze uproszczenia, rozważone po cross checku, świadomie odrzucone:**
- **Zostawić trzynaście martwych tabel bez migracji DROP.** Nie kosztują nic operacyjnie (brak odczytów, brak zapisów). Odrzucone: kod, który je tworzył i obsługiwał, i tak znika w tym spec, a martwy schemat bez martwego kodu przy nim jest myloną wskazówką dla każdego, kto później czyta `schema.ts` i zastanawia się, czy te tabele są używane. Skoro usuwamy kod, usuwamy też jego ślad w bazie, w tym samym pull requeście co Build plan zadanie 2, tylko jako osobny, późniejszy krok (zadanie 11) po pełnym wdrożeniu.
- **Wyjąć skonsolidowany etap tłumaczeń (AC-28 do AC-34) z tego spec, zostawić dzisiejsze zakładki i osobny backfill.** To największy pojedynczy element budowy w tym spec i jedyny, który dotyka kodu współdzielonego z inną, wcześniejszą decyzją (spec 0028). Odrzucone mimo to: usunięcie zakładek językowych z kroku podstawowego wynika wprost z życzenia inżyniera (AC-2), a te same komponenty kroku są współdzielone między nowym kreatorem i edycją (AC-31), więc nie da się zbudować jednego bez dotknięcia drugiego. Zamiast wyjmować ten element z zakresu, ten spec rozszerza go świadomie na oba kreatory naraz, żeby nie budować go dwa razy w dwóch osobnych pracach.

## References

Brak (poziom "bez sekcji References", decyzja podjęta w trakcie rozmowy projektowej: to rozszerzenie na już wybranym stosie, nie nowa decyzja technologiczna wymagająca porównania rynku).
