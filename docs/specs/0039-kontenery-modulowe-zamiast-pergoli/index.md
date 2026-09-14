# 0039. Kontenery modułowe zamiast pergoli

**Date**: 2026-09-14
**Status**: In Progress

## Summary

Ta decyzja usuwa rodzinę produktu "pergola" i zastępuje ją rodziną "kontenery modułowe" (kontenery-modulowe), z trzema podkategoriami: gastronomiczne, usługowe, mieszkalne. Te trzy zastosowania różnią się na tyle realnie (kuchnia kontenerowa, punkt usługowy, moduł mieszkalny), że każda podkategoria dostaje własny zestaw pól technicznych w kreatorze producenta, zamiast jednego wspólnego zestawu na całą rodzinę jak dziś. W bazie danych nie ma dziś ani jednego produktu rodziny pergola, więc usunięcie jest bezpieczne i nie wymaga migracji danych, tylko migracji schematu.

## Requirements

**User stories**:
- Jako odwiedzający wyszukiwanie, chcę widzieć rodzinę "Kontenery modułowe" zamiast "Pergole" w grupie "Więcej niż dom", z podziałem na gastronomiczne / usługowe / mieszkalne, żeby znaleźć kontener pasujący do mojego zastosowania.
- Jako producent, chcę wybrać podkategorię kontenera i wypełnić w kreatorze tylko pola techniczne pasujące do tej podkategorii (np. wyciąg kuchenny dla gastronomicznego, a nie dla mieszkalnego), zamiast jednego ogólnego formularza dla całej rodziny.
- Jako inżynier rozwijający produkt później, chcę żeby usunięcie rodziny pergola nie zostawiło martwej wartości enum ani nieużywanego kodu, które mogłyby kogoś zmylić.

**Acceptance criteria** (kontrakt, każde kryterium niezależnie sprawdzalne):
- **AC-1**: `product.family` (Postgres enum) ma dokładnie wartości `dom` / `spa-modulowe` / `kontenery-modulowe`; wartość `pergola` nie istnieje już w typie (pełna przebudowa typu enum, nie tylko dopisanie nowej wartości obok starej).
- **AC-2**: Kolumna `product.containerSubcategory` (nowy enum `gastronomiczne` / `uslugowe` / `mieszkalne`) zastępuje dzisiejszą `pergolaSubcategory`; stara kolumna i jej enum znikają z bazy.
- **AC-3**: Ograniczenie `CHECK` (`product_family_subcategory_match`) pilnuje, że `containerSubcategory` jest niepuste tylko dla `family = 'kontenery-modulowe'`, dokładnie tak samo jak dziś pilnuje `category`/`spaSubcategory` dla swoich rodzin (spec 0022 AC-2).
- **AC-4**: `technicalSpecs` dla `family = 'kontenery-modulowe'` ma trzy różne, rozłączne kształty Zod, wybierane razem przez (family, containerSubcategory), nie tylko przez family jak dziś dla pozostałych rodzin: gastronomiczne (dimensions, structureMaterial, insulationType, foundationType, kitchenEquipmentType, extractionVentilation, electricalPower, waterSupplyType, wasteWaterHandling), uslugowe (dimensions, structureMaterial, insulationType, foundationType, intendedUse, electricalInstallation, spaceHeatingType), mieszkalne (dimensions, structureMaterial, insulationType, foundationType, sleepingCapacity, bathroomIncluded, spaceHeatingType, waterSupplyType, wasteWaterHandling, electricalInstallation). Każdy schemat jest `.strict()` i wymagany w całości dopiero od `status = 'published'`, tak jak dziś (spec 0022 AC-4).
- **AC-5**: Krok 1 kreatora producenta pozwala wybrać rodzinę `kontenery-modulowe` i jedną z trzech podkategorii; krok "Dane techniczne" pokazuje wyłącznie pola pasujące do wybranej podkategorii (nie do całej rodziny), analogicznie do dzisiejszego jednego kroku technicznego zależnego od rodziny (spec 0022 AC-6).
- **AC-6**: Wyszukiwanie klienta (`SearchCard`, `FamilyTabs`, grupa "Więcej niż dom" ze spec 0035) pokazuje "Kontenery modułowe" w miejscu dzisiejszej "Pergole"; na `/wyniki?family=kontenery-modulowe`, `SubcategoryFilterBar` pokazuje trzy chipy podkategorii (gastronomiczne / usługowe / mieszkalne) zamiast dawnych czterech chipów pergoli.
- **AC-7**: `FAMILY_GROUPS["wiecej-niz-dom"]` (spec 0035) staje się `["spa-modulowe", "kontenery-modulowe"]`; grupowanie w hero i na wynikach działa identycznie jak dziś, tylko z podmienioną rodziną.
- **AC-8**: Istniejące lub zakładkowane linki z dzisiejszymi wartościami (`/wyniki?family=pergola`, `?pergolaSubcategory=...`) łagodnie spadają na dzisiejsze wartości domyślne, dokładnie tak jak każda inna nieznana wartość filtra dziś (spec 0004 AC-5/AC-6, spec 0035 AC-7) — bez przekierowań i bez specjalnej obsługi zgodności wstecznej.
- **AC-9**: Migracja bazy jest bezpieczna bez przekształcania danych na żywo — w tabeli `product` jest dziś 0 wierszy `family = 'pergola'`, i żaden wiersz `project_request.families` (jsonb, druga, niezależna od enuma powierzchnia niosąca wartości `ProductFamily`, spec 0037) nie zawiera dziś `"pergola"` (oba sprawdzone bezpośrednio w produkcyjnej bazie Neon 2026-09-14) — i zweryfikowana na tymczasowej gałęzi Neon przed uruchomieniem na produkcji.
- **AC-10**: Zmiana działa we wszystkich trzech dzisiejszych wersjach językowych (pl, en, nl), bez brakujących kluczy tłumaczeń (spec 0035 AC-8, ten sam wzorzec).

## Options considered

Patrz [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 1 z [rationale.md](rationale.md): bezpośrednie zastąpienie (direct replace) rodziny pergola rodziną kontenery-modulowe, z trzema własnymi kształtami danych technicznych per podkategoria.

Rodzina `pergola` znika całkowicie (enum, kolumna podkategorii, pola technicznego, UI, tłumaczenia), zastępuje ją `kontenery-modulowe` z trzema podkategoriami (gastronomiczne, uslugowe, mieszkalne), z których każda ma własny, w pełni typowany kształt Zod dla `technicalSpecs` — pierwszy w tym kodzie przypadek, gdzie o kształcie danych technicznych decyduje subcategory, nie tylko family.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `adversarial-zod` (`pproenca/dot-skills`, `.agents/skills/adversarial-zod/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`)

## Rationale

Uzasadnienie i rozważone opcje: [rationale.md](rationale.md).

## Feature design

**Data model sketch** (zmiany w `product`, `lib/db/schema.ts`):

| Pole | Dziś | Po zmianie |
|---|---|---|
| `family` | `pgEnum('product_family', ['dom','spa-modulowe','pergola'])` | `pgEnum('product_family', ['dom','spa-modulowe','kontenery-modulowe'])` — pełna przebudowa typu (Postgres nie ma `DROP VALUE`), nie dopisanie wartości obok starej |
| `pergolaSubcategory` | `pgEnum('pergola_subcategory', [4 wartości])`, kolumna `pergola_subcategory` | usunięte całkowicie (kolumna + typ) |
| `containerSubcategory` | brak | nowe: `pgEnum('container_subcategory', ['gastronomiczne','uslugowe','mieszkalne'])`, nullable kolumna `container_subcategory`, znacząca tylko gdy `family = 'kontenery-modulowe'` |
| `technicalSpecs` | jeden kształt Zod per family | dla `kontenery-modulowe`: trzy kształty Zod, jeden per `containerSubcategory` (patrz AC-4) |

**Ograniczenie CHECK** (`product_family_subcategory_match`, zastępuje dzisiejszą wersję z spec 0022):
```sql
CHECK (
  (category IS NULL OR family = 'dom') AND
  (spa_subcategory IS NULL OR family = 'spa-modulowe') AND
  (container_subcategory IS NULL OR family = 'kontenery-modulowe')
)
```

**`lib/product-technical-specs.ts`**: `getTechnicalSpecsSchema` przyjmuje dodatkowo `containerSubcategory` (wymagany, gdy `family = 'kontenery-modulowe'`, ignorowany dla pozostałych rodzin). Trzy nowe kształty (`.strict()`, pełne od `status = 'published'`, `.partial()` dla `draft`, dokładnie ten sam wzorzec co dziś dla dom/spa-modulowe/pergola):
- `gastronomiczne`: `dimensions`, `structureMaterial`, `insulationType`, `foundationType`, `kitchenEquipmentType`, `extractionVentilation` (wyciąg), `electricalPower`, `waterSupplyType`, `wasteWaterHandling` — wszystkie `z.string()`.
- `uslugowe`: `dimensions`, `structureMaterial`, `insulationType`, `foundationType`, `intendedUse`, `electricalInstallation`, `spaceHeatingType` — wszystkie `z.string()`.
- `mieszkalne`: `dimensions`, `structureMaterial`, `insulationType`, `foundationType`, `sleepingCapacity` (`z.number()`), `bathroomIncluded` (`z.boolean()`), `spaceHeatingType`, `waterSupplyType`, `wasteWaterHandling`, `electricalInstallation` — reszta `z.string()`.

Pole grzewcze nazwane `spaceHeatingType`, nie `heatingType`: `ProductTechnicalSpecsDraft` (`lib/data/types.ts`) jest jednym współdzielonym interfejsem kitchen-sink dla wszystkich rodzin naraz, a `heatingType` już istnieje tam dla `spa-modulowe` (typ ogrzewania wody, `"electric"|"heat-pump"|"wood-fired"`), inny typ niż potrzebny tu string. Ta sama nazwa dwóch różnych typów w jednym interfejsie by się nie skompilowała.

`bathroomIncluded` jest pierwszym w tym interfejsie polem typu `boolean` (dotąd `TechnicalFieldConfig.type` zna tylko `"text" | "number" | "select"`). Ta decyzja dodaje wariant `"boolean"` (pole wyboru tak/nie w kreatorze) do `TechnicalFieldConfig` i do `isTechnicalSpecsComplete` (`lib/producer-project-draft.ts`): pole typu `boolean` jest kompletne, gdy jego wartość to dokładnie `true` albo `false` (nie `undefined`), analogicznie do dzisiejszej reguły dla `"number"`.

Nazwy pól elektrycznych trzech nowych kształtów (`electricalPower`, `electricalInstallation`) różnią się celowo od istniejącego pola spa `electricalRequirement` — to trzy osobne, niekolidujące klucze w jednym współdzielonym interfejsie, nie synonimy do ujednolicenia teraz (patrz Follow-up).

**`lib/producer-project-draft.ts`**: `TECHNICAL_FIELDS_BY_FAMILY` (dziś `Record<ProductFamily, TechnicalFieldConfig[]>`) traci klucz `pergola`, zostaje `Record<"dom"|"spa-modulowe", TechnicalFieldConfig[]>`. Nowa mapa `CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY: Record<ContainerSubcategory, TechnicalFieldConfig[]>` (trzy zestawy pól z powyższego). Nowa funkcja `getTechnicalFieldsFor(family, containerSubcategory, t)` zastępuje dzisiejsze bezpośrednie `TECHNICAL_FIELDS_BY_FAMILY[family]`: dla `kontenery-modulowe` czyta z nowej mapy po `containerSubcategory` (pusta lista, gdy podkategoria jeszcze nie wybrana), dla pozostałych rodzin zachowuje się jak dziś. `isTechnicalSpecsComplete`/`isSubcategoryComplete`/`createEmptyDraft` używają tej funkcji i nowego pola `containerSubcategory` zamiast `pergolaSubcategory`.

**Klucze tłumaczeń** (`messages/{pl,en,nl}.json`, ten sam wzorzec co dziś): `family.kontenery-modulowe` (zastępuje `family.pergola`), `containerSubcategory.{gastronomiczne,uslugowe,mieszkalne}` (zastępuje `pergolaSubcategory.*`, 4 → 3 wartości), `containerSubcategoryLabel`, `containerAriaLabel` (zastępują `pergolaSubcategoryLabel`/`pergolaAriaLabel`), `teaserWordContainers` (zastępuje `teaserWordPergola`), `CategoryShowcase.containersName`/`containersDescription` (zastępują `pergolaName`/`pergolaDescription`), `technicalFields.kontenery-modulowe.{gastronomiczne|uslugowe|mieszkalne}.<pole>.{label,hint}` (zastępuje `technicalFields.pergola.*`, zagnieżdżone o jeden poziom głębiej niż dom/spa-modulowe, bo tu o kształcie decyduje subcategory).

**Ikona**: rodzina "Kontenery modułowe" dostaje ikonę `Container` (lucide-react, sylwetka kontenera), zamiast dzisiejszej ikony pergoli w `SearchCard`/`FamilyTabs`.

**Kluczowe niezmienniki**:
- `CHECK` (AC-3) pilnuje tylko jednego kierunku, dokładnie jak dziś dla `category`/`spaSubcategory` (spec 0022 AC-2): `containerSubcategory` niepuste ⇒ `family = 'kontenery-modulowe'`. Nie wymusza kierunku odwrotnego (`family = 'kontenery-modulowe'` ⇒ `containerSubcategory` niepuste) — to zostaje wymogiem aplikacji dopiero od `status = 'published'`, tak jak dziś (spec 0022 Feature design, Kluczowe niezmienniki).
- `getTechnicalSpecsSchema('kontenery-modulowe', status)` wymaga `containerSubcategory` jako argumentu dla tej rodziny i rzuca błąd w czasie działania, jeśli go zabraknie — nowy przypadek brzegowy, którego dzisiejsze `getTechnicalSpecsSchema` (gdzie tylko `family` decyduje o kształcie) nie miało. W praktyce nieosiągalne przez UI (krok techniczny kreatora nie renderuje się bez wybranej podkategorii, patrz niżej), ale strażnik czasu działania jest tańszy niż cichy zły kształt walidacji.
- `family` zostaje niezmienna po utworzeniu produktu (spec 0022 AC-7, bez zmian w tej decyzji).
- Krok "Dane techniczne" kreatora nie jest osiągalny/kompletny dopóki `containerSubcategory` nie jest wybrane dla `family = 'kontenery-modulowe'` — ten sam porządek co dziś (podkategoria zbierana w kroku 1, przed krokiem technicznym), tylko teraz podkategoria decyduje nie tylko o etykiecie, ale o tym, które pola w ogóle się pokazują.
- Nieznana lub dzisiejsza wartość `family`/`pergolaSubcategory` w URL nadal łagodnie pada na wartość domyślną (AC-8), bez wyjątku dla starych, nieaktualnych już wartości.

**Model bezpieczeństwa**: bez zmian względem dziś (spec 0022) — odczyt publiczny, zapis ograniczony do producenta będącego właścicielem produktu.

**Konfiguracja**: brak nowych zmiennych środowiskowych.

**Kluczowe scenariusze testowe** (każdy odwołuje się do kryterium z `## Requirements`):
- Happy path: producent wybiera `family = kontenery-modulowe` i podkategorię `gastronomiczne` w kroku 1, krok techniczny pokazuje dokładnie 9 pól gastronomicznych (nie 7 usługowych ani 10 mieszkalnych), po zapisie `containerSubcategory = 'gastronomiczne'`, `technicalSpecs` zgodne z kształtem gastronomicznym, weryfikuje **AC-4**, **AC-5**.
- Przypadek błędu: ręczny insert SQL ustawia `family = 'dom'` z niepustym `container_subcategory`, baza odrzuca wiersz przez `CHECK`, weryfikuje **AC-3**.
- Zgodność wsteczna: wejście na `/wyniki?family=pergola&pergolaSubcategory=drewniana` (stary, zakładkowy link) łagodnie pada na `family=dom` bez żadnych podkategorii aktywnych, weryfikuje **AC-8**.
- Wyszukiwanie: na `/wyniki?family=wiecej-niz-dom` widoczne są produkty `spa-modulowe` i `kontenery-modulowe` razem (nie `pergola`, bo już nie istnieje), weryfikuje **AC-6**, **AC-7**.
- Baza: po migracji, zapytanie do informacji o typie enum `product_family` w Postgresie nie zwraca już wartości `pergola`, weryfikuje **AC-1**.

## Build plan

Ten build siedzi na prawdziwym, produkcyjnym zapleczu (Neon Postgres, spec 0017/0022/0023) — tak jak spec 0022, migracja schematu idzie na początku, żeby każda kolejna warstwa (Zod, kreator, wyszukiwanie, tłumaczenia) od razu łączyła się z prawdziwym schematem, nie z czymś tymczasowym.

1. Migracja bazy, dwie fazy zgodnie z konwencją `lib/db/AGENTS.md` (dodawanie i usuwanie w tej samej tabeli w dwóch przebiegach, żeby ominąć prompt wykrywania rename w drizzle-kit). **Faza 1**, w tej kolejności (kolejność jest istotna: `CHECK` odwołujący się dziś do `'pergola'` musi zniknąć, zanim typ, który tę wartość niesie, zostanie przebudowany, inaczej przebudowa nie przejdzie walidacji istniejącego ograniczenia): (a) usuń `CHECK product_family_subcategory_match`; (b) przebuduj typ `product_family` (rename starego typu → create nowego z `dom`/`spa-modulowe`/`kontenery-modulowe` bez `pergola` → `ALTER COLUMN ... TYPE ... USING family::text::product_family` → drop starego typu); (c) dodaj enum i kolumnę `container_subcategory`; (d) dodaj z powrotem `CHECK product_family_subcategory_match`, już z nową definicją (patrz Feature design). **Faza 2** — usuń kolumnę `pergola_subcategory` i jej enum. Zweryfikuj obie fazy na tymczasowej gałęzi Neon (`create_branch`/`delete_branch`) przed `npm run db:migrate` na produkcji, tak jak dziś dla każdej ręcznie wzbogaconej migracji. satisfies **AC-1**, **AC-2**, **AC-3**, **AC-9**
2. `lib/product-technical-specs.ts`: dodaj `CONTAINER_SUBCATEGORIES`, trzy nowe kształty Zod (gastronomiczne/uslugowe/mieszkalne) i ich `.partial()` warianty na `draft`, zmień sygnaturę `getTechnicalSpecsSchema` na przyjmującą `containerSubcategory`. satisfies **AC-4**
3. `lib/data/types.ts`: `ProductFamily` bez `pergola`, z `kontenery-modulowe`; usuń `PergolaSubcategory`, dodaj `ContainerSubcategory`; zaktualizuj `ProductTechnicalSpecsDraft` (usuń pola pergoli, dodaj pola trzech podkategorii kontenerów z `spaceHeatingType` zamiast kolidującego `heatingType`); `ProjectDraft`/`SavedProduct`: `pergolaSubcategory` → `containerSubcategory`. satisfies **AC-2**, **AC-4**
4. `lib/product-family-groups.ts`: `FAMILY_GROUPS["wiecej-niz-dom"] = ["spa-modulowe", "kontenery-modulowe"]`. satisfies **AC-7**
5. `lib/results-filters.ts` i `lib/data/projects.ts`: `VALID_FAMILY_FILTER_VALUES`, nowy `VALID_CONTAINER_SUBCATEGORIES` (zastępuje `VALID_PERGOLA_SUBCATEGORIES`), `ResultsFilter.containerSubcategory` (zastępuje `pergolaSubcategory`), parsowanie/serializacja/toggle zaktualizowane; `getProjects()`'s gałąź `family === "pergola"` zmienia się na `family === "kontenery-modulowe"` z `eq(product.containerSubcategory, ...)`. Nieznane stare wartości spadają na domyślne bez dodatkowego kodu (mechanizm istniejącej walidacji to już robi). Dwa dalsze miejsca czytające dziś `product.pergolaSubcategory` po nazwie idą w tym samym kroku: `lib/db/queries.ts`'s `getProductFamilyCounts()` (wyrażenie `coalesce(category, spa_subcategory, pergola_subcategory)`) i `lib/producer-product-actions.ts` (zapis pola przy tworzeniu produktu). `lib/project-request-specs.ts` (`projectRequestFamiliesSchema`) i `components/klient/ProjectRequestFlow.tsx` (checkboxy rodzin zapytania B2B, spec 0037/0038) nie potrzebują zmian kodu — oba czytają generycznie z `PRODUCT_FAMILIES`/`family.${family}` już zaktualizowanych w kroku 2 i w tłumaczeniach (krok 9), ale zasługują na jawną weryfikację przy budowie, bo `project_request.families` to jsonb, nie kolumna enum: Postgres jej nie waliduje, więc żaden przyszły ręczny insert (Neon MCP) nie jest chroniony przed wpisaniem tam `"pergola"` (ten sam rodzaj luki co dziś dla `technicalSpecs`, spec 0022 Follow-up). satisfies **AC-6**, **AC-8**, **AC-9**
6. `lib/producer-project-draft.ts`: `getProductFamilyOptions` (pergola → kontenery-modulowe), nowy `getContainerSubcategoryOptions` (zastępuje `getPergolaSubcategoryOptions`), rozdziel `TECHNICAL_FIELDS_BY_FAMILY` (dom/spa-modulowe) od nowego `CONTAINER_TECHNICAL_FIELDS_BY_SUBCATEGORY`, nowa funkcja `getTechnicalFieldsFor(family, containerSubcategory, t)`, nowy wariant `"boolean"` w `TechnicalFieldConfig.type` (dla `bathroomIncluded`), `isSubcategoryComplete`/`isTechnicalSpecsComplete` (rozszerzone o regułę kompletności pola `boolean`)/`createEmptyDraft` zaktualizowane. satisfies **AC-5**
7. Komponenty klienta: `SearchCard.tsx` i `FamilyTabs.tsx` (etykieta "Kontenery modułowe", ikona `Container`), `CategoryShowcase.tsx` (`OutdoorFamily`, `FAMILY_IMAGES`, nazwy/opisy — tymczasowo reużyj dzisiejsze zdjęcie pergoli jako placeholder, patrz Follow-up), `SubcategoryFilterBar.tsx` (trzy chipy kontenerów zamiast czterech pergoli, klucz `containerSubcategory`), `EmptyResults.tsx`, `ResultsHeader.tsx` (teksty wspominające dziś pergole). satisfies **AC-6**
8. Widoki producenta: `ProjectWizardBasicInfoStep.tsx` (wybór rodziny + jednej z trzech podkategorii kontenerów), `ProjectWizardTechnicalStep.tsx` (renderuje pola z `getTechnicalFieldsFor`, w tym nowy input typu checkbox dla `type: "boolean"`), `ProjectWizardSummaryStep.tsx`, `ProducerProductList.tsx`, strona edycji produktu (`app/[locale]/producer/panel/products/[id]/edit/page.tsx`) — usuń odniesienia do pergoli, dodaj trzy podkategorie kontenerów. satisfies **AC-5**
9. `messages/{pl,en,nl}.json`: usuń wszystkie klucze pergoli (patrz Feature design, Klucze tłumaczeń), dodaj odpowiedniki kontenerów w trzech językach, w tym po jednym zestawie label/hint na każde z 9+7+10 pól technicznych trzech podkategorii. satisfies **AC-6**, **AC-10**
10. Testy i fixture'y: `lib/data/projects.test.ts`, `lib/producer-project-draft.test.ts`, `lib/results-filters.test.ts`, `lib/product-technical-specs.test.ts`, `lib/product-family-groups.test.ts`, `lib/data/fixtures/projects.ts` (przykładowy teaser), `components/klient/{CategoryShowcase,SubcategoryFilterBar,FamilyTabs,SiteHeader,CategoryFilterBar}.test.tsx`, `components/producent/ProjectWizardTechnicalStep.test.tsx`, `e2e/wyniki.spec.ts` — usuń przypadki pergoli, dodaj przypadki kontenerów (po jednym na każdą z trzech podkategorii w kreatorze). satisfies **AC-1**–**AC-10**

## Consequences

**Positive**:
- Platforma oferuje trzy realne zastosowania kontenerów modułowych (gastronomia, usługi, mieszkalne) z dopasowanymi polami technicznymi, zamiast jednej płytkiej, hipotetycznej rodziny pergoli z symbolicznym jednym przykładem (patrz spec 0035 rationale).
- Zero ryzyka utraty danych: 0 wierszy `family = 'pergola'` w produkcyjnej bazie, sprawdzone bezpośrednio 2026-09-14.
- `pergola` znika naprawdę (przebudowa typu enum), nie zostaje jako martwa, myląca wartość na zawsze.

**Negative / tradeoffs**:
- Trzy osobne kształty Zod w jednej rodzinie to nowy wzorzec w tym kodzie (dotąd tylko `family` decydowało o kształcie `technicalSpecs`, nigdy `subcategory`); więcej kodu do utrzymania niż dzisiejszy jeden-kształt-na-rodzinę, i pierwszy przypadek, o którym trzeba pamiętać przy dodawaniu kolejnej rodziny z realnie różnymi podkategoriami.
- Pola techniczne trzech podkategorii są zaprojektowane na podstawie ogólnej wiedzy o kontenerach modułowych, nie na podstawie karty katalogowej prawdziwego producenta — to samo zastrzeżenie co spec 0022 zrobił dla spa i pergoli.
- Migracja enum `product_family` wymaga przebudowy typu (rename → create → alter → drop), bo Postgres nie ma `ALTER TYPE ... DROP VALUE`; więcej kroków SQL niż typowe dodanie rodziny przez `ADD VALUE`.

**Neutral**:
- Pole grzewcze kontenerów nazwane `spaceHeatingType`, nie `heatingType`, żeby uniknąć konfliktu typów z istniejącym polem `heatingType` (spa, typ ogrzewania wody) we współdzielonym `ProductTechnicalSpecsDraft`.
- Każde dzisiejsze odwołanie do `pergola`/`pergolaSubcategory`/`PergolaSubcategory` w kodzie przestaje się kompilować po tej zmianie — celowe, TypeScript wyłapuje każde miejsce do zaktualizowania.

## Follow-up

- [ ] Gdy pojawi się prawdziwy producent kontenerów (dowolnej z trzech podkategorii), zweryfikuj pola `technicalSpecs` tej podkategorii względem jego prawdziwej karty katalogowej.
- [ ] `CategoryShowcase` tymczasowo reużywa dzisiejsze zdjęcie pergoli (`/images/houses/golden-hour/baltyk-studio-38.webp`) jako placeholder kontenerów modułowych do czasu prawdziwej fotografii produktu.
- [ ] Rozważyć, czy grupa "Więcej niż dom" (spec 0035) powinna kiedyś pokazywać trzy podkategorie kontenerów jako osobne karty zamiast jednej zbiorczej karty rodziny — poza zakresem tego builda.
- [ ] Trzy nowe kształty Zod dzielą kilka pól o tej samej nazwie i typie (`dimensions`, `structureMaterial`, `insulationType`, `foundationType`). `/develop` może zaimplementować je jako wspólny bazowy kształt rozszerzany per podkategoria (`z.object(baseShape).extend(...)`), żeby ograniczyć duplikację — o ile finalny, eksportowany kształt każdej podkategorii zostaje dokładnie taki, jak ustalono w tej decyzji (AC-4). To szczegół implementacji, nie zmiana decyzji.
- [ ] `project_request.families` (jsonb, spec 0037) niesie wartości `ProductFamily`, ale nie jest kolumną enum — Postgres jej nie waliduje. Sprawdzone, że dziś żaden wiersz nie zawiera `"pergola"` (AC-9), ale to ta sama, już znana luka co przy `technicalSpecs` (spec 0022 Follow-up): ręczny insert przez Neon MCP może w przyszłości wpisać tam nieistniejącą już rodzinę, mijając Zod całkowicie.

## Migration plan

**Strategy**: bezpośrednie zastąpienie (direct replace), bez migracji danych na żywo — w tabeli `product` jest dziś 0 wierszy `family = 'pergola'` (sprawdzone bezpośrednio w produkcyjnej bazie Neon, projekt `modularhub`, 2026-09-14). Migracja kodu (schemat, Zod, kreator, wyszukiwanie, tłumaczenia) wymaga mimo to skoordynowanego wdrożenia, bo stare pola/wartości znikają.

**Phases**:
1. Migracja bazy, faza 1, w tej kolejności: usuń `CHECK product_family_subcategory_match` → przebuduj typ enum `product_family` (usuń `pergola`, dodaj `kontenery-modulowe`) → dodaj enum i kolumnę `container_subcategory` → dodaj z powrotem `CHECK product_family_subcategory_match` z nową definicją. Kolejność jest wymuszona: przebudowa typu nie przejdzie, dopóki istnieje ograniczenie odwołujące się literalnie do wartości `'pergola'`, którą typ traci. Zweryfikuj na tymczasowej gałęzi Neon przed produkcją.
2. Migracja bazy, faza 2 (osobny przebieg `db:generate`, per konwencję `lib/db/AGENTS.md`): usuń kolumnę `pergola_subcategory` i jej enum.
3. Wdróż razem: `lib/product-technical-specs.ts`, `lib/data/types.ts`, `lib/product-family-groups.ts`, `lib/results-filters.ts`, `lib/data/projects.ts`, `lib/db/queries.ts`, `lib/producer-product-actions.ts`, `lib/producer-project-draft.ts`, komponenty klienta i producenta, tłumaczenia. Stary kod odwołujący się do `pergola`/`pergolaSubcategory` nie może wdrożyć się osobno od migracji schematu (przestałby się kompilować albo pisał do nieistniejącej kolumny).

**Rollback**: `drizzle-kit` nie generuje migracji cofających automatycznie. Cofnięcie wymaga ręcznie napisanej migracji w dół (przywracającej wartość `pergola` w enumie przez tę samą przebudowę typu, przywracającej kolumnę `pergola_subcategory`); proste do napisania, bo nie trzeba odtwarzać żadnych utraconych danych (tabela nie miała wierszy tej rodziny). Revert commita/PR cofa kod; cofnięcie schematu bazy to osobny, ręczny krok, tak jak w spec 0022.

**Risks**: brak ryzyka związanego z danymi (zero wierszy tej rodziny). Główne ryzyko to niedoszacowanie trzech nowych kształtów `technicalSpecs`, zanim pojawi się pierwszy prawdziwy producent kontenerów do porównania — oznaczone w Follow-up, ten sam wzorzec ryzyka co spec 0022 dla spa/pergoli.
