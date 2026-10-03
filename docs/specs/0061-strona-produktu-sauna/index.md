# 0061. Dedykowana strona produktu dla sauny

**Date**: 2026-10-02
**Status**: In Progress

## Summary

Sauna dostaje własną, osobną stronę produktu pod adresem `/sauna/[slug]`, zbudowaną na wzór istniejącej strony `/outdoor-tv/[slug]`, a nie przez doklejanie jej do strony domu. Sauna to już dziś istniejąca podkategoria (`spaSubcategory: "sauna"`) rodziny `spa-modulowe`, ale dotychczasowy model danych technicznych tej rodziny był zbudowany pod jacuzzi (woda, filtracja), nie pod suchą saunę, więc dostaje własny, poprawny kształt. Cena pieca, kolor impregnacji drewna i panele podczerwieni są płatnymi opcjami wybieranymi przez klienta (ten sam mechanizm co dziś dla kontenerów Dampol), nie stałymi parametrami produktu.

## Requirements

**Historie użytkownika**:
- Jako klient przeglądający ofertę saun, chcę zobaczyć stronę produktu dopasowaną do tego, czym naprawdę jest sauna (nie dom ani telewizor), żeby łatwo zrozumieć ofertę i wybrać piec oraz dodatki.
- Jako producent sauny (wpisywany dziś ręcznie przez zespół), chcę żeby platforma poprawnie pokazywała moje realne dane techniczne i ceny opcji, bez pól, które nie mają sensu dla sauny (woda, filtracja).
- Jako osoba budująca kolejną funkcję platformy, chcę żeby każde miejsce linkujące do produktu nadal prowadziło pod właściwy adres, także po dodaniu sauny.

**Kryteria akceptacji**:
- **AC-1**: Opublikowany produkt z `family = "spa-modulowe"` i `spaSubcategory = "sauna"` renderuje się pod `/{locale}/sauna/{slug}` (lub `{id}`, gdy sluga jeszcze nie ma), nigdy pod `/project/[slug]` ani `/outdoor-tv/[slug]`.
- **AC-2**: `getTechnicalSpecsSchema` wymaga `spaSubcategory` dla `family = "spa-modulowe"` (rzuca błąd przy jego braku, tym samym wzorcem co dziś wymaga `containerSubcategory` dla kontenerów) i zwraca nowy, ścisły schemat `saunaSpecsShape` tylko dla `spaSubcategory = "sauna"`; dla `"jacuzzi"` i `"wellness-combo"` zwraca niezmieniony, dotychczasowy schemat `spaModuloweSpecsShape` (zero regresji dla tych dwóch podkategorii). Żadne wywołanie nie może po cichu dostać złego schematu przez pominięcie parametru.
- **AC-3**: `resolveProductHref` poprawnie buduje adres sauny po rozszerzeniu o parametr podkategorii spa, odczytywany z rekordu produktu w każdym miejscu wywołania (nigdy nie zgadywany ani nie pomijany); każde dotychczasowe miejsce budujące link do produktu (lista wyników, ulubione, tabela porównania, podgląd producenta i admina) nadal zwraca identyczny adres jak dziś dla wszystkich pozostałych kombinacji rodziny i podkategorii.
- **AC-11**: `/sauna/[slug]` zwraca 404 dla produktu, który nie jest `spa-modulowe`/`sauna`; `/project/[slug]` i `/outdoor-tv/[slug]` zwracają 404 dla produktu, który jest `spa-modulowe`/`sauna` (żadna strona nie renderuje cudzego produktu pod swoim adresem).
- **AC-4**: Sekcja płatnych opcji konfiguratora (piec, kolor impregnacji, panele podczerwieni) renderuje się bezpośrednio po hero, zanim klient przewinie do specyfikacji technicznej, dokładnie tym samym mechanizmem co spec 0059 (bez żadnej zmiany w logice cenowej czy w tabelach `product_option_group`/`product_option`).
- **AC-5**: Strona nie renderuje (nie pokazuje też jako placeholder) układu pomieszczeń, tabeli porównania cena i zakres, harmonogramu realizacji ani zapytania hurtowego B2B, bo żadne z tych pojęć nie ma odpowiednika w danych sauny.
- **AC-6**: Sekcja działka i logistyka (fundament, wymiary transportowe, wymagania dźwigowe, zakres serwisu), reużywająca istniejący komponent `ProjectLogistics` bez zmian, renderuje się tylko gdy choć jedno z tych pól jest wypełnione, zgodnie z istniejącym wzorcem ukrywania pustych sekcji (spec 0054).
- **AC-7**: Specyfikacja techniczna renderuje się przez nowy, dedykowany komponent z tłumaczonymi etykietami zbudowany na realnym, ścisłym schemacie Zod, a nie przez generyczną tabelę jsonb; sekcja znika całkowicie, gdy `technicalSpecs` jest puste (produkt w statusie szkic).
- **AC-8**: Sekcje wideo edukacyjnego i listy cech są renderowane przez komponenty współdzielone z istniejącą stroną `/outdoor-tv/[slug]`, a zachowanie strony outdoor tv po tej zmianie pozostaje identyczne jak przed nią (brak regresji).
- **AC-9**: Produkt bez sluga pokazuje się pod adresem z `id` (ten sam wzorzec co spec 0058); produkt w statusie szkic dostaje `robots: noindex` (ten sam wzorzec co pozostałe strony produktu).
- **AC-10**: Dopóki kreator producenta nie rozróżnia pól technicznych według podkategorii spa, opcja "sauna" jest ukryta w jego selektorze podkategorii, żeby żaden producent nie mógł dziś przez pomyłkę zapisać sauny ze złym, jacuzzi-kształtnym zestawem pól.

## Decision

**Wybrana opcja**: Opcja 1, dedykowana trasa `/sauna/[slug]`.

Sauna dostaje własną stronę produktu zbudowaną na wzór `/outdoor-tv/[slug]`, z nowym, poprawnym schematem danych technicznych tylko dla podkategorii sauna; jacuzzi i wellness combo zostają bez decyzji do czasu pierwszego realnego producenta.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Rationale

Rozumowanie i rozważane opcje: patrz `rationale.md`.

## Feature design

**Szkic modelu danych**:

Zero nowych tabel i zero migracji. `product.spa_subcategory`, `product.technical_specs` (jsonb), `product_variant`, `product_option_group`, `product_option` i `product_option_group_assignment` już istnieją i są reużywane bez zmian w schemacie bazy.

Nowy, forkowany kształt Zod (ten sam wzorzec co `containerBaseSpecsShape` dla kontenerów modułowych), wyłącznie dla `spaSubcategory = "sauna"`:

| Pole | Typ | Opis |
|---|---|---|
| `claddingMaterial` | string, wymagane | okładzina zewnętrzna |
| `interiorWoodType` | string, wymagane | drewno wnętrza |
| `benchMaterial` | string, wymagane | materiał ławek |
| `insulationType` | string, wymagane | rodzaj izolacji |
| `glazingType` | string, wymagane | rodzaj przeszklenia okien i drzwi |
| `seatingCapacity` | liczba, wymagane | liczba miejsc |
| `hasChangingArea` | boolean, wymagane | czy jest przedsionek lub strefa relaksu |
| `changingAreaDescription` | string, opcjonalne | opis strefy, znaczący tylko gdy `hasChangingArea` jest prawdą |
| `electricalRequirement` | string, wymagane | wymagania instalacji elektrycznej bazowego produktu (np. napięcie, moc przyłącza), niezależnie od tego, który piec klient później dobierze jako opcję; nie opisuje mocy konkretnego pieca |

Celowo bez `foundationType`: wymagania fundamentowe sauny żyją w już istniejącym, ogólnym polu `Project.foundationOptions` (to samo pole, które pokazuje sekcja działka i logistyka, AC-6), żeby nie powstały dwa źródła prawdy dla tej samej informacji. Wymiary zewnętrzne sauny też nie są nowym polem `technicalSpecs`: reużywają istniejące, ogólne pole `Project.externalDimensions`, tak jak robi to dziś rodzina dom.

Piec (typ, moc, marka), kolor impregnacji i panele podczerwieni **nie są polami tego schematu**; żyją wyłącznie jako wiersze `product_option_group`/`product_option`, bo u Kory są potwierdzoną, płatną opcją dobieraną osobno od ceny bazowej. U Wooden Dream House piec w ogóle nie jest wyszczególniony w standardzie (patrz `rationale.md`, tabela dowodów), więc to założenie jest dziś potwierdzone tylko dla jednego z dwóch producentów referencyjnych, nie obu, patrz Consequences i Follow-up.

`getTechnicalSpecsSchema` dostaje nowy, czwarty parametr (opcjonalny w typach, bo nie dotyczy rodziny dom ani outdoor tv, ale wymagany w praktyce dla `spa-modulowe`, patrz niżej):

```ts
export function getTechnicalSpecsSchema(
  family: ProductFamily,
  status: "draft" | "published",
  containerSubcategory?: ContainerSubcategory,
  spaSubcategory?: SpaSubcategory,
): z.ZodTypeAny
```

Tak jak `containerSubcategory` jest dziś wymagany (rzuca błąd przy braku) dla `family === "kontenery-modulowe"`, `spaSubcategory` staje się wymagany dla `family === "spa-modulowe"`: brak tego parametru rzuca błąd zamiast po cichu zwracać jakikolwiek schemat. Nowa gałąź zwraca `saunaSpecsShape` (pełny przy `published`, częściowy przy `draft`) gdy `spaSubcategory === "sauna"`; dla `"jacuzzi"` i `"wellness-combo"` zwraca niezmieniony, dotychczasowy `spaModuloweSpecsShape`. To jedyna bezpieczna droga: parametr opcjonalny z cichym fallbackiem pozwoliłby jednemu zapomnianemu wywołaniu przepuścić saunę przez jacuzziowy schemat bez żadnego błędu kompilacji ani wykonania.

`resolveProductHref` dostaje nowy, opcjonalny piąty parametr:

```ts
export function resolveProductHref(
  family: ProductFamily,
  id: string,
  locale: string,
  slug?: string | null,
  spaSubcategory?: SpaSubcategory | null,
): string {
  const segment =
    family === "outdoor-tv" ? "outdoor-tv"
    : family === "spa-modulowe" && spaSubcategory === "sauna" ? "sauna"
    : "project";
  return `/${locale}/${segment}/${slug ?? id}`;
}
```

`spaSubcategory` zostaje opcjonalny w typach (reszta rodzin go nie ma), ale każde miejsce wywołujące tę funkcję dla produktu, który może być `spa-modulowe` (lista wyników, ulubione, tabela porównania, podgląd producenta i admina, canoniczny adres i dane strukturalne strony, mapa strony) musi odczytać tę wartość wprost z rekordu produktu, nigdy jej nie zgadywać ani nie zostawiać pominiętej z wygody. Build plan, zadanie 3, wymienia dokładną listę miejsc do przejrzenia; każde pominięte miejsce po cichu linkuje saunę pod `/project/...` zamiast `/sauna/...`, co nie jest błędem kompilacji ani wykonania, tylko cichym złym linkiem, więc zadanie 3 kończy się przeglądem wszystkich wywołań `resolveProductHref` w repozytorium, nie tylko listy wymienionej tutaj.

**Przejścia stanu**: bez zmian względem pozostałych rodzin. Szkic dopuszcza częściowy `saunaSpecsShape`; publikacja wymaga pełnego, ścisłego schematu.

**Powierzchnia interfejsu**:

| Element | Rodzaj | Kluczowe wejście | Kluczowe wyjście | Dostęp | Kluczowe błędy |
|---|---|---|---|---|---|
| `/{locale}/sauna/{slugOrId}` | strona serwerowa (odczyt) | `slug` lub `id` w adresie | pełna strona produktu, albo 404 | publiczny, bez logowania | 404 gdy produkt nie istnieje LUB istnieje ale nie jest `spa-modulowe`/`sauna` (AC-11); `robots: noindex` dla statusu szkic |
| `getTechnicalSpecsSchema(...)` | funkcja wewnętrzna | `family`, `status`, `containerSubcategory?`, `spaSubcategory?` | schemat Zod | wywołanie wewnętrzne | rzuca błąd gdy `family` wymaga podkategorii (`kontenery-modulowe` lub `spa-modulowe`) a jej brak, albo gdy `family === "outdoor-tv"` (bez schematu, bez zmian względem dziś) |
| `resolveProductHref(...)` | funkcja wewnętrzna | `family`, `id`, `locale`, `slug?`, `spaSubcategory?` | ścieżka produktu | wywołanie wewnętrzne | brak (funkcja czysta, zawsze zwraca ścieżkę); poprawność zależy od wywołującego, patrz niezmiennik niżej |

Brak nowych mutacji ani nowych endpointów API: dane sauny wchodzą wyłącznie przez ręczny zapis Neon MCP (patrz AC-10 i Build plan, zadanie 10), tym samym wzorcem co dzisiejszy outdoor tv.

**Kluczowe niezmienniki**:
- Pole opisujące piec nigdy nie żyje w `technicalSpecs`; zawsze w `product_option_group`/`product_option`.
- `resolveProductHref` jest jedynym miejscem liczącym segment adresu produktu; żadne inne miejsce nie składa ścieżki ręcznie. Ponieważ adres zależy od `spaSubcategory`, czyli pola, które producent może kiedyś zmienić, zmiana podkategorii produktu przenosi jego adres; to świadomie akceptowane (ten sam mechanizm co zmiana sluga, spec 0058).
- Dopóki `getSpaSubcategoryOptions` w kreatorze producenta oferuje "sauna", `TECHNICAL_FIELDS_BY_FAMILY` musi być rozszerzone o rozróżnienie według podkategorii; dopóki tak się nie stanie, "sauna" zostaje ukryta w selektorze (AC-10).
- `/sauna/[slug]`, `/project/[slug]` i `/outdoor-tv/[slug]` każda sprawdza, czy produkt pod danym `id`/`slug` naprawdę należy do jej rodziny i podkategorii, zanim go wyrenderuje; w przeciwnym razie zwraca 404 (AC-11), zamiast milcząco renderować cudzy produkt pod złym adresem.

**Model bezpieczeństwa**: bez nowych ról i bez danych wrażliwych. Strona publiczna, bez logowania. Produkt w statusie szkic renderuje się pod tym samym adresem co opublikowany (widoczny dla kogoś z linkiem, na przykład producentowi sprawdzającemu podgląd), ale z nagłówkiem `robots: noindex`, więc wyszukiwarki go nie indeksują; to nie jest blokada dostępu, tylko blokada indeksowania, dokładnie ten sam wzorzec co `/project/[slug]` i `/outdoor-tv/[slug]` dziś.

**Konfiguracja**: brak nowych zmiennych środowiskowych i brak nowych poświadczeń.

**Kluczowe scenariusze testowe**:
- Happy path: opublikowany produkt sauny z wypełnionymi opcjami renderuje hero, konfigurator opcji zaraz po nim, specyfikację techniczną i sekcję logistyki, weryfikuje **AC-1, AC-4, AC-6, AC-7**.
- Schemat: zapis produktu `spa-modulowe`/`sauna` z polem spoza `saunaSpecsShape` (np. `waterVolumeLiters`) zostaje odrzucony; zapis bez `spaSubcategory` dla `spa-modulowe` rzuca błąd zamiast cicho przejść, weryfikuje **AC-2**.
- Przypadek brzegowy: produkt bez żadnej grupy opcji nie pokazuje pustej sekcji konfiguratora, tylko ją pomija, weryfikuje **AC-4**.
- Układ strony: strona sauny nie zawiera w DOM żadnego z czterech wygaszonych bloków (układ pomieszczeń, cena i zakres, harmonogram, B2B), nie tylko wizualnie ukrytych, weryfikuje **AC-5**.
- Regresja: istniejąca strona `/outdoor-tv/[slug]` po promocji komponentów wideo i cech daje identyczny zrzut E2E (Playwright, spec 0056 scenariuszy) jak przed zmianą, weryfikuje **AC-8**.
- Regresja: `resolveProductHref` zwraca te same adresy co dziś dla produktów domu, kontenerów i outdoor tv po dodaniu piątego parametru, weryfikuje **AC-3**.
- Wzajemna izolacja tras: żądanie `/sauna/[id-domu]` i żądanie `/project/[id-sauny]` obie zwracają 404, weryfikuje **AC-11**.
- Kreator producenta: selektor podkategorii rodziny `spa-modulowe` nie pokazuje dziś opcji "sauna", weryfikuje **AC-10**.
- Widoczność: produkt sauny w statusie szkic renderuje się pod swoim adresem (dostępny z bezpośredniego linku) ale z nagłówkiem `robots: noindex`, weryfikuje **AC-9**.

## Build plan

1. Dodać `saunaSpecsShape` (pełny i częściowy) w `lib/product-technical-specs.ts`, rozszerzyć `getTechnicalSpecsSchema` o parametr `spaSubcategory`, wymagany dla `family === "spa-modulowe"` (rzuca błąd przy braku, tak jak dziś `containerSubcategory`), satisfies **AC-2**
2. Ukryć "sauna" w `getSpaSubcategoryOptions` kreatora producenta, dopóki pola techniczne kreatora nie rozróżniają podkategorii spa, satisfies **AC-10**
3. Rozszerzyć `resolveProductHref` o parametr `spaSubcategory` i przejrzeć KAŻDE wywołanie tej funkcji w repozytorium (nie tylko listę ze specu: także canoniczny adres i dane strukturalne strony produktu, mapę strony, jeśli istnieje), tak żeby każde przekazywało wartość odczytaną z rekordu produktu, satisfies **AC-3**
4. Dodać strażnika rodziny i podkategorii na wszystkich trzech trasach produktu (`/sauna/[slug]` odrzuca produkt inny niż `spa-modulowe`/`sauna`; `/project/[slug]` i `/outdoor-tv/[slug]` odrzucają produkt `spa-modulowe`/`sauna`), każda zwraca 404 przy niezgodności, satisfies **AC-11**
5. Zbudować trasę `app/[locale]/(customer)/sauna/[slug]/page.tsx`: hero (reużyte `ProjectGalleryCarousel`/`Cover`/`Thumbnails`, `ProjectVariantPicker`/`Select` z `completionStandard = "katalogowy"`, widoczny tylko gdy produkt ma więcej niż jeden wiersz wariantu, ten sam generyczny warunek co dziś) i sekcję płatnych opcji (`ProjectOptionsConfigurator`, bez zmian) zaraz po hero, satisfies **AC-1, AC-4**
6. Przenieść `OutdoorTvVideoSection` i `OutdoorTvFeatures` do wspólnych komponentów (np. `ProjectVideoSection`, `ProjectFeatureTiles`) w `components/klient/`, zaktualizować `/outdoor-tv/[slug]` tak, żeby korzystał z nowej, wspólnej lokalizacji; potwierdzić brak zmiany zachowania zrzutem E2E przed i po, satisfies **AC-8**
7. Zbudować nowy komponent specyfikacji technicznej sauny (tłumaczone etykiety, wzorowany na `ProjectTechnicalSpecs.tsx`) na bazie `saunaSpecsShape`, satisfies **AC-7**
8. Wpiąć w nową trasę reużyte bez zmian: `ProjectLogistics` (działka i logistyka, czytająca `Project.foundationOptions`/`externalDimensions` już istniejące na produkcie), `ProjectDocumentsAndFaq` (dokumenty i FAQ), sekcję partnera producenta; świadomie pominąć układ pomieszczeń, tabelę cena i zakres, harmonogram i zapytanie B2B, satisfies **AC-5, AC-6**
9. Dodać `robots: noindex` dla statusu szkic i fallback na `id`, gdy slug jeszcze nie istnieje, tym samym wzorcem co pozostałe strony produktu, satisfies **AC-9**
10. Ręcznie wpisać przez Neon MCP, najpierw na `modularhub-dev`, dwa pierwsze realne produkty (Kora Relax 550, Wooden Dream House Qube) jako osobne produkty; dopiero po potwierdzeniu poprawności na dev, powtórzyć zapis na prod (`modularhub`), zgodnie z istniejącym podziałem środowisk. To nie jest weryfikowalny test automatyczny, tylko ręczna próba generalna całej strony na realnych danych.

## Consequences

**Pozytywne**:
- Poprawny, niejacuzziowy model danych i poprawny model cenowy (opcje zamiast standardu wykończenia) od pierwszego realnego produktu sauny.
- Promocja komponentów wideo i cech do wspólnego użytku spłaca część kosztu nowej trasy już teraz, nie dopiero przy trzeciej podobnej podkategorii.
- Zero ryzyka regresji dla domu, kontenerów i outdoor tv: zmiana jest czysto addytywna, bez migracji bazy danych.

**Negatywne i kompromisy**:
- Powstaje trzecie, osobne drzewo komponentów strony produktu (dom, outdoor tv, sauna); każda przyszła, przekrojowa zmiana strony produktu (na przykład kolejny mechanizm jak spec 0059) będzie wymagać wpięcia w trzy miejsca, nie jedno.
- `resolveProductHref` i `getTechnicalSpecsSchema` rosną o kolejny parametr każda; każde miejsce je wywołujące trzeba było przejrzeć i część zaktualizować, a pominięcie jednego miejsca jest cichym złym linkiem, nie błędem kompilacji (złagodzone, ale nie wyeliminowane, przez wymaganie parametru w `getTechnicalSpecsSchema`, patrz AC-2).
- Schemat `saunaSpecsShape` jest dziś oparty wyłącznie na dwóch publicznych stronach producentów, nie na realnym wdrożeniu, więc może wymagać korekty po faktycznym onboardingu.
- Założenie "piec zawsze jako opcja, nigdy w cenie bazowej" jest dziś potwierdzone wprost tylko dla Kory; dane Wooden Dream House po prostu nie wyszczególniają pieca w standardzie, co nie jest tym samym co potwierdzenie tego samego mechanizmu. Jeśli WDH okaże się mieć piec wliczony w cenę, ich produkt po prostu nie dostanie grupy opcji "Piec" (co `ProjectOptionsConfigurator` już dziś obsługuje), ale cena bazowa bez żadnego pieca do wyboru byłaby myląca, patrz Follow-up.
- Nie zweryfikowano, czy mechanizm `product_option_group` ze spec 0059 wspiera grupę obowiązkową (klient musi coś wybrać, żeby produkt miał sens, np. piec); jeśli nie wspiera, cena "od" pokazywana bez pieca może wprowadzać w błąd.

**Neutralne**:
- Jacuzzi i wellness combo zostają całkowicie nietknięte, nadal na starym, jacuzziowym schemacie, bez własnej strony; to świadomie odłożona decyzja, nie przeoczenie.
- Sauna nie ma dziś samoobsługowego kreatora producenta; każdy produkt wchodzi ręcznie przez Neon MCP, tym samym wzorcem co outdoor tv.
- Wyszukiwanie, filtr rodziny i hero "więcej niż dom" (spec 0060) nie wymagają żadnej zmiany: iterują `FAMILY_GROUPS` programowo na poziomie rodziny, nie podkategorii, więc sauna pojawi się w nich automatycznie, gdy tylko `resolveProductHref` poprawnie zbuduje jej link (AC-3). Czy sauna powinna w ogóle pojawiać się w tabeli porównania domów (dziś porównującej standardy wykończenia i cost line items, których sauna nie ma) pozostaje otwarte, patrz Follow-up.

## Follow-up

- [ ] Zdecydować o stronie produktu dla jacuzzi i wellness combo dopiero, gdy pojawi się dla któregoś z nich realny producent; nie projektować ich z wyprzedzeniem.
- [ ] Rozszerzyć `TECHNICAL_FIELDS_BY_FAMILY` w kreatorze producenta o rozróżnienie według `spaSubcategory`, żeby "sauna" mogła wrócić do selektora kreatora.
- [ ] Rozważyć bespoke skill do pozyskiwania i odświeżania danych Kory i Wooden Dream House (wzorem `.claude/skills/scrape-steel-house/`), jeśli wpisywanie ich danych stanie się powtarzalnym zadaniem, a nie jednorazowym wpisem.
- [ ] Po faktycznym onboardingu Kory lub Wooden Dream House jako producenta, zweryfikować `saunaSpecsShape` względem ich prawdziwych danych, zanim dołączy trzeci, inny producent sauny.
- [ ] Potwierdzić przed zadaniem 5 Build planu, czy `product_option_group` wspiera dziś grupę obowiązkową (klient musi wybrać jedną opcję); jeśli nie, zdecydować jak pokazywać cenę bazową dla produktu, który bez wybranego pieca nie jest funkcjonalną sauną.
- [ ] Zdecydować, czy produkt sauny w ogóle powinien być dodawalny do istniejącej tabeli porównania domów (dziś porównuje standardy wykończenia i cost line items, których sauna nie ma); do czasu tej decyzji nie zakładać, że działa poprawnie bez dodatkowego sprawdzenia.
- [ ] Rozważyć wspólny szablon katalogowy dla outdoor tv i sauny razem (patrz Opcja 4 w `rationale.md`), jeśli pojawi się trzecia podobna podkategoria katalogowa i koszt trzeciego osobnego drzewa komponentów przestanie się opłacać.
