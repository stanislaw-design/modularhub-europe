# 0059. Płatne opcje konfiguratora produktów katalogowych

**Date**: 2026-09-30
**Status**: In Progress

## Summary

Ten spec dodaje płatne opcje dodatkowe (na przykład poziom ocieplenia, kominek, klimatyzacja) do produktów katalogowych, czyli produktów sprzedawanych bez negocjacji z producentem, dziś tylko `outdoor-tv`, wkrótce też kontenery Dampola. Klient widzi na stronie produktu grupy opcji, zaznacza je, i cena aktualizuje się na żywo, tak jak u producenta Dampol, którego stronę wzięliśmy za wzór. Zakres na start: jeden prawdziwy model (Dampol Model 3) w pełni działający od bazy danych po ekran klienta, bez nowego panelu producenta (dane wpisuje się dziś ręcznie przez Neon MCP, tak jak inne dane producentów w tym etapie).

## Requirements

**User stories**:
- Jako klient przeglądający produkt katalogowy z opcjami, chcę zobaczyć dostępne dopłaty i ich ceny, żeby wiedzieć, ile będzie kosztować dokładnie taka konfiguracja, jakiej chcę.
- Jako klient, chcę żeby zaznaczenie/odznaczenie opcji od razu zaktualizowało widoczną cenę, bez przechodzenia przez formularz zapytania.
- Jako osoba wpisująca dane producenta (Claude, przez Neon MCP), chcę móc raz zdefiniować grupę opcji producenta i przypisać ją do wielu jego produktów, zamiast przepisywać tę samą listę osobno dla każdego.

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: Produkt katalogowy z co najmniej jedną przypisaną grupą opcji pokazuje tę grupę (i jej opcje z ceną albo „od X") na stronie `/project/[slug]`, obok istniejącego wyboru wariantu rozmiaru.
- **AC-2**: Grupa typu single (na przykład poziom ocieplenia) pokazuje opcje jako wzajemnie wykluczające się (dokładnie jedna zaznaczona): opcja domyślna (`is_default`) zaznaczona przy pierwszym wejściu, a gdy grupa z błędu danych nie ma żadnej `is_default` opcji, pierwsza wg `sort_order` (ten sam fallback co `getDefaultProjectVariant`). Grupa typu multi (na przykład kominek, klimatyzacja) pokazuje niezależne przełączniki, żadna nie jest domyślnie zaznaczona.
- **AC-3**: Zaznaczenie/odznaczenie opcji zmienia adres URL strony przez jeden parametr `opcje` (lista id opcji rozdzielona przecinkami, ten sam pojedynczy-parametr wzorzec co reszta strony produktu) i strona pokazuje na nowo policzoną łączną cenę: cena bazowa wariantu plus suma cen aktualnie zaznaczonych opcji. Link do konkretnej konfiguracji da się skopiować i wysłać.
- **AC-4**: Jeśli wariant albo którakolwiek zaznaczona opcja ma `price_on_request = true`, łączna cena pokazuje się jako „od X zł" / „cena na zapytanie" (ten sam wzorzec co dziś `getProjectPriceDisplay`), nigdy jako myląca dokładna suma.
- **AC-5**: Produkt bez żadnej przypisanej grupy opcji renderuje się dokładnie tak jak dziś, bez widocznej zmiany, bez regresji.
- **AC-6**: Nieznane, nieaktualne albo zduplikowane (dwa id z tej samej grupy single) id opcji w adresie URL jest łagodnie ignorowane (dla duplikatu z grupy single: pierwsze wygrywa, reszta z tej grupy jest pomijana), nigdy nie powoduje błędu ani zepsutej ceny, zgodnie z istniejącą konwencją projektu („nieprawidłowy kraj/rozmiar jest ignorowany, nie jest błędem").
- **AC-7**: Grupy opcji, opcje i ich przypisanie do produktu wchodzą do bazy wyłącznie ręcznie, przez Neon MCP, zweryfikowane end to end na dokładnie jednym prawdziwym produkcie (Dampol Model 3). Ten spec nie buduje UI producenta do zarządzania opcjami.
- **AC-8**: Zmiana schematu (trzy nowe tabele) jest zweryfikowana na tymczasowej gałęzi Neon przed zastosowaniem na realnej bazie, zgodnie z istniejącą konwencją migracji.
- **AC-9**: Na `/project/[slug]` dla produktu katalogowego z więcej niż jednym wariantem, link „zapytanie” przenosi dokładnie wybrany wariant (po `variant.id`), nie sam `completionStandard` — dziś ten link koduje `&wariant=${completionStandard}`, co dla katalogowych produktów z wieloma wariantami (wszystkie dzielą `completionStandard = 'katalogowy'`) nie odróżnia, który wariant klient realnie skonfigurował. To dotyka też etykiety ceny i `offers.price` w JSON-LD tej strony. Odkryte w cross checku tego spec'a: dziś żaden katalogowy produkt faktycznie nie renderuje się na tej trasie (`outdoor-tv` ma własną, dedykowaną stronę), więc to pierwszy raz, kiedy ta ścieżka jest naprawdę wykonywana z więcej niż jednym wariantem.

## Decision

**Chosen option**: Option 2: Współdzielony katalog opcji per producent, przypisywany do produktów

Trzy nowe tabele: `product_option_group` (własność producenta), `product_option` (należy do grupy), `product_option_group_assignment` (łączy grupę z produktem, wiele do wielu).

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

Pełne uzasadnienie wyboru (opcje odrzucone, kontekst): [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Tabela | Klucz główny | Klucze obce | Kluczowe pola |
|---|---|---|---|
| `product_option_group` | `id` uuid | `producer_id` → `producer(id)` | `name` text NOT NULL, `selection_type` enum (`single`\|`multi`) NOT NULL, `sort_order` integer NULL, `created_at`/`updated_at` NOT NULL, `deleted_at` NULL |
| `product_option` | `id` uuid | `group_id` → `product_option_group(id)` | `label` text NOT NULL, `price_cents` integer NULL, `price_on_request` boolean NOT NULL default false, `is_default` boolean NOT NULL default false, `sort_order` integer NULL, `created_at`/`updated_at` NOT NULL, `deleted_at` NULL |
| `product_option_group_assignment` | `id` uuid | `product_id` → `product(id)`, `group_id` → `product_option_group(id)` | `created_at` NOT NULL; unique `(product_id, group_id)` |

Relacje: producent 1:N grup; grupa 1:N opcji; produkt N:M grupa (przez tabelę przypisania). Ceny opcji nie zależą od wariantu rozmiaru (potwierdzone: u Dampola lista dopłat nie zmieniała się przy zmianie wymiaru), więc `product_option` nie ma odniesienia do `product_variant`.

**API surface**:

Bez nowych endpointów HTTP, to serwerowe pobranie danych do renderowania strony (ten sam wzorzec co reszta `lib/db/queries.ts`), plus nawigacja przez `<Link>` do zmiany zaznaczenia (ten sam wzorzec co `ProjectVariantPicker`).

| Funkcja | Wejście | Wyjście | Dostęp | Błędy |
|---|---|---|---|---|
| `getProductOptionGroups(productId)` w `lib/db/queries.ts` | `productId: string` | lista grup z ich opcjami, posortowana wg `sort_order`, bez usuniętych wierszy | publiczne (bez autoryzacji, jak reszta danych produktu) | pusta lista gdy produkt nie ma przypisanych grup (nie błąd) |

**Key invariants**:
- Najwyżej jedna opcja `is_default = true` na grupę (partial unique index na `product_option.group_id` gdzie `is_default AND deleted_at IS NULL`, ten sam wzorzec co `product_variant_one_default_per_product`).
- `price_cents` i `price_on_request` są w pełni rozłączne: `CHECK ((price_on_request AND price_cents IS NULL) OR (NOT price_on_request AND price_cents IS NOT NULL))`. To ściślej niż jednokierunkowy `product_variant_price_on_request`, świadomie: wariant ma stan `draft`, w którym cena bywa tymczasowo nieustawiona, a opcja nie ma żadnego cyklu życia, więc `price_cents IS NULL` przy `price_on_request = false` nie powinno się nigdy zdarzyć (dawniej: cicha, niejednoznaczna „zapomniana cena").
- Para `(product_id, group_id)` unikalna w tabeli przypisania, żeby nie dało się przypisać tej samej grupy do produktu dwa razy.
- Grupę wolno przypisać tylko do produktu tego samego producenta (`product_option_group.producer_id = product.producer_id`). To **nie jest dziś wymuszone przez bazę ani przez żaden kod** (zapis jest ręczny, przez Neon MCP, bez ścieżki aplikacji, która mogłaby to sprawdzić) — trzeba to ręcznie zweryfikować przy każdym zapisie, patrz Follow-up.

**Security model**:
Wyłącznie odczyt publiczny, bez logowania, dokładnie tak jak dzisiejsze ceny produktu i wariantu. Brak nowej ścieżki zapisu w aplikacji: dane wchodzą do bazy ręcznie przez Neon MCP (decyzja epiki Produkcja z 2026-09-02), więc nie ma tu nowego modelu autoryzacji do zaprojektowania. To świadoma, udokumentowana luka na ten etap, nie przeoczenie, patrz Follow-up.

**Configuration required**:
Brak nowych zmiennych środowiskowych ani poświadczeń.

**Critical test scenarios**:
- Happy path: produkt katalogowy z jedną grupą single i jedną grupą multi, klient zmienia zaznaczenie, cena na stronie aktualizuje się o sumę wariant + zaznaczone opcje, weryfikuje **AC-1**, **AC-2**, **AC-3**.
- Failure case: adres URL zawiera id opcji, która została usunięta (albo nigdy nie istniała) — strona renderuje się bez błędu, cena liczy się tylko z realnie istniejących, zaznaczonych opcji, weryfikuje **AC-6**.
- Brak regresji: produkt bez żadnej przypisanej grupy (dzisiejszy stan prawie całego katalogu) renderuje się identycznie jak przed tą zmianą, weryfikuje **AC-5**.
- Dostęp: brak ścieżki chronionej w tym spec'u, dane są publiczne tak jak dziś; nie ma tu nic do odmówienia dostępu, weryfikuje **AC-1** (dane widoczne dla każdego odwiedzającego, bez logowania).

## Build plan

1. Migracja: nowe tabele `product_option_group`, `product_option`, `product_option_group_assignment` z opisanymi kluczami, obiema połówkami `CHECK` na `price_cents`/`price_on_request`, partial unique index; zweryfikowana na tymczasowej gałęzi Neon, zastosowana na realnej bazie, satisfies **AC-8**.
2. `lib/db/queries.ts`: `getProductOptionGroups(productId)`, satisfies **AC-1**.
3. Czysta funkcja liczenia ceny (kolokowana z `getProjectPriceDisplay` w `lib/data/project-variants.ts`): wariant + pobrane grupy + zestaw zaznaczonych id z URL → ten sam kształt `ProjectPriceDisplay` co dziś (`priceOnRequest` albo liczba). Dla każdej grupy single: użyj jej `is_default` opcji, a w razie braku (błąd danych) pierwszej wg `sort_order`; jeśli URL niesie więcej niż jedno id z tej samej grupy single, użyj pierwszego, resztę z tej grupy zignoruj, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-6**.
4. Tolerancyjny parser jednego parametru `opcje` (lista id rozdzielona przecinkami) na stronie `/project/[slug]`, nieznane id po cichu pomijane, ten sam wzorzec co dzisiejsze parsowanie `country`/rozmiaru, satisfies **AC-3**, **AC-6**.
5. Napraw link „zapytanie”, etykietę ceny i `offers.price` w JSON-LD na `/project/[slug]` dla katalogowych produktów z więcej niż jednym wariantem: dziś kodują `completionStandard`, który nie odróżnia wariantów tego samego produktu katalogowego (`&wariant=${completionStandard}` zamiast `variant.id`) — nigdy dotąd nie wykonane w praktyce, bo żaden katalogowy produkt jeszcze nie renderował się na tej trasie z więcej niż jednym wariantem. Musi być zrobione przed krokiem 8 (prawdziwe dane), satisfies **AC-9**.
6. Nowy komponent `components/klient/ProjectOptionsConfigurator.tsx` (komponent serwerowy, linki zamiast stanu klienckiego, ten sam wzorzec co `ProjectVariantPicker`, wizualnie na bazie istniejących `Radio`/`Checkbox`), renderowany obok `ProjectVariantPicker`; zwraca `null` gdy produkt nie ma przypisanych grup, satisfies **AC-1**, **AC-2**, **AC-5**.
7. Wpięcie łącznej ceny (baza + opcje) w istniejący blok ceny na stronie produktu, satisfies **AC-3**, **AC-4**.
8. Ręczny zasiew przez Neon MCP, na tymczasowej gałęzi Neon przed produkcją: minimalny bazowy produkt Dampol Model 3 (producent, nazwa, slug, `family = kontenery-modulowe`, cztery warianty rozmiaru 27500 / 30500 / 35000 / 39999 zł, przeliczone PLN→EUR po bieżącym kursie NBP, ten sam wzorzec co import Steel House — to jest jednorazowy, minimalny wycinek pełnego importu Dampola, nie duplikat przyszłego pełnego importu ~25 modeli), plus jedna grupa single (poziom ocieplenia) i jedna grupa multi (dwa do trzech niezależnych dodatków) na realnych danych ze strony Dampola, ceny opcji przeliczone PLN→EUR tym samym kursem co warianty. Opcje „od X zł" pominięte na ten test (patrz Follow-up). Dowodzi całej ścieżki end to end na jednym prawdziwym produkcie, satisfies **AC-1** do **AC-9**. Uwaga: to dowodzi mechanizmu przypisania na jednym produkcie, nie realnego reużycia jednej grupy między wieloma produktami — patrz Consequences.
9. Testy: jednostkowe dla nowej funkcji liczenia ceny (domyślny wybór, fallback bez `is_default`, propagacja `price_on_request`, tolerancja na nieznane/zduplikowane id) i dla `getProductOptionGroups`; test komponentu `ProjectOptionsConfigurator` (brak grup → nic się nie renderuje, zachowanie single vs multi); test na link „zapytanie”/JSON-LD dla katalogowego produktu z wieloma wariantami, satisfies **AC-1** do **AC-9**.

## Consequences

**Positive**:
- Ogólny mechanizm gotowy pod dowolnego przyszłego producenta katalogowego, bez kolejnej migracji.
- Test na jednym prawdziwym modelu (Tracer Bullet) dowodzi całej ścieżki, zanim zainwestujemy czas w pozostałe ~24 modele Dampola.
- Reużywa istniejące wzorce (`price_on_request`, `is_default`, `deletedAt`, linki zamiast stanu klienckiego) zamiast wprowadzać nowy sposób robienia rzeczy.

**Negative / tradeoffs**:
- Ręczne wpisywanie opcji przez Neon MCP nie skaluje się: każdy kolejny produkt Dampola (i każdy przyszły producent katalogowy) wymaga tej samej ręcznej pracy, dopóki nie powstanie UI producenta (świadomie odłożone).
- Ogólność (wiele do wielu, per producent) jest dziś uzasadniona jednym realnym producentem; jeśli Dampol okaże się nietypowy, może wymagać korekty zanim drugi producent katalogowy się pojawi.
- Zmiana dotyka istniejącego, już wdrożonego bloku ceny na `/project/[slug]` — wymaga ostrożności, żeby nie zepsuć wyświetlania ceny dla produktów bez opcji (pokryte przez AC-5 i test regresji).
- **Tracer bullet na jednym produkcie nie dowodzi realnego reużycia grupy** (główny powód wyboru Option 2): jedna grupa przypisana do jednego produktu wygląda identycznie, niezależnie czy mechanizm N:M działa poprawnie. Prawdziwe potwierdzenie przyjdzie dopiero przy imporcie drugiego modelu Dampola, który reużyje tę samą grupę.
- **Cena startowa karty/wyników i cena na stronie produktu mogą się różnić**, gdy domyślna opcja grupy single ma niezerową cenę (`product.priceMinCents` pochodzi tylko z wariantu, nigdy z opcji). To świadomie zaakceptowane, nie błąd: to dokładnie ten sam wzorzec co u Dampola samego (karta pokazuje „od 27 500 zł", konfigurator od razu otwiera się z wyższą, doliczoną ceną) — „od" zawsze znaczyło najtańszy możliwy wariant, nie tę konkretną, domyślną konfigurację.

**Neutral**:
- Nowa migracja, nowy plik komponentu, rozszerzenie istniejącego pliku pomocniczego cen — żadnej nowej biblioteki ani zależności.

## Follow-up

- [ ] Wymóg „grupa tylko dla produktów tego samego producenta" nie jest dziś wymuszony przez bazę (patrz Feature design > Key invariants) — sprawdzać ręcznie przy każdym zapisie przez Neon MCP; jeśli kiedyś powstanie ścieżka zapisu w aplikacji (UI producenta), rozważyć złożony FK (`producer_id` też na `product_option_group_assignment`, referencja do `product(id, producer_id)`).
- [ ] Import pozostałych ~24 modeli Dampola „na zamówienie" i ich pełnych katalogów opcji, reużywając ten mechanizm — to też pierwsza realna weryfikacja, że jedna grupa reużyta na wielu produktach faktycznie działa (świadomie odłożone, kolejny krok po tym spec'u).
- [ ] Zdecydować, czy i jak zaznaczone opcje mają trafiać do zapytania/oferty (świadomie poza zakresem tego spec'a, dziś sama strona produktu pokazuje tylko cenę).
- [ ] Zdecydować, czy i kiedy zbudować UI producenta do zarządzania grupami/opcjami zamiast ręcznego Neon MCP.
- [ ] Opcje z ceną „od X zł" (nie stałą) zostały pominięte w zasiewie testowym Model 3 na życzenie inżyniera; do decyzji przy pełnym imporcie.
- [ ] `components/producent/AGENTS.md` jest nieaktualny: opisuje dawny kreator na `localStorage`, ale katalog trzyma dziś też realne, podłączone do Neona komponenty (`ProductEditWizard.tsx`, `ProducerProductList.tsx`, spec 0032) — warto przy najbliższym `/sync`.
- [ ] Brak dziś wiersza scope dla tej funkcji w `docs/scope/produkcja.md`; do dopisania.
