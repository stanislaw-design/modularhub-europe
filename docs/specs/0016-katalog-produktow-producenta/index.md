# 0016. Katalog produktów producenta: lista, dodawanie, edycja, usuwanie

**Date**: 2026-08-27
**Status**: In Progress

## Summary

Producent dziś może dodać tylko jeden produkt na raz: kreator nadpisuje poprzedni szkic i po zapisaniu nic nie zostaje widoczne. Ta specyfikacja dodaje prawdziwy katalog: listę wszystkich dodanych produktów, dodawanie kolejnych bez utraty poprzednich, edycję i usuwanie. Wszystko na danych trzymanych w przeglądarce producenta (bez logowania, bez bazy, bez prawdziwych płatności), zgodnie z dzisiejszym etapem Facade. Jako dodatkowy efekt, dodane produkty pokazują się jako podgląd na liście wyników klienta w tej samej przeglądarce, żeby dało się pokazać obie ścieżki naraz.

## Context

Pełny opis problemu, ograniczeń (brak backendu, dane tylko w przeglądarce) i dwóch twardych warunków brzegowych odkrytych podczas projektowania: patrz [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako producent, chcę dodać więcej niż jeden produkt, żeby mój katalog odzwierciedlał całą moją ofertę, nie tylko pierwszy dodany dom.
- Jako producent, chcę zobaczyć listę wszystkiego, co dodałem, żeby wiedzieć, co już mam w katalogu.
- Jako producent, chcę poprawić dane już dodanego produktu, jeśli się pomyliłem albo coś się zmieniło.
- Jako producent, chcę usunąć produkt, którego już nie oferuję.
- Jako osoba pokazująca demo, chcę zobaczyć dodany produkt też po stronie klienta, żeby zademonstrować obie ścieżki na raz w jednej przeglądarce.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Wejście na `/pl/producent/produkty?nip=<nip>` z prawidłowym formatem NIP pokazuje najpierw krótki stan ładowania (dane produktów żyją w przeglądarce, więc nie są znane od razu przy pierwszym renderze), a po odczytaniu `localStorage`: listę wszystkich zapisanych produktów tego producenta, każdy z nazwą, metrażem, liczbą sypialni, krajem produkcji, datą dodania i akcjami „Edytuj”/„Usuń”. Nieprawidłowy format NIP przekierowuje od razu (po stronie serwera); prawidłowy format NIP bez zapisanych danych rejestracji dla tego NIP przekierowuje do `/pl/producent` dopiero po odczytaniu `localStorage`, nigdy pokazując stan pusty najpierw (patrz Key invariants).
- **AC-2**: Pusta lista (producent zarejestrowany, ale bez żadnego zapisanego produktu) pokazuje stan pusty z przyciskiem „Dodaj produkt”, nigdy błąd, i nigdy zanim stan ładowania z AC-1 się zakończy.
- **AC-3**: Przycisk „Dodaj produkt” prowadzi do `/pl/producent/projekt` z pełnym kompletem parametrów (`nip`, `countries`, `technology`) odtworzonym z zapisanych danych rejestracji. Kroki 1 do 6 kreatora i jego wejściowy kontrakt (AC-1 spec [0008](../0008-pierwszy-projekt/index.md)) zostają dokładnie takie, jak opisuje spec 0008, bez zmian; ta specyfikacja dokłada tylko krok siódmy (AC-4) i to, co dzieje się po zapisaniu (AC-5).
- **AC-4**: Kreator na `/pl/producent/projekt` ma nowy, siódmy krok „Cena i sprzedaż” (po kroku „Pliki”, przed „Podsumowanie”): cena domu w standardzie bazowym (min i max, EUR), standard wykończenia, termin produkcji (tygodnie, min i max), czas montażu na miejscu (dni, min i max), gwarancja konstrukcyjna (lata), kategoria produktu. Wszystkie pola wymagane, ten sam wzorzec walidacji per krok co pozostałe kroki (spec 0008).
- **AC-5**: Kliknięcie „Zapisz projekt” na kroku Podsumowanie (obejmującym teraz siedem kroków) próbuje zapisać nowy wpis w liście produktów tego producenta (pełny zestaw pól, patrz Feature design). Gdy zapis się uda: czyści szkic kreatora i przechodzi do `/pl/producent/gotowosc-eksportowa?nazwa=<nazwa>&nip=<nip>&countries=<countries>&technology=<technology>`, dokładnie jak dziś opisuje AC-9 spec 0008, tylko z trzema dodanymi parametrami. Gdy zapis się nie uda (patrz Key invariants, np. przekroczony limit `localStorage`): kreator zostaje na kroku Podsumowanie, pokazuje czytelny komunikat błędu, szkic NIE jest czyszczony, i nawigacja NIE następuje (w przeciwieństwie do zapisu każdego pojedynczego pola w toku, który zostaje fail soft, patrz AC-13).
- **AC-6**: `/pl/producent/gotowosc-eksportowa` pokazuje link „Zobacz swoje produkty” do `/pl/producent/produkty?nip=<nip>` wtedy i tylko wtedy, gdy parametr `nip` jest obecny w adresie. Brak `nip` zachowuje dzisiejsze zachowanie (spec 0008, AC-10) bez zmian.
- **AC-7**: Kliknięcie „Edytuj” na pozycji listy prowadzi do `/pl/producent/produkty/<id>/edytuj?nip=<nip>`, osobnego ekranu z tym samym zestawem siedmiu kroków, wypełnionych danymi wybranego produktu. Nieistniejące albo usunięte `id` przekierowuje do `/pl/producent/produkty?nip=<nip>`.
- **AC-8**: Zmiany w edytowanym produkcie zapisują się po każdej zmianie pola w osobnym, tymczasowym miejscu, niezależnym od ewentualnego szkicu „nowy produkt w toku” (patrz Key invariants). Odświeżenie strony w połowie edycji wznawia ją od ostatniego kroku, ten sam wzorzec co dzisiejszy kreator (spec 0008, AC-8).
- **AC-9**: Kliknięcie „Zapisz zmiany” na kroku Podsumowania w edycji próbuje zaktualizować istniejący wpis (ten sam `id`, nowa data aktualizacji). Udany zapis: czyści tymczasowe miejsce edycji i przechodzi do `/pl/producent/produkty?nip=<nip>` (bez przechodzenia przez zaślepkę gotowości eksportowej). Nieudany zapis: te same zasady co w AC-5, komunikat błędu, bez nawigacji, bez czyszczenia.
- **AC-10**: Kliknięcie „Usuń” na pozycji listy otwiera modal potwierdzenia (Headless UI `Dialog`) z nazwą produktu. „Usuń” w modalu trwale usuwa wpis, czyści też jego ewentualny klucz tymczasowej edycji (patrz Key invariants), i odświeża listę; „Anuluj”, klawisz Esc, albo klik poza modalem nie zmienia niczego.
- **AC-11**: `/pl/klient/wyniki` dokleja po stronie przeglądarki (po zamontowaniu, bez przeładowania strony) wszystkie zapisane produkty znalezione we wszystkich zapisach producentów w tej przeglądarce, przefiltrowane tymi samymi regułami `country`/`sizeMin`/`sizeMax` co lista serwerowa (kraj dostawy zarejestrowany przez producenta liczy się jako dopuszczalny, patrz Key invariants). Pokazane jako karty z etykietą „Twój dodany produkt (podgląd)”, bez możliwości zaznaczenia checkboxem. Brak lokalnie dodanych produktów (typowy przypadek, inna przeglądarka albo żaden produkt jeszcze nie dodany) nie zmienia dzisiejszego wyglądu strony.
- **AC-12**: Pusty wynik na `/pl/klient/wyniki` (komponent `EmptyResults`) pokazuje się wtedy i tylko wtedy, gdy połączona lista (serwerowa plus lokalna) jest pusta po zamontowaniu. Bez lokalnych produktów zachowanie identyczne jak dziś opisuje spec [0004](../0004-wyniki-z-filtrem-prawnym/index.md).
- **AC-13**: Każdy zapis w `localStorage` wprowadzony tą specyfikacją, POZA finalnym zapisem „Zapisz projekt”/„Zapisz zmiany” (patrz AC-5, AC-9), jest opakowany w bezpieczną próbę (`try`/`catch`) i fail soft: zapis po każdej zmianie pola w toku, dane rejestracji, odczyt do listy/podglądu klienta. Uszkodzony albo nieczytelny zapis jest po cichu pomijany zamiast pokazywać błąd. Finalny zapis produktu NIE jest fail soft (patrz AC-5, AC-9): jego niepowodzenie musi być widoczne dla producenta, nigdy ciche.
- **AC-14**: Nowy krok kreatora, lista produktów, ekran edycji i modal usuwania spełniają WCAG 2.2 AA: jeden prawdziwy H1 na stronę, logiczna kolejność fokusa, widoczny fokus na każdym elemencie interaktywnym, modal z poprawnym focus trap i zamknięciem na Esc (domyślne zachowanie Headless UI `Dialog`). Lokalnie doklejone karty na `/wyniki` (AC-11) dostają `aria-live="polite"` ogłoszenie liczby dodanych pozycji po zamontowaniu, żeby użytkownik czytnika ekranu wiedział, że lista się zmieniła bez przeładowania strony.

## Options considered

Patrz [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 1, rozszerzenie w przeglądarce (localStorage) z lokalnym, tylko podglądowym doklejeniem do wyników klienta.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

- `ProjectDraft` w `lib/data/types.ts` (istniejący, rozszerzony o dziewięć nowych pól z kroku „Cena i sprzedaż”): dodaje `housePriceMinEur: number | null`, `housePriceMaxEur: number | null`, `completionStandard: CompletionStandard | null`, `productionLeadTimeWeeksMin: number | null`, `productionLeadTimeWeeksMax: number | null`, `onSiteAssemblyDaysMin: number | null`, `onSiteAssemblyDaysMax: number | null`, `structuralWarrantyYears: number | null`, `category: ProjectCategory | null`. Wszystkie pozostałe pola bez zmian.
- Nowy `SavedProduct` w `lib/data/types.ts`: NIE `ProjectDraft & {...}` wprost (te pola tam są `| null` dla obsługi formularza w toku). `SavedProduct` powtarza te same pola z ich właściwymi, nie nullowalnymi typami (`string`, `number`, `CountryCode`, `CompletionStandard`, `ProjectCategory`, listy plików), plus `id: string`, `createdAt: string`, `updatedAt: string` (znaczniki czasu jako ISO string). Przejście z kompletnego (wszystkie kroki `isStepComplete`) `ProjectDraft` na `SavedProduct` przy zapisie jest jawnym mapowaniem pole po polu (build plan zadanie 6), nie rzutowaniem typu.
- Nowy `StoredRegistrationDetails` w `lib/data/types.ts`: `{ nip: string; countries: CountryCode[]; technology: ProducerTechnology }`, dokładnie kształt dzisiejszego `RegistrationDetails` z `lib/producer-registration.ts`, zapisywany trwale zamiast żyć tylko w parametrach URL.
- Lista produktów w `localStorage`, klucz `producent:${nip}:produkty`: `SavedProduct[]`, ten sam wzorzec kluczowania NIP em co dzisiejszy szkic kreatora.
- Dane rejestracji w `localStorage`, klucz `producent:${nip}:rejestracja`: pojedynczy `StoredRegistrationDetails`, zapisywany raz przy pierwszym wejściu do kreatora, nadpisywany przy ponownej rejestracji tym samym NIP.
- Tymczasowy szkic edycji w `localStorage`, klucz `producent:${nip}:edycja:${id}`: `{ draft: SavedProduct; step: number }`, osobny od dzisiejszego klucza „nowy szkic w toku” (`producent:${nip}:projekt-szkic`), żeby edycja jednego produktu nigdy nie nadpisała niezapisanego nowego produktu w toku (i odwrotnie).

**State transitions**:
- Produkt jako całość: `nieistniejący` → `zapisany` (po „Zapisz projekt”, wpis dodany do listy) → `zapisany, zmieniony` (po „Zapisz zmiany” w edycji, ten sam `id`, nowy `updatedAt`) → `usunięty` (po potwierdzeniu w modalu, wpis znika z listy). Bez stanu pośredniego „opublikowany”/„szkic” na liście: każdy zapisany wpis jest od razu widoczny.
- Edycja pojedynczego produktu: `niezaczęta` → `w toku` (kroki 1 do 7, zapisywane po każdej zmianie w osobnym kluczu edycji) → `zapisana` (po „Zapisz zmiany”: klucz edycji czyszczony, wpis na liście zaktualizowany) albo `porzucona` (producent opuszcza ekran bez zapisu; klucz edycji zostaje, wznawia się przy powrocie, tak jak dzisiejszy szkic nowego produktu).

**API surface** (interfejs stron i funkcji magazynu, brak backendu, ten sam wzorzec co spec 0004 do 0010):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → lista produktów | Nawigacja z gotowości eksportowej albo bezpośredni URL | `nip` (wymagany) | Lista produktów tego NIP, albo stan pusty | Brak (znajomość NIP) | Zły format NIP albo brak zapisanych danych rejestracji → redirect do `/pl/producent` (satisfies AC-1) |
| „Dodaj produkt” | Klik | Zapisane dane rejestracji dla tego NIP | Nawigacja do `/pl/producent/projekt` z pełnym kompletem parametrów | Brak | Brak (dane zawsze dostępne, skoro lista sama się wyrenderowała) (satisfies AC-3) |
| Krok „Cena i sprzedaż” | Wpisanie/wybór wartości | Wartość pola (number/string) | Aktualizacja `ProjectDraft`, zapis w `localStorage` | Brak | Puste/nieprawidłowe pole (np. min > max) blokuje „Dalej” (satisfies AC-4) |
| „Zapisz projekt” (nowy produkt) | Submit na kroku Podsumowanie | Kompletny `ProjectDraft` (7 kroków) | Nowy wpis w liście produktów, redirect do zaślepki gotowości z `nip`/`countries`/`technology` | Brak | Nieaktywne, dopóki którykolwiek krok niekompletny (satisfies AC-4, AC-5) |
| URL → edycja produktu | Klik „Edytuj” albo bezpośredni URL | `nip`, `id` (oba wymagane) | Kreator wypełniony danymi produktu, na zapisanym albo pierwszym kroku edycji | Brak (znajomość NIP i ID) | Nieznane `id` → redirect do listy produktów (satisfies AC-7) |
| „Zapisz zmiany” (edycja) | Submit na kroku Podsumowanie edycji | Kompletny `SavedProduct` (7 kroków) | Aktualizacja wpisu na liście, redirect do listy produktów | Brak | Nieaktywne, dopóki którykolwiek krok niekompletny (satisfies AC-8, AC-9) |
| „Usuń” + potwierdzenie | Klik, potem klik w modalu | `id` produktu | Wpis usunięty z listy, modal zamknięty | Brak | Anuluj/Esc/klik poza modalem → brak zmian (satisfies AC-10) |
| `/klient/wyniki` → doklejenie lokalne | Zamontowanie komponentu w przeglądarce | Wszystkie klucze `producent:*:produkty` tej przeglądarki, aktywny filtr `country`/`sizeMin`/`sizeMax` | Karty podglądu dołożone do listy serwerowej, bez checkboxa | Brak | Uszkodzony wpis w danym kluczu pomijany, reszta listy renderuje się normalnie (satisfies AC-11, AC-13) |

**Key invariants**:
- Krok jest „ukończony” według tych samych reguł co dziś (spec 0008): wszystkie jego wymagane pola niepuste; nowy krok „Cena i sprzedaż” dodatkowo wymaga `housePriceMinEur <= housePriceMaxEur`, `productionLeadTimeWeeksMin <= productionLeadTimeWeeksMax`, `onSiteAssemblyDaysMin <= onSiteAssemblyDaysMax`, `structuralWarrantyYears` liczby całkowitej nieujemnej.
- Klucz szkicu „nowy produkt w toku” (`producent:${nip}:projekt-szkic`) i klucz edycji (`producent:${nip}:edycja:${id}`) są zawsze rozłączne; wejście w edycję nigdy nie czyta ani nie nadpisuje szkicu nowego produktu, i odwrotnie.
- `id` produktu generowany przez `crypto.randomUUID()` przy zapisie nowego produktu (z bezpiecznym fallbackiem, np. znacznik czasu plus losowy ciąg, gdy `crypto.randomUUID` nie istnieje, jak w niezabezpieczonym kontekście `http://` na telefonie w sieci lokalnej); nigdy nie zmienia się przy edycji.
- Brak wymogu unikalności nazwy produktu w obrębie jednego producenta; brak limitu liczby produktów.
- Usunięcie produktu (AC-10) zawsze czyści też jego klucz tymczasowej edycji (`producent:${nip}:edycja:${id}`), jeśli istnieje, żeby nie zostawiać osieroconego wpisu.
- Skanowanie kluczy dla listy produktów i dla lokalnego podglądu u klienta (AC-1, AC-11) dopasowuje wyłącznie klucze kończące się dokładnie na `:produkty`, nigdy samym prefiksem `producent:${nip}:`, żeby nie pomylić ich z kluczem szkicu (`:projekt-szkic`) albo edycji (`:edycja:${id}`).
- Strona listy produktów (AC-1, AC-2) i strona edycji (AC-7) najpierw pokazują stan ładowania, potem dopiero stan pusty/listę/redirect, dokładnie w tej kolejności: format NIP (od razu, po stronie serwera) → odczyt `localStorage` (po zamontowaniu, po stronie przeglądarki) → właściwy stan. Nigdy stan pusty ani redirect przed zakończeniem odczytu.
- Pola, których kreator nie zbiera (m.in. `producerId`, `producerName`, `rooms`, `bathrooms`, `storeys`, `builtUpAreaM2`, `externalDimensions`, `roofType`, `constructionSystem`, `foundationOptions`, `customizationScope`, `priceMin`, `priceMax`, `currency`, `coverImageUrl`, `priceIncludes`, `priceExcludes`, `featured`) są wyliczane wyłącznie przy przekształceniu `SavedProduct` → `Project` na potrzeby lokalnego podglądu u klienta (funkcja `mapSavedProductToProject`), nigdy zapisywane do `SavedProduct` samego: `producerId`/`producerName` z NIP (np. „Producent (NIP {nip})”), `constructionSystem` z etykiety wybranej technologii (`lib/producer-technologies.ts`), `rooms`/`bathrooms`/`storeys`/`builtUpAreaM2` prostą regułą z `floorAreaM2`/`bedrooms`, `priceMin`/`priceMax` jako `housePriceMinEur`/`housePriceMaxEur` plus mockowy transport i montaż (`lib/pricing.ts`) dla pierwszego kraju dostawy z rejestracji, `coverImageUrl` jako `https://picsum.photos/seed/{id}/800/600`, `currency` zawsze `"EUR"`, `featured` zawsze `false`, reszta jako stałe, jednakowe dla każdego produktu wartości opisowe.
- Wygenerowane wiersze dopuszczalności (`EligibilityByCountry`) dla lokalnego podglądu: status `"approved"` dla każdego kraju z `countries` zapisanych danych rejestracji tego producenta, żaden inny wiersz.
- Lokalnie doklejone karty nigdy nie trafiają do `selectedIds`/checkboxa `ResultsSelection`; ich `project.id` jest zawsze poprzedzony prefiksem `local-{nip}-`, żeby wykluczyć kolizję z ID z pliku danych przykładowych.
- Zapis do `localStorage` (lista produktów, dane rejestracji, szkic edycji) jest zawsze opakowany w `try`/`catch`; nieudany zapis po cichu pomija tę jedną aktualizację, nigdy nie blokuje dalszej pracy (ten sam wzorzec co spec 0008).

**Security model**:
Brak logowania, spójnie z resztą etapu Facade. NIP nie jest sekretem ani danymi uwierzytelniającymi (to jawny numer rejestrowy firmy), więc „ochrona” katalogu ogranicza się do znajomości adresu URL, dokładnie tak jak dzisiejszy szkic kreatora. Brak zakresu zgodności regulacyjnej: żadne dane wrażliwe nie są tu zbierane ani przetwarzane; ta specyfikacja nie dotyka płatności w żadnej formie.

**Configuration required**:
Brak nowych zmiennych środowiskowych. `picsum.photos` jako host dla placeholderowych zdjęć produktów jest już dozwolony w `next.config.ts` (`images.remotePatterns`), zgodnie z `AGENTS.md`.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: zarejestruj się, dodaj pierwszy produkt (siedem kroków), zobacz go na liście `/producent/produkty`, dodaj drugi produkt, oba widoczne na liście, sprawdza **AC-1** do **AC-5**.
- Happy path: edytuj istniejący produkt, zmień nazwę i cenę, zapisz, wróć na listę i zobacz zaktualizowaną pozycję, sprawdza **AC-7**, **AC-8**, **AC-9**.
- Happy path: usuń produkt przez modal potwierdzenia, znika z listy; otwórz modal na innym produkcie i kliknij Anuluj, produkt zostaje, sprawdza **AC-10**.
- Happy path: dodaj produkt jako producent, otwórz `/klient/wyniki` w tej samej przeglądarce (bez filtra i z filtrem kraju dostawy producenta), zobacz kartę z etykietą podglądu, bez checkboxa, sprawdza **AC-11**.
- Failure case: wejdź na `/producent/produkty` z NIP, który nigdy się nie rejestrował, redirect do `/producent` bez błędu na stronie, sprawdza **AC-1**.
- Failure case: wejdź na adres edycji z nieistniejącym `id`, redirect do listy produktów, sprawdza **AC-7**.
- Failure case: zacznij edycję produktu A, nie zapisuj, w drugiej karcie zacznij dodawać nowy produkt B od zera; obie prace przetrwają niezależnie po powrocie, sprawdza **AC-8**.
- Failure case: ręcznie uszkodzony wpis w `localStorage` (np. jeden z wielu kluczy `produkty`) nie psuje strony, reszta listy/wyników renderuje się normalnie, sprawdza **AC-13**.

## Build plan

1. Rozszerz `lib/data/types.ts`: dodaj dziewięć nowych pól do `ProjectDraft`, dodaj `SavedProduct` (typy nienullowalne, nie `ProjectDraft & {...}`, patrz Feature design), dodaj `StoredRegistrationDetails`, satisfies **AC-4**, **AC-5**
2. Rozszerz `lib/producer-project-draft.ts`: `createEmptyDraft()` o nowe pola, `WIZARD_STEPS` o krok „cena”, `isStepComplete()` o jego regułę walidacji, satisfies **AC-4**
3. Zbuduj `components/producent/ProjectWizardPricingStep.tsx` (siódmy krok: cena domu, standard, terminy, gwarancja, kategoria) i wepnij do `ProjectWizard.tsx` oraz `ProjectWizardSummaryStep.tsx`; zaktualizuj istniejące testy spec 0008 dla nowej liczby kroków (`ProjectWizard.test.tsx`, `ProjectWizardProgress.test.tsx`, `ProjectWizardSummaryStep.test.tsx`, e2e `pierwszy-projekt.spec.ts`), satisfies **AC-4**
4. Zbuduj `lib/producer-registration-storage.ts`: `saveRegistrationDetails()`/`loadRegistrationDetails()` na `localStorage` per NIP, fail soft; przekaż pełne `RegistrationDetails` (nie tylko `nip`) do `ProjectWizard` z `app/[locale]/producent/projekt/page.tsx` (page.tsx już je parsuje przez `parseRegistrationDetails`, dziś przekazuje dalej tylko `nip`) i wywołaj zapis przy montowaniu, satisfies **AC-1**, **AC-13**
5. Zbuduj `lib/producer-products.ts`: `listProducts()`, `saveProduct()`, `updateProduct()`, `deleteProduct()`, `getProduct()`, plus `loadEditDraft()`/`saveEditDraft()`/`clearEditDraft()` dla klucza edycji (kasowanie klucza edycji także przy `deleteProduct()`, patrz Key invariants); zapis w toku (`saveProduct`/`updateProduct` wołane po każdej zmianie pola) fail soft, finalny commit przy „Zapisz” zwraca sukces/błąd zamiast być cichy (patrz AC-5, AC-9, AC-13), satisfies **AC-5**, **AC-8**, **AC-9**, **AC-10**, **AC-13**
6. Wepnij zapis do listy produktów w akcję „Zapisz projekt”: zmapuj kompletny `ProjectDraft` na `SavedProduct` pole po polu, generuj `id` (`crypto.randomUUID()` z fallbackiem), `createdAt`/`updatedAt`; nawigacja do gotowości eksportowej (z dodanym `nip`/`countries`/`technology`) następuje tylko po udanym zapisie, inaczej komunikat błędu bez nawigacji, satisfies **AC-5**
7. Rozszerz `app/[locale]/producent/gotowosc-eksportowa/page.tsx`: opcjonalne `nip`/`countries`/`technology`, link „Zobacz swoje produkty” gdy `nip` obecny, satisfies **AC-6**
8. Zbuduj `app/[locale]/producent/produkty/page.tsx` (serwerowa powłoka, waliduje tylko format NIP) i `components/producent/ProductCatalogList.tsx` (kliencki: stan ładowania → wczytuje dane rejestracji i produkty → stan pusty/listę/redirect w tej kolejności, akcje Edytuj/Usuń, modal usuwania przez Headless UI `Dialog`, „Dodaj produkt” z pełnym kompletem parametrów), satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**
9. Zbuduj `app/[locale]/producent/produkty/[id]/edytuj/page.tsx` (serwerowa powłoka) i `components/producent/ProductEditWizard.tsx` (kliencki, reużywa siedem istniejących komponentów kroków; commit „Zapisz zmiany” z tą samą zasadą sukces/błąd co zadanie 6), satisfies **AC-7**, **AC-8**, **AC-9**
10. Zbuduj `lib/local-client-projects.ts`: `mapSavedProductToProject()` (wyliczenia opisane w Key invariants) i `getAllLocalProducerProjects()` (skan kluczy kończących się na `:produkty` w przeglądarce, patrz Key invariants), satisfies **AC-11**
11. Rozszerz `components/klient/ResultsSelection.tsx`: dolącz lokalne produkty po zamontowaniu (przefiltrowane tym samym `country`/`sizeMin`/`sizeMax`), ukryty checkbox, etykieta podglądu i `aria-live` ogłoszenie dla nich, przenieś decyzję pusta/niepusta lista do tego komponentu; zaktualizuj `app/[locale]/klient/wyniki/page.tsx`, żeby zawsze renderował ten komponent zamiast gałęzi `EmptyResults` po stronie serwera, i zaktualizuj `ResultsHeader`/`count`, żeby liczyła też lokalnie dołączone pozycje, satisfies **AC-11**, **AC-12**, **AC-14**
12. Przejście dostępności: jeden H1 per strona, kolejność fokusa, focus trap i etykiety modala Headless UI, WCAG 2.2 AA na nowym kroku, liście i ekranie edycji, satisfies **AC-14**

## Consequences

**Positive**:
- Producent może dodać, zobaczyć, edytować i usunąć wiele produktów zamiast jednego jednorazowego szkicu, dokładnie to, o co poproszono, bez wprowadzania backendu.
- Reużywa każdy istniejący wzorzec (`localStorage` per NIP, zapis fail soft, kroki kreatora, Headless UI) zamiast wymyślać nowy.
- Lokalny podgląd na `/wyniki` daje namacalny dowód działania obu ścieżek naraz w jednej przeglądarce, bez ryzykownej przebudowy czterech gotowych ekranów klienta.

**Negative / tradeoffs**:
- Katalog i dane rejestracji żyją wyłącznie w jednej przeglądarce; wyczyszczenie danych przeglądarki albo inna przeglądarka oznacza utratę dostępu do całego katalogu, nie tylko jednego szkicu jak dziś.
- Lokalnie dodane produkty na `/wyniki` są tylko podglądem: nie da się ich zaznaczyć ani wysłać w zapytaniu, bo ścieżka zapytania nadal działa wyłącznie na danych z serwera. To świadomy kompromis opisany w rationale.md, nie luka, ale wymaga jasnej etykiety w interfejsie.
- Siódmy krok kreatora rozszerza już zbudowany i zweryfikowany kreator ze spec 0008; regresja dla kroków 1 do 6 i ich kryteriów pozostaje ważna do przypilnowania.
- Pola, których kreator nie zbiera (wymiary zewnętrzne, typ dachu, zakres personalizacji i inne), są identyczne dla każdego produktu, jasno oznaczone jako wyliczone, nie realne dane.
- Dwie karty tej samej przeglądarki mogą nadpisać ten sam wpis edycji, jeśli edytują ten sam produkt jednocześnie, ten sam znany limit co dzisiejszy szkic kreatora (spec 0008, Negative). Podobnie: usunięcie albo edycja produktu w jednej karcie nie odświeża automatycznie listy otwartej w drugiej karcie (brak nasłuchu na zdarzenie `storage`), widoczne dopiero po ręcznym odświeżeniu.

**Neutral**:
- Zwiększa realny zakres funkcji ponad pierwotne oszacowanie wagi „medium” w `scope.md`: dotyka też spec 0004 i pośrednio spec 0005 po stronie klienta. Do uzgodnienia przy najbliższym `/scope`.
- `ProjectDraft` rośnie o dziewięć nowych pól; przyszłe podłączenie prawdziwego backendu (Deferred) będzie musiało zmapować też te pola, nie tylko oryginalne osiem technicznych z spec 0008.

## Follow-up

- [ ] Przy najbliższym `/scope` zaktualizuj wagę funkcji 18 w `docs/scope/scope.md` (dziś `medium`): zakres urósł o nowy krok kreatora, dwie nowe trasy, i ingerencję w `/klient/wyniki` (spec 0004).
- [ ] Gdy powstanie prawdziwy model danych i baza (Deferred w scope.md), zdecyduj czy `SavedProduct`/`StoredRegistrationDetails` stają się rekordami bazy, czy zostają lokalnym cache poziomu przeglądarki obok prawdziwych danych.
- [ ] Gdy powstanie prawdziwe wgrywanie plików (Deferred), rozważ realne zdjęcie zamiast placeholdera z `picsum.photos`.
- [ ] Jeśli w przyszłości ścieżka zapytania/oferty ma obsłużyć też lokalnie dodane produkty, potrzebna osobna decyzja obejmująca minimum cztery ekrany klienta (zapytanie, działka, oferta, realizacja); nieobjęta tą specyfikacją.
