# 0069. Układ wnętrz i rzuty przypisane do opcji (wersje układu)

**Date**: 2026-10-09
**Status**: In Progress

## Summary

Niektóre domy mają kilka wersji układu wnętrz (na przykład Bingo od Logbar: podstawowa i wersje 1, 2, 3). Dziś klient wybiera wersję jako opcję z dopłatą, ale strona dalej pokazuje jeden rzut, jedną listę pomieszczeń i jeden metraż. Ta decyzja pozwala przypiąć do opcji własne rzuty, pomieszczenia, metraż i opis, więc wybór wersji zmienia je na stronie produktu. Dane trafiają do nowej, osobnej tabeli, a rzut dostaje dwie niezależne cechy: wersję układu i piętro.

## Requirements

**User stories**:
- Jako klient wybierający wersję układu, chcę zobaczyć jej rzut, pomieszczenia i metraż, żeby ocenić to, za co płacę.
- Jako klient, chcę wiedzieć, czym wersja różni się od podstawowej, żeby nie porównywać rzutów na oko.
- Jako producent i administrator importu, chcę przypiąć rzuty i dane układu do opcji bez zmieniania reszty katalogu.
- Jako klient na stronie po angielsku, niemiecku lub niderlandzku, chcę widzieć opis i nazwy pomieszczeń wersji w swoim języku.

**Acceptance criteria**:
- **AC-1**: Opcja z grupy typu single może mieć dane układu. Gdy klient wybierze taką opcję (`?opcje=`), strona `/project/[slug]` pokazuje dla niej rzuty, listę pomieszczeń, metraż użytkowy, liczbę pokoi, sypialni i łazienek oraz opis wersji. Bez parametru działa opcja domyślna grupy.
- **AC-2**: Zakładka Rzut pokazuje tylko rzuty wybranej wersji układu, pasujące do wybranego wariantu standardu (bez przypisanego wariantu albo równy wybranemu). Każdy rzut ma podpis złożony z nazwy wersji i piętra (Parter, Piętro, Poddasze). Kolejność: parter, piętro, poddasze, potem `sort_order`.
- **AC-3**: Gdy wybrana opcja nie ma własnych rzutów, albo produkt w ogóle nie ma opcji niosących układ, zakładka Rzut pokazuje rzuty produktu bez przypisanej opcji, tak jak dziś. Rzuty opcji nigdy nie mieszają się z zapasowymi: jeśli opcja ma choć jeden własny rzut w wybranym wariancie, pokazują się tylko jej rzuty. Produkty bez danych układu na opcjach wyglądają po wdrożeniu dokładnie tak samo jak przed nim.
- **AC-4**: Sekcja Układ domu bierze dane wybranej opcji. Pole puste w danych opcji oznacza wartość z produktu (pomieszczenia, metraż, pokoje, sypialnie, łazienki). Opis wersji pokazuje się pod nagłówkiem sekcji, tylko gdy jest niepusty.
- **AC-5**: Wersję bazową (metraż i rzut produktu, czyli rzuty bez `product_option_id`) zawsze pokazują: karty wyników, porównywarka, filtry, metadane strony, JSON-LD oraz formularz zapytania i sprawa, niezależnie od `?opcje=`. Wersję wybranej opcji pokazują tylko: podsumowanie w górnej części strony (metraż i liczba pokoi), sekcja Układ domu i zakładka Rzut.
- **AC-6**: Opis wersji i nazwy pomieszczeń mają tłumaczenia en, de i nl, dopasowane po `id` pomieszczenia. Brak tłumaczenia pokazuje polski tekst. Nazwy pięter w podpisach rzutów pochodzą z tekstów interfejsu (`messages/*.json`), nie z bazy.
- **AC-7**: `npm run check:translations` zgłasza brak tłumaczenia opisu i nazw pomieszczeń opcji układu dla opublikowanych produktów, tak jak dla innych pól (spec 0067).
- **AC-8**: Najwyżej jedna grupa typu single na produkt niesie dane układu. Dane układu można przypiąć tylko do opcji z grupy single, a opcja musi należeć do grupy przypisanej do tego samego produktu, do którego należy rzut. Naruszenie odrzuca import i każda funkcja zapisu (jedna wspólna funkcja walidująca, z testem).
- **AC-9**: Zgodność wsteczna: istniejące rzuty bez opcji i bez piętra oraz akcja `uploadFloorPlan` działają bez zmian. Rzut bez piętra dostaje podpis neutralny ("Rzut N").
- **AC-10**: Backfill Logbar Bingo A, B, C i D: cztery opcje układu mają dane układu z oferty (strony 3 do 10, patrz Build plan), każdy produkt ma osiem rzutów (po dwa na wersję) przypisanych do opcji z piętrem, dwa dotychczasowe rzuty bazowe zostają bez przypisanej opcji (to wersja bazowa produktu, opcja "Wersja podstawowa" spada na nie zgodnie z AC-3), wszystko z tłumaczeniami. `npm run check:translations` pokazuje zero braków.

## Decision

**Chosen option**: Option 1: Osobna tabela układu opcji i powiązanie rzutu z opcją.

Dane układu żyją w `product_option_layout`, rzut wskazuje wersję przez `document.product_option_id` i piętro przez `document.floor_level`, a strona wybiera je po opcji z `?opcje=`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Feature design

**Data model sketch**:

| Tabela | Klucz | Pola | Relacje i reguły |
|---|---|---|---|
| `product_option_layout` (nowa) | `option_id` uuid, PK i FK | `floor_area_m2` real, `rooms` int, `bedrooms` int, `bathrooms` int, `room_layout` jsonb (kształt jak `product.room_layout`), `description` text, `created_at`, `updated_at`. Wszystkie pola poza kluczem puste dozwolone, puste oznacza wartość z produktu | 1 do 1 z `product_option`. `floor_area_m2` dodatnie, gdy ustawione |
| `product_option_layout_translation` (nowa) | `id` uuid, unikalne (`option_id`, `locale`) | `description` text, `room_layout` jsonb (`[{id, name}]`), `created_at`, `updated_at` | N do 1 z `product_option_layout`. Brak lub puste pole oznacza polski tekst |
| `document` (zmiana) | bez zmian | + `product_option_id` uuid puste, + `floor_level` tekst puste | `product_option_id` to FK do `product_option`, dozwolone tylko dla `purpose = 'product_floor_plan'` (CHECK). `floor_level` jedna z wartości `parter`, `pietro`, `poddasze` (CHECK, tekst zamiast enuma Postgresa, bo enum jest nieodwracalny). Indeks na (`product_id`, `product_option_id`) |

**Odczyt na stronie**: nowa funkcja `getProductOptionLayouts(productId, locale)` zwraca mapę `option_id` do danych układu z rozwiązanymi tłumaczeniami, dla opcji grup przypisanych do produktu. Nowa czysta funkcja `resolveProjectLayout` (plik `lib/data/project-layout.ts`, bez importu klienta bazy) bierze produkt, grupy opcji, układy i zaznaczone id opcji, a zwraca wynikowe pomieszczenia, metraż, liczby, opis i id wybranej opcji układu. Druga czysta funkcja `selectFloorPlans` wybiera rzuty wg reguł AC-2 i AC-3. `ProjectDocument` dostaje pola `productOptionId` i `floorLevel`.

**Reguły wyboru rzutów** (`selectFloorPlans`): odfiltruj dokumenty `product_floor_plan` po wariancie (puste lub równe wybranemu). Jeśli wybrano opcję układu i ma ona własne dokumenty, zwróć tylko je. W przeciwnym razie zwróć dokumenty bez `product_option_id`. Posortuj: piętro (parter, piętro, poddasze, brak), potem `sort_order`.

**State transitions**: brak. Wybór klienta żyje w adresie URL (`?opcje=`), bez stanu komponentu (reguła AGENTS.md).

**API surface**: brak nowych punktów końcowych i akcji serwera. Odczyt dochodzi do istniejącego renderowania strony `/project/[slug]`. Akcja `uploadFloorPlan` zostaje bez zmian (kolumny puste).

**Key invariants**:
- Najwyżej jedna grupa single na produkt niesie układ (AC-8), sprawdza funkcja `assertLayoutGroupRule` używana przez import i każdy przyszły zapis.
- Opcja z danymi układu należy do grupy single, przypisanej do produktu, którego rzut ją wskazuje.
- Dokument z `product_option_id` ma `purpose = 'product_floor_plan'` (CHECK w bazie).
- Opcja usunięta miękko (`deleted_at`) jest pomijana, jakby nie niosła układu.
- `room_layout` opcji przechodzi ten sam schemat Zod co produktowy, a `id` pomieszczeń są unikalne w obrębie układu i zgodne z tłumaczeniem.
- Wersja bazowa (metraż, rzut, pomieszczenia produktu) nigdy nie zależy od `?opcje=` na listach, w porównywarce, metadanych, JSON-LD i zapytaniu (AC-5).
- Wiersz układu dotyczy opcji, a grupa opcji bywa przypisana do wielu produktów, więc grupa niosąca układ może być przypisana tylko do produktów o identycznej geometrii (walidacja w imporcie). Produkt o innej geometrii dostaje własną grupę.
- `selectFloorPlans` bierze pod uwagę tylko opcje z grup aktualnie przypisanych do produktu, więc rzut osierocony przez odpięcie grupy lub ręczny zapis jest pomijany (test).
- Klucze obce na opcję nie mają `ON DELETE` (usuwanie jest miękkie, `deleted_at`).

**Security model**: odczyt publiczny, jak reszta katalogu. Zapis tylko przez skrypty importu i ręczne zapisy (bez nowej ścieżki aplikacji, panel producenta jest poza zakresem). Własność dokumentów i produktów bez zmian. Brak danych osobowych, brak nowego zakresu zgodności.

**Configuration required**: brak nowych zmiennych środowiskowych.

**Edge cases**:
- Nieprawidłowe lub cudze id w `?opcje=`: zignorowane, działa opcja domyślna (jak dziś).
- Dwa id z tej samej grupy single: pierwsze wygrywa (istniejąca zasada konfiguratora).
- Opcja układu bez rzutów lub bez dokumentów w wybranym wariancie: zapasowe rzuty produktu (AC-3).
- Brak wiersza układu dla wybranej opcji: wartości produktu, bez błędu.
- Brak tłumaczenia dla locale: polski tekst. Brak `floor_level`: podpis "Rzut N".
- Cena na zapytanie lub opcja z ceną zero: bez wpływu na układ.
- Zakładka Rzut jest dziś ukryta poniżej szerokości `lg` (spec 0042), i tak zostaje, poza zakresem tej decyzji.

**Performance**: jedno dodatkowe zapytanie o układy dla opcji produktu, wykonane równolegle z istniejącymi w `Promise.all`. Pomijane, gdy produkt nie ma grup opcji.

**Critical test scenarios**:
- Wybór "Wersja 2" na Bingo zmienia rzuty, listę pomieszczeń, metraż (91,05 m²) i opis, verifies **AC-1**, **AC-2**, **AC-4**.
- Opcja bez własnych rzutów oraz produkt bez opcji układu pokazują zapasowe rzuty, verifies **AC-3**, **AC-9**.
- Lista wyników, porównywarka i metadane pokazują metraż bazowy mimo `?opcje=` wersji 2, verifies **AC-5**.
- Locale `en`, `de`, `nl`: opis, pomieszczenia i podpisy po tłumaczeniu, brak tłumaczenia daje polski, verifies **AC-6**, **AC-7**.
- Dwie grupy single niosące układ na jednym produkcie, oraz opcja z grupy multi z układem, są odrzucone, verifies **AC-8**.
- Rzut cudzej opcji (grupa nieprzypisana do produktu) jest odrzucony, verifies **AC-8**.
- Dokumenty sprzed zmiany (puste kolumny) renderują się jak wcześniej, verifies **AC-9**.

## Build plan

Zakładam budowę pionowymi, cienkimi plastrami (Tracer Bullet), bo AGENTS.md nie zapisuje podejścia dla tej funkcji: najpierw jedna ścieżka od bazy do ekranu, potem pozostałe powierzchnie.

1. Migracja Drizzle i `lib/db/schema.ts`: tabele `product_option_layout` i `product_option_layout_translation`, kolumny `document.product_option_id` i `document.floor_level` z ograniczeniami i indeksem. Wszystko puste, więc bezpieczne dla działającej bazy, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-9**
2. Czyste funkcje `resolveProjectLayout`, `selectFloorPlans`, `assertLayoutGroupRule` w `lib/data/project-layout.ts` wraz z testami jednostkowymi (Vitest), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-8**
3. Zapytanie `getProductOptionLayouts` i rozszerzenie `ProjectDocument` w `lib/data/projects.ts` (odczyt `productOptionId`, `floorLevel`), tłumaczenia po `id` z fallbackiem, satisfies **AC-1**, **AC-2**, **AC-6**
4. Podpięcie strony `/project/[slug]`: wynik `resolveProjectLayout` do podsumowania u góry i do `ProjectRoomLayout` (pomieszczenia, metraż, liczby, opis pod nagłówkiem), widoczność sekcji Układ domu (`hasUkladSection`) liczona z wyniku tej funkcji, a nie z `project.roomLayout`; `selectFloorPlans` wywoływane na stronie, a `ProjectGalleryTabs` dostaje gotową listę rzutów (filtr rzutów w `documentsForTab` znika) wraz z podpisami, nowe teksty w `messages/pl.json`, `en.json`, `de.json`, `nl.json` (piętra, "Rzut N"), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-9**
5. Przegląd i test każdego innego użytkownika rzutów i metrażu: `ProjectCompareTable`, `ResultCard`, `generateMetadata` i JSON-LD strony (`app/[locale]/(customer)/project/[slug]/page.tsx`), filtry wyników, formularz zapytania i sprawa. Każdy wymusza wersję bazową, osobny test na każdy, satisfies **AC-5**
6. Rozszerzenie `scripts/check-translations.ts` i `lib/translations/gaps` o opis i nazwy pomieszczeń opcji układu (łączone przez `product_option_group_assignment` z opublikowanymi produktami), z testem, satisfies **AC-7**
7. Backfill Logbar: rozszerzyć `scripts/data/logbar-catalog.ts` i `scripts/import-logbar-catalog.ts` o dane układu opcji (podstawowa i wersja 1: 82,09 m², wersja 2: 91,05 m², wersja 3: 82,86 m², pomieszczenia z tabel oferty, strony 3 do 10), osiem rzutów na produkt z `floor_level`, pozostawienie istniejących rzutów bazowych bez opcji, tłumaczenia, walidację `assertLayoutGroupRule`. Uruchomić na dev, potem `npm run check:translations`, satisfies **AC-8**, **AC-9**, **AC-10**
8. Test end to end (Playwright) wyboru wersji układu na Bingo w języku polskim i angielskim (także zmiana `?opcje=` przy otwartej zakładce Rzut), plus test regresji produktu bez danych układu (wygląd bez zmian), satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**, **AC-9**
9. Dokumentacja podręczna (`lib/db/AGENTS.md`, `components/klient/AGENTS.md`) przez `/sync`, nie ręcznie w tym zadaniu

## Migration plan

**Strategy**: addytywna zmiana w dwóch krokach, bez migracji istniejących danych (nowe tabele i puste kolumny).
**Phases**:
1. Migracja dodaje tabele i puste kolumny, kod z zadań 2 do 6 wdrożony bez żadnych danych układu (strony wyglądają jak wcześniej, AC-3 i AC-9).
2. Backfill Logbar (zadanie 7) na dev, weryfikacja, dopiero potem osobny, jawnie zlecony krok na produkcji (SQL uruchamiany ręcznie, jak przy imporcie MOHO).
**Rollback**: wycofanie kodu wystarcza, bo nowe kolumny i tabele są puste lub nieużywane. Usunięcie tabel jest osobną, odwracalną migracją.
**Risks**: ręczny zapis przez Neon MCP może naruszyć regułę jednej grupy niosącej układ (AC-8), a niezmieniony konsument rzutów mógłby wziąć rzut nie tej wersji (zadanie 5 to zamyka).

## Consequences

**Positive**:
- Klient widzi rzut, pomieszczenia i metraż tej wersji, za którą płaci.
- Jedna zasada dla wszystkich producentów z wariantami układu, bez specjalnych przypadków.
- Konfigurator i wspólna tabela opcji pozostają nietknięte, a rzuty dostają podpisy bez nowych tłumaczeń w bazie.

**Negative / tradeoffs**:
- Dwie nowe tabele do utrzymania i jedno dodatkowe zapytanie na stronie produktu.
- Reguła jednej grupy niosącej układ jest pilnowana kodem, a nie bazą, więc ręczny zapis przez Neon MCP może ją naruszyć.
- Lista wyników, filtry i porównywarka pokazują metraż bazowy, więc wersja 2 (większa) nie ma tam swojego metrażu.
- Panel producenta nie pozwala jeszcze przypisywać rzutów do opcji, zapis zostaje ręczny lub przez import.

**Neutral**:
- Wymaga migracji (dodanie pustych kolumn i tabel), bez zmiany istniejących danych.
- `document` zyskuje dwie kolumny używane tylko przez rzuty.

## Follow-up

- [ ] Ekran w panelu producenta do przypisywania rzutów i danych układu do opcji (dziś import i ręczny zapis)
- [ ] Zakładka Rzut jest ukryta poniżej szerokości `lg`, wymaga osobnej decyzji dla telefonów
- [ ] Rozważyć zakres metrażu "od, do" na kartach wyników i filtrach, jeśli wersje układu zaczną się mocno różnić
- [ ] Przypisać wersję układu w panelu administracyjnym zdjęć i rzutów produktu (`app/[locale]/internal/products`), jeśli ma być edytowalna ręcznie
- [ ] Dodać tę funkcję do `docs/scope/produkcja.md` jako nową pozycję (obecnie brak powiązanego wiersza)
