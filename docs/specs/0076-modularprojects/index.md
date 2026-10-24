# 0076. ModularProjects: nazwa przetargu i publiczna strona realizacji

**Date**: 2026-10-24
**Status**: In Progress

## Summary

Przetarg na duże zamówienia (od 3 domów, spec 0070) dostaje jedną nazwę własną: **ModularProjects**. Nazwa zastępuje dzisiejsze "Tablica ogłoszeń" w panelu producenta i "Duże zamówienia" w panelu inwestora, a także teksty w menu, formularzu zgłoszenia i mailach. Logika, adresy i baza danych zostają bez zmian. Do tego powstaje publiczna strona `/modularprojects` w formie bloga, na której pokazujemy duże realizacje ModularHub. Wpisy leżą w plikach kodu (bez bazy i bez edytora), a pierwszym wpisem jest dzisiejsza zahardkodowana realizacja Succes Resorts.

## Requirements

**User stories**:
- Jako inwestor, chcę widzieć w panelu i w formularzu jedną, rozpoznawalną nazwę swojego dużego projektu (ModularProjects), żeby wiedzieć, że to jest ta usługa, o którą pytałem.
- Jako producent, chcę, żeby ekran z zapytaniami o duże projekty nazywał się tak samo jak w mailach i na stronie, żeby nie zgadywać, o czym mowa.
- Jako odwiedzający stronę, chcę zobaczyć, że ModularHub realizuje prawdziwe duże projekty, ze zdjęciami wizualizacji, projektu i budowy, żeby uwierzyć, że platforma jest prawdziwa.
- Jako właściciel produktu, chcę dodać nową realizację zwykłym commitem (plik z tekstem w czterech językach i zdjęcia), bez migracji i bez panelu edycji.

**Acceptance criteria** (kontrakt, każde kryterium można sprawdzić osobno):

Nazwa (zmiana tekstów, bez zmiany logiki):
- **AC-1**: Panel producenta nazywa ekran zapytań o duże projekty "ModularProjects" w czterech miejscach: pozycja menu bocznego (`board` w nawigacji panelu producenta), nagłówek strony tablicy (`ProducerPanelBoardPage.heading`), zakładki (`ProducerBoardTabs.ariaLabel`) i link powrotny ze szczegółu (`ProducerBoardDetailPage.backToBoard`). Panel klienta nazywa pozycję menu `quotes` (dziś "Duże zamówienia") i nagłówek strony `/panel/quotes` "ModularProjects". Teksty odznak i podpowiedzi, które dziś mówią "tablica" lub "ogłoszenia" (`boardTitle`, `boardBadgeLabel`, `sourceProjectRequest`, podpowiedzi widoczności `locationDetailVisibilityHint` i `extrasNoteVisibilityHint`), też używają nazwy ModularProjects.
- **AC-2**: Poza panelami nazwa jest użyta tam, gdzie klient lub producent spotyka przetarg: pozycja "Zapytanie o duże zamówienie" w menu strony (`nav.orders.largeOrder`), strona i formularz `/project-request` (tytuł strony, opis meta, nagłówek `ProjectRequestFlow.heading`, wstęp), stopka, strona kontaktu (`largeOrderHeading`, `largeOrderText`, `largeOrderLink`), przyciski "Dodaj zapytanie o duże zamówienie" w panelu klienta i okno limitu (`BulkRequestLimitMessage`). Próg "od 3 domów" zostaje w tekstach jako warunek, nazwa go nie zastępuje.
- **AC-3**: Maile wysyłane do klienta i producenta oraz komunikaty błędów (limit trzech zapytań, zamknięcie zapytania, przypomnienia, wybór oferty, połączenie stron) nazywają usługę ModularProjects w temacie i w treści, we wszystkich czterech językach. Maile do zespołu ModularHub (po polsku) zmieniamy tak samo, żeby słownictwo było jedno.
- **AC-4**: Zmiana nazwy dotyczy wyłącznie tekstów widocznych dla klienta i producenta. Bez zmian zostają: adresy tras (`/producer/panel/board`, `/panel/quotes`, `/project-request`), klucze w `messages/*.json`, nazwy statusów i kolumn w bazie, tabele (`project_request`, `bulk_product_inquiry`), logika dopasowania i ofert, ekrany administratora (`/internal/**`, po polsku) i same specyfikacje. Istniejące testy komponentów i E2E, które sprawdzają stary tekst, są zaktualizowane na nowy i przechodzą.
- **AC-5**: Nazwa **ModularProjects** jest nazwą własną i brzmi tak samo w pl, en, de i nl (nie jest tłumaczona). Reszta każdego zdania ma prawdziwe tłumaczenie. Test zgodności tłumaczeń (`lib/i18n/large-order-messages.test.ts`) pozwala, żeby wartość równa dokładnie "ModularProjects" była identyczna w czterech językach, a pozostałe wartości dalej nie mogą być puste ani skopiowane z polskiego.

Publiczna strona realizacji:
- **AC-6**: Strona `/{locale}/modularprojects` (grupa tras `(customer)`) pokazuje jeden `h1`, krótki wstęp i listę kart realizacji od najnowszej (`publishedAt`). Karta ma zdjęcie okładki, tytuł, krótkie streszczenie (`lead`), dwa lub trzy fakty i znacznik statusu (ikona plus tekst, nie sam kolor). Cała karta jest linkiem do wpisu. Gdy lista wpisów jest pusta, strona pokazuje komunikat, nie błąd.
- **AC-7**: Strona `/{locale}/modularprojects/[slug]` pokazuje wpis w stylu bloga: tytuł (`h1`), lead, fakty o projekcie (lista `dl`), sekcje tekstowe (nagłówek `h2` i akapity), galerię zdjęć podzieloną na grupy z nagłówkami (wizualizacje, projekt konstrukcji, budowa) oraz dwa wezwania do działania: "Zleć podobny projekt" (`/{locale}/project-request`) i "Realizuj takie projekty" (`/{locale}/producer/registration`), plus link powrotny do listy. Nieznany `slug` kończy się `notFound()`. Wszystkie wpisy w czterech językach są generowane statycznie (`generateStaticParams`).
- **AC-8**: Wpis jest plikiem TypeScript z jednym typem `ModularProjectEntry`. Każdy tekst (tytuł, lead, nagłówki i treść sekcji, etykiety i wartości faktów, opisy zdjęć) jest typu `Record<pl|en|de|nl, string>`, więc kompilator odrzuca wpis, w którym brakuje któregokolwiek języka. Dodanie wpisu to nowy plik, jego dopisanie do listy `MODULARPROJECT_ENTRIES` i zdjęcia w `public/`, bez migracji, bez zmian w bazie i bez zmiany `proxy.ts`. Getery (`getModularProjects(locale)`, `getModularProjectBySlug(slug, locale)`, `getFeaturedModularProject(locale)`) są asynchroniczne, zgodnie z regułą warstwy danych (`lib/data/AGENTS.md`).
- **AC-9**: Dzisiejsza realizacja Succes Resorts (49 domków, BUDMAN HOUSE, Voorgewel Chalet) jest pierwszym wpisem i oznaczona jako wpis wyróżniony (`featured`, dokładnie jeden w całej liście). Kafel na stronie głównej (`FeaturedProjectShowcase`) czyta swoje dane z wpisu wyróżnionego (tytuł, lead, fakty, galeria), zamiast z `lib/data/featured-showcase.ts` i z kluczy `FeaturedProjectShowcase.gallery.*` w `messages/*.json`, które znikają. Kafel dostaje link "Zobacz wszystkie realizacje" do `/{locale}/modularprojects` i link do samego wpisu. Zachowuje obecne zdjęcia: cztery wizualizacje (z góry, z boku, z prawej, z przodu), trzy rysunki konstrukcji i trzy zdjęcia z budowy.
- **AC-10**: Zdjęcia wpisu leżą w `public/images/modularprojects/<slug>/` (dla Succes Resorts przeniesione z `public/images/success/`, bez czterech nieużywanych wizualizacji: lewa strona, sypialnia, salon, wnętrze), są wyświetlane przez `next/image`, a każde ma opis alternatywny w czterech językach. Test sprawdza, że każdy plik wskazany we wpisie istnieje na dysku, a każdy opis nie jest pusty. Okładka wpisu jest jednym ze zdjęć jego galerii.
- **AC-11**: Obie strony mają metadane jak `contact/page.tsx`: tytuł, opis, adres kanoniczny, alternatywy językowe (`hreflang`, w tym `x-default`) i Open Graph ze zdjęciem okładki. Wpis ma dane strukturalne JSON-LD typu `Article` (nagłówek, obraz, data publikacji, język), lista typu `CollectionPage`. Mapa strony (`app/sitemap.ts`) zawiera `/modularprojects` i każdy wpis we wszystkich czterech językach z datą publikacji jako `lastModified`. Adres serwisu pochodzi wyłącznie z `getSiteUrl()` (spec 0073).
- **AC-12**: Obie strony są zgodne z WCAG 2.2 AA: jeden `h1`, logiczna kolejność nagłówków, widoczny `.focus-ring` na wszystkich linkach, status przekazany ikoną i tekstem, kontrast poprawny w trybie jasnym i ciemnym (zakres `.theme-klient`, tokeny jak w `FeaturedProjectShowcase`). Układ działa na wąskich ekranach bez poziomego przewijania.
- **AC-13**: Treść wpisu nie zawiera danych kontaktowych inwestora ani producenta: żadnego adresu e mail, numeru telefonu ani adresu strony internetowej. Test przeszukuje wszystkie teksty wszystkich wpisów we wszystkich językach i odrzuca takie wzorce.
- **AC-14**: Podstrona jest osiągalna z nawigacji: pozycja "Realizacje ModularProjects" w grupie "Zamówienia" menu strony (`SiteHeaderMenuNav`, `nav.orders`) i link w stopce (`SiteFooter`), obie z prawdziwym tłumaczeniem w czterech językach.

## Decision

**Chosen option**: Option 1: nazwa jako zmiana tekstów oraz wpisy bloga w plikach TypeScript.

ModularProjects jest nazwą własną dla całego przetargu (zmiana samych tekstów w panelach, menu, formularzu i mailach), a publiczna strona realizacji bierze treść z typowanych plików w repozytorium, z jedną warstwą danych, którą później można podmienić na bazę bez zmiany wywołań.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: brak zmian w bazie danych, brak migracji. Dane wpisów żyją w kodzie:

| Element | Plik | Uwagi |
|---|---|---|
| Typ `ModularProjectEntry` i typy pomocnicze | `lib/data/modularprojects/types.ts` | Patrz kształt niżej. |
| Wpisy | `lib/data/modularprojects/entries/<slug>.ts` | Jeden plik na wpis, eksport stałej typu `ModularProjectEntry`. Pierwszy: `succes-resorts.ts`. |
| Lista wpisów | `lib/data/modularprojects/index.ts` | `MODULARPROJECT_ENTRIES` (tablica) i trzy asynchroniczne gettery z AC-8. |

Kształt wpisu:

```ts
type Locale = "pl" | "en" | "de" | "nl";
type LocalizedText = Record<Locale, string>;

interface ModularProjectEntry {
  slug: string;                 // kebab-case, unikalny
  publishedAt: string;          // data ISO, np. "2026-10-24"
  featured?: boolean;           // dokładnie jeden wpis w liście ma true
  status: "planned" | "in_production" | "delivered";
  title: LocalizedText;
  lead: LocalizedText;          // 1 lub 2 zdania: karta, opis meta, Open Graph
  facts: { label: LocalizedText; value: LocalizedText }[];
  sections: { heading: LocalizedText; body: LocalizedText }[]; // akapity rozdzielone pustą linią
  gallery: {
    file: string;               // nazwa pliku w public/images/modularprojects/<slug>/
    group: "visualization" | "design" | "construction";
    alt: LocalizedText;
  }[];
  cover: string;                // jedna z wartości gallery[].file
}
```

Pomocnik `same("49")` zwraca `LocalizedText` z jedną wartością we wszystkich językach (dla faktów, które się nie tłumaczą, jak nazwa inwestora). Gettery zwracają `ResolvedModularProject` (już z jednym językiem, bez `LocalizedText`), więc komponenty nigdy nie wybierają języka same.

Teksty interfejsu (nie treść wpisów) są w `messages/*.json` w nowej przestrzeni nazw `ModularProjectsPage` (tytuł strony, wstęp, nagłówki grup zdjęć, etykiety statusów, przyciski, link powrotny, komunikat pustej listy) i `ModularProjectPage`. Przestrzeń `FeaturedProjectShowcase` traci klucze `gallery.*`, `heading`, `intro` i etykiety faktów, które przechodzą do wpisu, a zachowuje etykiety interfejsu kafla (nagłówek sekcji, przyciski, `status`).

**State transitions**: brak maszyny stanów. `status` wpisu to opis (planowana, w produkcji, zrealizowana), zmieniany ręcznie w pliku.

**API surface**: bez endpointów i bez akcji serwera. Dwie nowe trasy tylko do odczytu:

| Trasa | Metoda | Wejście | Wynik | Auth | Błędy |
|---|---|---|---|---|---|
| `/{locale}/modularprojects` | GET (strona) | locale | lista kart | publiczna | brak (pusta lista to komunikat) |
| `/{locale}/modularprojects/[slug]` | GET (strona) | locale, slug | wpis | publiczna | 404 dla nieznanego `slug` |

**Key invariants** (pilnowane testem integralności wpisów, `lib/data/modularprojects/index.test.ts`, oraz typem):
- Każdy tekst ma wszystkie cztery języki i żaden nie jest pusty (typ plus test).
- `slug` unikalny i zgodny z `^[a-z0-9]+(-[a-z0-9]+)*$`; `publishedAt` jest poprawną datą.
- Dokładnie jeden wpis ma `featured: true`.
- Każdy `gallery[].file` istnieje w `public/images/modularprojects/<slug>/`, `cover` wskazuje plik z galerii, a wpis ma co najmniej jedno zdjęcie.
- Żaden tekst nie zawiera e maila, telefonu ani adresu www (AC-13).
- Lista jest posortowana od najnowszego wpisu.

**Security model**: treść publiczna, tylko do odczytu, bez danych wejściowych od użytkownika, bez sesji i bez zapisu, więc nie ma ograniczania szybkości ani uprawnień do zaprojektowania. Treść pisze właściciel w repozytorium, a przegląd zmian odbywa się jak dla kodu. Dane osobowe: wpis nie zawiera danych kontaktowych (AC-13). Nazwy inwestora i producenta oraz zdjęcia są treścią publiczną, więc wymagają zgody tych stron i praw do zdjęć (Follow-up). Brak zakresu RODO poza tym.

**Configuration required**: brak nowych zmiennych środowiskowych. `next.config.ts` bez zmian (zdjęcia są lokalne w `public/`, nie trzeba dodawać hosta).

**Critical test scenarios** (każdy mapuje się na kryterium z `## Requirements`):
- Happy path nazwa: panel producenta (`/producer/panel`) i klienta (`/panel/quotes`) pokazują "ModularProjects" w menu i nagłówku, a stare "Tablica ogłoszeń" i "Duże zamówienia" nie występują w tych miejscach, verifies **AC-1**.
- Happy path formularz i menu: `/project-request`, menu strony i stopka używają nazwy, próg "od 3 domów" zostaje, verifies **AC-2**.
- Maile: temat i treść maila o nowym zapytaniu, publikacji podsumowania i połączeniu stron zawierają "ModularProjects" w czterech językach, verifies **AC-3**.
- Brak regresji: istniejące testy dużych zamówień (limit trzech, zamknięcie, wznowienie, tablica) przechodzą po aktualizacji tekstów, adresy tras bez zmian, verifies **AC-4**.
- Tłumaczenia: test przestrzeni nazw przepuszcza nazwę własną identyczną w czterech językach i wyłapuje puste lub skopiowane z polskiego wartości, verifies **AC-5**.
- Lista: `/pl/modularprojects` pokazuje kartę Succes Resorts z okładką, faktami i statusem, a karta prowadzi do wpisu, verifies **AC-6**.
- Wpis: `/en/modularprojects/succes-resorts` pokazuje tytuł po angielsku, fakty, trzy grupy zdjęć z nagłówkami i oba przyciski; `/pl/modularprojects/nie-ma-takiego` daje 404, verifies **AC-7**.
- Integralność: wpis z brakującym językiem nie przechodzi kompilacji, a wpis ze wskazaniem na nieistniejący plik albo z drugim `featured` przewraca test, verifies **AC-8**, **AC-10**.
- Strona główna: kafel pokazuje tytuł i galerię z wpisu wyróżnionego, ma link do listy i do wpisu, a plik `featured-showcase.ts` nie istnieje, verifies **AC-9**.
- SEO: metadane, `hreflang`, JSON-LD `Article` i wpisy w mapie strony we wszystkich czterech językach, verifies **AC-11**.
- Dostępność: jeden `h1` na obu stronach, status ma ikonę i tekst, link ma `.focus-ring`, verifies **AC-12**.
- Dane kontaktowe: test wyłapuje e mail, telefon i adres www w dowolnym tekście wpisu, verifies **AC-13**.
- Nawigacja: menu i stopka mają link do `/modularprojects` w czterech językach, verifies **AC-14**.

## Build plan

Podejście budowy: Tracer Bullet (dla epiki Produkcja). Najpierw cienki wątek od pliku wpisu do wyrenderowanej strony, potem lista, kafel na stronie głównej i nawigacja, a na końcu szeroka, mechaniczna zmiana tekstów. Nie ma migracji, więc zadanie 1 to dane, nie baza.

1. Typy, helper `same()`, gettery asynchroniczne i wpis `succes-resorts.ts` w `lib/data/modularprojects/`, razem z przeniesieniem używanych zdjęć z `public/images/success/` do `public/images/modularprojects/succes-resorts/` (`git mv`, cztery nieużywane wizualizacje usunięte) i testem integralności wpisów, satisfies **AC-8**, **AC-10**, **AC-13**
2. Strona wpisu `app/[locale]/(customer)/modularprojects/[slug]/page.tsx` z komponentami `ModularProjectArticle` i grupami galerii (ponowne użycie `FeaturedProjectGallery`), `generateStaticParams`, `notFound()`, metadane, JSON-LD `Article` i nowa przestrzeń `ModularProjectPage` w czterech językach, satisfies **AC-7**, **AC-11**, **AC-12**
3. Strona listy `app/[locale]/(customer)/modularprojects/page.tsx` z komponentem `ModularProjectCard`, metadane, JSON-LD `CollectionPage` i przestrzeń `ModularProjectsPage` w czterech językach, satisfies **AC-6**, **AC-11**, **AC-12**
4. Kafel na stronie głównej: `FeaturedProjectShowcase` czyta wpis wyróżniony, dostaje linki do listy i do wpisu; usunięcie `lib/data/featured-showcase.ts` i kluczy `gallery.*`, `heading`, `intro` oraz etykiet faktów z `messages/*.json`; aktualizacja `FeaturedProjectShowcase.test.tsx` i `page.test.tsx`, satisfies **AC-9**
5. Nawigacja i mapa strony: pozycja w `SiteHeaderMenuNav` (grupa `orders`), link w `SiteFooter`, wpisy w `app/sitemap.ts` (lista plus wpisy w czterech językach, `lastModified` z `publishedAt`) i test mapy, satisfies **AC-14**, **AC-11**
6. Nazwa w panelach: etykiety i nagłówki panelu producenta i klienta (AC-1), aktualizacja ich testów komponentów, satisfies **AC-1**, **AC-4**
7. Nazwa w formularzu, menu, stopce, stronie kontaktu i oknie limitu (AC-2), aktualizacja testów, satisfies **AC-2**, **AC-4**
8. Nazwa w mailach i komunikatach (AC-3): tematy i treści w przestrzeniach nazw z `LARGE_ORDER_NAMESPACES`, aktualizacja testów maili, satisfies **AC-3**, **AC-4**
9. Rozszerzenie `lib/i18n/large-order-messages.test.ts`: wyjątek dla wartości równej "ModularProjects", nowe przestrzenie `ModularProjectsPage` i `ModularProjectPage` w czterech językach, satisfies **AC-5**
10. Aktualizacja testów E2E (`e2e/`), które szukają starych tekstów ("Tablica ogłoszeń", "Duże zamówienia"), plus jeden test E2E ścieżki lista, wpis, przycisk "Zleć podobny projekt", satisfies **AC-4**, **AC-6**, **AC-7**
11. `npm run lint`, `npm run test`, `npm run build` i sprawdzenie w przeglądarce obu stron, kafla i paneli w jasnym i ciemnym motywie oraz na wąskim ekranie (po restarcie serwera dev, bo `messages/*.json` są trzymane w pamięci), satisfies **AC-12**

## Consequences

**Positive**:
- Jedna nazwa w całym przetargu: klient i producent widzą to samo w panelu, w mailach i na stronie.
- Zero zmian w bazie i w logice, więc zmiana nazwy nie ryzykuje regresji w przetargu (spec 0070 jest jeszcze w budowie).
- Strona realizacji jest statyczna i szybka, dobra pod SEO, bez zapytań do bazy.
- Typ `Record` na czterech językach i test integralności sprawiają, że nie da się opublikować wpisu bez któregoś tłumaczenia ani z martwym zdjęciem.
- Warstwa asynchronicznych getterów pozwala później przenieść wpisy do bazy bez zmiany stron.

**Negative / tradeoffs**:
- Każdy nowy wpis lub poprawka to commit i wdrożenie, a osoba bez dostępu do repozytorium nie opublikuje nic sama.
- Zdjęcia w `public/` powiększają repozytorium i przechodzą przez optymalizację obrazów Vercel (limit, który już raz wyczerpaliśmy, po zakupie Pro mniej groźny, ale do pilnowania).
- Wpisy nie są powiązane z konkretnym przetargiem w bazie (np. zwycięski projekt nie tworzy wpisu sam), więc nowa realizacja zawsze wymaga ręcznej pracy.
- Nazwa własna jest taka sama w czterech językach, więc test tłumaczeń ma wyjątek, który trzeba utrzymywać.
- Zmiana tekstów dotyka wielu plików (panele, formularz, maile, testy), więc zadania 6 do 10 są szerokie, choć mechaniczne.

**Neutral**:
- Ekrany administratora zostają ze starym słownictwem, bo są wewnętrzne i po polsku. Rozbieżność jest świadoma.
- Spec 0073 (AC-3, dane realizacji pokazowej leżą w `lib/data/featured-showcase.ts`) zostaje uzupełniony tym specem: dane przechodzą do wpisu wyróżnionego.
- Nie ma nowych zmiennych środowiskowych, nowych zależności ani zmian w `proxy.ts`.

## Follow-up

- [ ] Potwierdzić zgodę inwestora (Succes Resorts) i producenta (BUDMAN HOUSE) na publiczne podanie nazw oraz prawa do zdjęć z budowy i wizualizacji, zanim strona trafi na produkcję (decyzja właściciela, nie blokuje budowy)
- [ ] Zdecydować, czy usunąć z repozytorium cztery nieużywane wizualizacje (lewa strona, sypialnia, salon, wnętrze); spec zakłada usunięcie przy przenosinach, historia git je zachowuje
- [ ] Gdy realizacji będzie więcej niż kilka albo edycja ma przejść do osób spoza zespołu technicznego, otworzyć osobną decyzję o przeniesieniu wpisów do bazy z edytorem w panelu admina (gettery z AC-8 są do tego przygotowane)
- [ ] Zdecydować później, czy ModularProjects dostaje własną stronę "jak to działa" dla inwestorów, poza zakresem tej specyfikacji
- [ ] Wiersz tej funkcji w `docs/scope/` nie istnieje, dopisać go przez `/scope`, jeśli ma być śledzony
