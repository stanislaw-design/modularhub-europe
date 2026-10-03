---
name: product-family-page-design
description: Drzewo decyzyjne do projektowania strony szczegółów produktu (`/project/[slug]`-style) dla nowej lub istotnie innej rodziny/podkategorii produktu w ModularHub Europe (dom, spa-modulowe, kontenery-modulowe, outdoor-tv i każda kolejna "więcej niż dom"). Rozstrzyga: reuse `/project/[slug]` vs dedykowana trasa (wzorzec `/outdoor-tv/[slug]`), Zod technicalSpecs schema vs generyczna jsonb bridge-table, które house-shaped sekcje (układ domu, cena i zakres, harmonogram, działka, B2B bulk) mają sens, czy `completionStandard` niesie znaczenie czy jest pustym slotem `"katalogowy"`, czy dotyczy `ProjectOptionsConfigurator` (płatne opcje), jaki poziom samoobsługi producenta. Nie pisze kodu ani spec plików — zbiera odpowiedzi i przekazuje je do `/architect`. Użyj przy: "jak zaprojektować stronę dla [nowy produkt]", "nowa rodzina produktu", "strona dla outdoor-tv/kontenerów/spa/[cokolwiek nowego]", "jak zrobić wariant strony dla innego typu produktu", dodawaniu nowej podkategorii z innym kształtem danych. NIE używaj do: kosmetycznych zmian copy/stylów na istniejącej stronie rodziny, zmian w `/results` filtrach czy hero (to `docs/specs/0060-*`/SearchCard, inny warstwa), zmian niezwiązanych ze strukturą strony produktu (panel producenta, panel admina).
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Skill
---

# Projektowanie strony rodziny produktu — ModularHub Europe

## Kontekst (ustalony raz, nie odkrywaj na nowo)

Wszystko jest jednym typem `Project`/tabelą `product` (`lib/db/schema.ts`), odróżnianym przez
`family: "dom" | "spa-modulowe" | "kontenery-modulowe" | "outdoor-tv"` (`lib/data/types.ts`).
Historia: `dom` jedyny → `+spa-modulowe` → `pergola` (0 wierszy, zbudowana hipotetycznie) zastąpiona
`kontenery-modulowe` z 3 podkategoriami → `+outdoor-tv` (spec 0056, partner-reseller). Każda kolejna
rodzina/podkategoria powtarza ten sam zestaw decyzji — dziś rozstrzygnięty tylko dwa razy, ad hoc, w
kodzie i w spec 0056's "Decyzje"/"Konsekwencje", nigdzie indziej spisany. Ten skill to spisanie.

Dwa istniejące precedensy, żadnego trzeciego:

- **`dom`** (i dziś też de facto fallback dla `kontenery-modulowe`) →
  `app/[locale]/(customer)/project/[slug]/page.tsx`. Pełny szablon: zakładkowa galeria, sticky price
  bar, wszystkie house-shaped sekcje (układ domu, cena i zakres/cost-comparison, harmonogram, działka,
  B2B bulk inquiry), `ProjectOptionsConfigurator` (spec 0059). Sekcje bez sensu dla danej
  rodziny/podkategorii są świadomie wygaszane przez `hasXSection` flagi w JSX (nie przez config),
  per `page.tsx:244-261`.
- **`outdoor-tv`** → dedykowana trasa `app/[locale]/(customer)/outdoor-tv/[slug]/page.tsx`, zbudowana
  od zera dla spec 0056 bo "strona domu z wyłączonymi sekcjami" została odrzucona jako zły kształt.
  Inna galeria (carousel+cover+thumbnails, nie zakładki), zero house-shaped sekcji, własny
  `OutdoorTvTechnicalSpecs` (generyczna tabela jsonb zamiast Zod).

Spec 0056's "Konsekwencje" wprost mówi: trzecia rodzina w kształcie "catalog-style" reużywa wzorzec
dedykowanej trasy; rodzina niepasująca do żadnego z dwóch wymaga nowej, ręcznej decyzji — to zdanie
jest punktem zaczepienia tego skilla.

## Kiedy odpalić

Przy projektowaniu lub budowie strony szczegółów produktu dla nowej rodziny/podkategorii, albo gdy
istniejąca rodzina dostaje istotnie inny kształt danych (np. pierwszy realny produkt bez
`costLineItems`/wariantów finish-level). Nie przy kosmetyce istniejącej strony ani zmianach poza
warstwą strony produktu.

## Krok 0 — Zbierz realny kontekst, nie zgaduj

Przeczytaj równolegle:
- `lib/data/types.ts` (`ProductFamily`, `Project`, `ProjectVariant`, `CompletionStandard`)
- `lib/product-technical-specs.ts` (`getTechnicalSpecsSchema` — dispatcher Zod per rodzina/podkategoria)
- `lib/product-family-groups.ts` (`FAMILY_GROUPS`, `resolveProductHref`)
- oba precedensy: `app/[locale]/(customer)/project/[slug]/page.tsx` i
  `app/[locale]/(customer)/outdoor-tv/[slug]/page.tsx`
- jeśli rodzina/podkategoria ma już choć jeden realny wiersz producenta w bazie — sprawdź go przez
  Neon MCP (`run_sql`/`describe_table_schema`), nie tylko przez kod. Realne dane obalają założenia
  szybciej niż czytanie schematu.

Jeśli zero wierszy producenta istnieje dla tej rodziny — zasygnalizuj to wprost jako ryzyko w swojej
odpowiedzi do użytkownika. `pergola` została zbudowana hipotetycznie z 0 realnych wierszy i musiała
zostać zastąpiona. Gdzie to możliwe, zalecaj poczekanie na choć jeden realny produkt przed
zamknięciem Zod schema (oś 1a niżej) — łatwiej rozluźnić zbyt wczesny `.strict()` niż odgadnąć go
od zera.

## Krok 1 — Siedem osi decyzyjnych

Dla każdej osi: zapisz odpowiedź + jednozdaniowe uzasadnienie oparte na realnych danych z Kroku 0,
nie na domysłach. Jeśli odpowiedź jest niejasna, użyj `AskUserQuestion` zamiast zgadywać — to są
decyzje load-bearing, błąd tutaj kosztuje przebudowę całej strony.

**a. technicalSpecs: Zod schema czy generyczna jsonb bridge-table?**
Wzorzec `dom`/`spa-modulowe`/`kontenery-modulowe` (`.strict()` Zod + ręcznie zbudowany komponent z
tłumaczonymi enumami, wzorzec `ProjectTechnicalSpecs.tsx`) vs wzorzec `outdoor-tv`
(`OutdoorTvTechnicalSpecs.tsx` — generyczna tabela label/value z surowego `Project.technicalSpecs`
jsonb, zero walidacji). Zależy od: czy wartości pól mają zamknięty, stabilny zestaw enumów, i czy
rodzina dostanie samoobsługowy wizard producenta (oś f) — bez wizarda ścisły Zod ma mniej sensu, bo
dane i tak wchodzą ręcznie przez Neon MCP.

**b. Szablon strony: reuse `/project/[slug]` czy dedykowana trasa?**
Reuse = dziedziczysz zakładkową galerię, `ProjectVariantPicker`, `ProjectStickyPriceBar`, i WSZYSTKIE
house-shaped sekcje, które trzeba będzie świadomie wygasić przez `hasXSection`. Dedykowana trasa =
zero dziedziczenia, każda sekcja budowana od zera (droższe teraz, czystsze później). Rozstrzygnij po
przejrzeniu osi (c)-(e) — jeśli większość house-shaped sekcji ma sens, reuse; jeśli prawie żadna
(jak `outdoor-tv`), dedykowana trasa.

**c. Które house-shaped sekcje mają realny sens?**
Dla każdej z: układ domu/room layout, cena i zakres/cost-comparison table, harmonogram/timeline,
działka/logistics, B2B bulk inquiry — odpowiedz tak/nie/jeszcze nie wiadomo. Zasada z kodu: placeholder
nie ma sensu dla danych, które nigdy się nie pojawią dla tej rodziny (`kontenery-modulowe` świadomie
wygasza `ProjectRoomLayout` mimo że komponent sam w sobie obsłużyłby pusty stan — `page.tsx:253-258`).
"Jeszcze nie wiadomo" jest legalną odpowiedzią przy zerowych realnych danych (patrz Krok 0) — nie
zgaduj na siłę.

**d. `completionStandard`: realne znaczenie czy pusty `"katalogowy"` slot?**
Jeśli produkty tej rodziny różnią się czymś innym niż poziom wykończenia (np. rozmiar ekranu,
rozmiar kontenera) i nie ma zamkniętego enumu wartości — to `"katalogowy"`, z prawdziwą tożsamością
wariantu w wolnotekstowym `variantLabel`. Konsekwencja: unique index `product_variant_product_standard_unique`
świadomie wyłącza `'katalogowy'`, więc wiele wariantów może dzielić tę samą wartość enum — każdy UI
wyboru wariantu i każdy link budowany dla tej rodziny MUSI kluczować po `variant.id`, nigdy po
`completionStandard` (patrz komentarze `ProjectVariantPicker.tsx:29-35`).

**e. `ProjectOptionsConfigurator` (płatne opcje, spec 0059) — dotyczy?**
To cecha przekrojowa, dziś podłączona tylko do `/project/[slug]`, włączana przez obecność realnych
`optionGroups` dla produktu, nie przez `family` wprost. Jeśli rodzina ma realne płatne dopłaty
(okna, ogrzewanie, akcesoria) powtarzające się między produktami jednego producenta — tak.

**f. Poziom samoobsługi producenta.**
Pełny wizard (`dom`) / częściowy wizard (`spa-modulowe`, `kontenery-modulowe`, patrz
`lib/producer-project-draft.ts`) / wyłącznie ręczny wpis przez Neon MCP (`outdoor-tv`, bo partner
"nigdy nie użyje" samoobsługi). To ogranicza, ile sensu ma zamykanie ścisłego Zod schema teraz
(oś a) — bez wizarda dane i tak wchodzą ręcznie, walidacja chroni głównie przed literówką operatora,
nie przed błędem formularza.

**g. `resolveProductHref` (`lib/product-family-groups.ts`).**
MUSI zostać zaktualizowany niezależnie od odpowiedzi na (b) — to jedyne miejsce, przez które
przechodzą wszystkie linki do strony produktu (wyniki, ulubione, tabela porównania, podgląd
producenta/admina, spec 0056 AC-5). Pomiń to i linki do nowej rodziny będą prowadzić donikąd albo
na zły szablon.

## Krok 2 — Przekaż do /architect, nie buduj od razu

Siedem odpowiedzi z Kroku 1 to nieudokumentowana, architektoniczna decyzja w rozumieniu AGENTS.md —
dokładnie to, co `/architect` ma rozstrzygać i spisywać jako nowy spec w `docs/specs/`. Uruchom
`/architect`, przekazując mu gotowe odpowiedzi z Kroku 1 jako materiał wejściowy (oszczędza mu
odkrywania tego samego kontekstu od zera — to jest sens tego skilla). `/architect` pisze spec;
dopiero zatwierdzony spec idzie do `/develop`. Ten skill sam nigdy nie pisze plików w `docs/specs/`
ani kodu strony.

## Krok 3 — Po zbudowaniu

Zaktualizuj `components/klient/AGENTS.md` jeśli nowa rodzina dostała nowy folder/komponenty — dziś
ten plik nie wspomina `outdoor-tv/` wcale (już oznaczone jako nieaktualne). Rozważ `/sync`.

## Referencje (nie czytaj w całości za każdym razem)

- Precedens 1 — dom: `app/[locale]/(customer)/project/[slug]/page.tsx`
- Precedens 2 — outdoor-tv: `app/[locale]/(customer)/outdoor-tv/[slug]/page.tsx`
- Model danych: `lib/data/types.ts`, `lib/db/schema.ts`, `lib/product-technical-specs.ts`,
  `lib/product-family-groups.ts`
- `docs/specs/0056-*` — pierwszy precedens dedykowanej trasy (outdoor-tv), sekcja "Konsekwencje"
  mówi wprost o trzeciej rodzinie
- `docs/specs/0059-platne-opcje-konfiguratora-katalogowego` — opcje, `"katalogowy"` slot
- `docs/specs/0060-podkategorie-wiecej-niz-dom-hero` — dyskryminacja na poziomie discovery/hero,
  inna warstwa niż strona produktu, ale pokazuje wzorzec `FAMILY_GROUPS` jako single source of truth
