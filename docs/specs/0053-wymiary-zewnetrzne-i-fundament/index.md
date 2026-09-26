# 0053. Wymiary zewnętrzne i wymagania fundamentowe w kreatorze producenta

**Date**: 2026-09-25
**Status**: Accepted

## Summary

Karta projektu u klienta od dawna ma miejsce na "Wymiary zewnętrzne" i "Wymagania fundamentowe", ale kreator producenta nigdy nie miał pól, żeby te dwie wartości wpisać. Efekt: oba pola zawsze pokazują klientowi placeholder "do uzupełnienia", nawet dla w pełni opublikowanych produktów. Ta specyfikacja dodaje oba pola do kreatora (jako pola opcjonalne, wolny tekst), przeprowadza je przez zapis do bazy i, dla wymagań fundamentowych, przez tłumaczenia EN/NL/DE tym samym mechanizmem co opis produktu.

## Requirements

**User stories**:
- Jako producent, chcę wpisać wymiary zewnętrzne i wymagania fundamentowe swojego produktu w kreatorze, żeby klient nie widział pustego placeholdera na w pełni opublikowanym produkcie.
- Jako producent, chcę, żeby wymagania fundamentowe automatycznie przetłumaczyły się na angielski, niderlandzki i niemiecki, tak jak reszta opisowego tekstu produktu.
- Jako klient przeglądający kartę projektu, chcę widzieć rzeczywiste wymiary i wymagania fundamentowe, jeśli producent je podał, zamiast "do uzupełnienia".

**Acceptance criteria**:
- **AC-1**: Krok "Dane podstawowe" (`ProjectWizardBasicInfoStep`, oba kreatory, nowy projekt i edycja) zbiera "Wymiary zewnętrzne" (`externalDimensions`) jako jedno pole tekstowe, wolny format, opcjonalne (bez czerwonej gwiazdki, bez blokady zapisu przy pustej wartości).
- **AC-2**: Krok "Dane techniczne" (`ProjectWizardTechnicalStep`), w sekcji logistyki obok gwarancji konstrukcyjnej, zbiera "Wymagania fundamentowe" (`foundationOptions`) jako jedno pole tekstowe, wolny format, opcjonalne.
- **AC-3**: Oba pola zapisują się przez istniejącą ścieżkę `createProducerProduct`/`updateProducerProduct` do kolumn `product.external_dimensions`/`product.foundation_options`, tym samym wzorcem co pozostałe pola sekcji logistyki (np. `structuralWarrantyYears`).
- **AC-4**: `foundationOptions` ma warianty tłumaczeń EN/NL/DE, zbierane i generowane w kroku "Tłumaczenia" tym samym mechanizmem co `description` (jeden worek tekstu do `generateProjectItemTranslations`, zapis do nowej kolumny `product_translation.foundation_options`).
- **AC-5**: `externalDimensions` nie ma wariantów tłumaczeń. Jedna wspólna wartość dla wszystkich języków, bo to dane wymiarowe/liczbowe, niezależne językowo.
- **AC-6**: Strona edycji produktu (`ProductEditWizard`, przez `getProducerProductForEdit`) wstępnie wypełnia oba pola, plus trzy warianty tłumaczenia `foundationOptions`, wartościami już zapisanymi w bazie.
- **AC-7**: Karta projektu klienta (`ProjectLogistics.tsx`, bez żadnej zmiany w jej własnym kodzie) przestaje pokazywać placeholder "do uzupełnienia" dla obu pól, gdy producent je wypełnił. `foundationOptions` pokazuje tłumaczenie dla aktywnego locale, z fallbackiem na polski tekst źródłowy gdy tłumaczenia brak, tym samym wzorcem co `description` (spec 0028 AC-6).
- **AC-8**: Istniejące, już opublikowane produkty z pustymi tymi polami zachowują dzisiejsze zachowanie (placeholder u klienta) do czasu ręcznej edycji przez producenta. Żadna migracja wstecznie nie wypełnia danych, żaden mechanizm nie przypomina producentowi o uzupełnieniu; poza zakresem tej specyfikacji.

## Options considered

Pełne porównanie opcji i uzasadnienie decyzji: patrz [rationale.md](rationale.md).

## Decision

**Chosen option**: Opcja 1: pola opcjonalne, wolny tekst, `foundationOptions` tłumaczone przez istniejący mechanizm per pozycja

Oba pola dochodzą do kreatora jako zwykłe, opcjonalne pola tekstowe w miejscach, gdzie schemat bazy i poprzednie specyfikacje już je koncepcyjnie umieściły (`externalDimensions` przy danych podstawowych, `foundationOptions` w sekcji logistyki kroku technicznego); `foundationOptions` dodatkowo dostaje pełne tłumaczenie EN/NL/DE przez ten sam generyczny mechanizm co opis, nazwy pomieszczeń, FAQ i własne wymagania klienta.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

## Rationale

Uzasadnienie decyzji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Żadna nowa tabela. Jedna nowa kolumna:

| Tabela | Kolumna | Typ | Uwagi |
|---|---|---|---|
| `product` | `external_dimensions` | text, nullable | już istnieje (spec 0018), bez zmian w schemacie |
| `product` | `foundation_options` | text, nullable | już istnieje (spec 0018), bez zmian w schemacie |
| `product_translation` | `foundation_options` | text, nullable | **nowa kolumna**, ten sam wzorzec co istniejące `description`/`room_layout`/`faq`/`client_requirements` na tej tabeli |

**API surface**:

Bez nowych server actions. Rozszerzenie istniejących:

| Akcja | Zmiana |
|---|---|
| `createProducerProduct`/`updateProducerProduct` (`lib/producer-product-actions.ts`) | `buildProductValues` pisze `externalDimensions`/`foundationOptions`; `translationRow` pisze `foundationOptions` per locale, tym samym warunkowym wzorcem co `description` (obecność klucza w `fields`, nie tylko niepusta wartość) |
| `generateProjectTranslations` (`lib/producer-project-translation-actions.ts`) | czyta `product.foundationOptions`, dokłada je jako pozycję `foundationOptions` do worka `generateProjectItemTranslations`, zwraca w `ProjectTranslationDraft` |
| `getProducerProductForEdit` (`lib/db/queries.ts`) | selectuje `product.externalDimensions`/`foundationOptions` i `productTranslation.foundationOptions` per locale, zwraca w `ProducerProductForEdit` |
| `getProjectById` (`lib/data/projects.ts`) | selectuje `productTranslation.foundationOptions` obok istniejącego `clientRequirements` (tylko ta jedna ścieżka, nie `getProjects`/teasery, ten sam wzorzec co `clientRequirements` już dziś) |

**Key invariants**:
- `externalDimensions`/`foundationOptions` są opcjonalne na każdym poziomie (formularz, zapis, baza) — pusty string zapisuje się jako `null`, ten sam wzorzec co `serviceScopeDescription`/`transportDimensions` dziś.
- `foundationOptions` tłumaczy się tylko wtedy, gdy polskie źródło jest niepuste (ten sam warunek co `description` w `generateProjectTranslations`).
- Zapis tłumaczenia `foundationOptions` nigdy nie kasuje tego, co inny krok kreatora mógł zostawić nietkniętym: `translationRow` dotyka kolumnę tylko gdy jej klucz jest obecny w `fields` (`undefined` = "ten zapis tego nie dotyczył"), dokładnie ten sam wzorzec co `description` dziś.

**Security model**: bez zmian. Zapis i odczyt tych pól idą przez już istniejącą autoryzację `createProducerProduct`/`updateProducerProduct`/`getProducerProductForEdit` (własność produktu przez `producerId` z sesji).

**Configuration required**: brak nowych zmiennych środowiskowych.

**Critical test scenarios**:
- Happy path: producent wpisuje oba pola, zapisuje, klient widzi rzeczywiste wartości zamiast placeholdera, weryfikuje **AC-1**, **AC-2**, **AC-3**, **AC-7**.
- Tłumaczenie: producent generuje tłumaczenia w kroku "Tłumaczenia", `foundationOptions` pojawia się przetłumaczone na wszystkie trzy języki, klient na `/en`/`/nl`/`/de` widzi przetłumaczoną wersję, weryfikuje **AC-4**.
- Fallback tłumaczenia: `foundationOptions` bez wygenerowanego tłumaczenia dla danego locale pokazuje polski tekst źródłowy klientowi na tym locale, nie pusty string, weryfikuje **AC-4**, ten sam wzorzec co `description`.
- Edycja istniejącego produktu: produkt zapisany przed tą zmianą (oba pola `null`) otwiera się w `ProductEditWizard` z pustymi, ale w pełni funkcjonalnymi polami, weryfikuje **AC-6**, **AC-8**.
- Regresja: pozostałe pola kroków "Dane podstawowe"/"Dane techniczne"/"Tłumaczenia" (opis, gwarancja konstrukcyjna, wymagania klienta) działają bez zmian, weryfikuje brak regresji na już istniejącym mechanizmie.

## Build plan

Podejście budowy tej epiki to Tracer Bullet (patrz spec 0049/0050 tej samej epiki): to naturalnie jeden wątek, nie da się go sensownie podzielić na mniejsze niezależne kawałki, więc zadania niżej budują go od migracji do interfejsu w jednej kolejności zależności, nie równoległymi warstwami.

1. Migracja: dodaj nullable kolumnę `foundation_options` (text) do `product_translation` (`drizzle-kit generate`, zastosuj i zweryfikuj na żywej bazie), satisfies **AC-4**
2. Rozszerz `ProjectDraft` (`lib/data/types.ts`) o `externalDimensions: string`, `foundationOptions: string`, `foundationOptionsEn/Nl/De: string`; dodaj odpowiadające wartości domyślne do `createEmptyDraft()` (`lib/producer-project-draft.ts`), satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**
3. Dodaj pole `externalDimensions` (Input, opcjonalne, bez walidacji wymagalności) do `ProjectWizardBasicInfoStep.tsx`, po polu metrażu, satisfies **AC-1**
4. Dodaj pole `foundationOptions` (Input, opcjonalne) do sekcji logistyki `ProjectWizardTechnicalStep.tsx`, obok gwarancji konstrukcyjnej, satisfies **AC-2**
5. Wpięcie w zapis (`lib/producer-product-actions.ts`): `buildProductValues` dopisuje `externalDimensions`/`foundationOptions`; `ProducerProductFields` dostaje opcjonalne `foundationOptionsEn/Nl/De` (ten sam wzorzec Omit/dopisanie co `descriptionEn/Nl/De`); `translationRow()` dopisuje warunkową gałąź `foundationOptions` per locale, satisfies **AC-3**, **AC-4**
6. Wpięcie w odczyt do edycji: `ProducerProductForEdit` (`lib/db/queries.ts`) i `getProducerProductForEdit` selectują `externalDimensions`/`foundationOptions` z `product` i `foundationOptions` z `productTranslation` per locale; strona edycji (`app/[locale]/producer/panel/products/[id]/edit/page.tsx`) mapuje je do `initialDraft`, satisfies **AC-6**
7. Rozszerz `generateProjectTranslations` (`lib/producer-project-translation-actions.ts`): czyta `product.foundationOptions`, dokłada pozycję `foundationOptions` do worka `items`, zwraca w `ProjectTranslationDraft`; `ProjectWizardTranslationsStep.tsx` renderuje pole `foundationOptions` per aktywny locale obok `description`, `handleGenerate`/`hasAnyExistingTranslation` obejmują nowe pole, satisfies **AC-4**
8. Wpięcie w odczyt klienta: `ProductTranslationText`/`mapRowToProject` (`lib/data/projects.ts`) rozwiązują `foundationOptions` przez `resolveTranslatedText`, tym samym wzorcem co `clientRequirements` (tylko `getProjectById` selectuje tę kolumnę, listy/teasery nie), satisfies **AC-7**
9. Nowe klucze i18n w `messages/pl.json`/`en.json`/`nl.json`/`de.json`: etykiety dla `ProjectWizardBasicInfoStep.externalDimensionsLabel`, `ProjectWizardTechnicalStep.foundationOptionsLabel`, `ProjectWizardTranslationsStep.foundationOptionsLabel`, satisfies **AC-1**, **AC-2**, **AC-4**
10. Testy: rozszerz istniejące pakiety (`ProjectWizardBasicInfoStep.test.tsx`, `ProjectWizard.test.tsx`/`ProductEditWizard.test.tsx`, `lib/producer-product-actions.test.ts`, `lib/producer-project-translation-actions.test.ts`, `lib/db/queries.test.ts`, `lib/data/projects.test.ts`) o zapis, odczyt do edycji, generowanie tłumaczenia i wyświetlanie u klienta obu pól, satisfies **AC-1** do **AC-8**

## Consequences

**Positive**:
- Zamyka lukę otwartą od spec 0018 (funkcja 6/7, wielokrotnie wspominaną w komentarzach schematu jako "wypełniane później", nigdy nie podjętą przez żadną z trzech kolejnych przebudów kreatora).
- Klient przestaje widzieć "do uzupełnienia" na w pełni opublikowanych produktach, dla producentów, którzy wypełnią te pola.
- `foundationOptions` dostaje pełne wsparcie EN/NL/DE spójne z resztą opisowej treści produktu, gotowe na dzień, gdy któryś z tych locale zostanie aktywny (dziś tylko `pl` jest aktywny, AGENTS.md).

**Negative / tradeoffs**:
- Jedna nowa kolumna i jedna nowa pozycja w worku tłumaczeń do utrzymania na zawsze.
- `foundationOptions` nie dostaje osobnego mechanizmu "własność AI vs producenta" jak `name`/`description` (kolumny `ai_generated_*`/`ai_translated_from_*`) — trafia do tego samego, prostszego mechanizmu co `roomLayout`/`faq`/`clientRequirements`, bez tego rozróżnienia. Spójne z tamtymi trzema polami, nie z `description`.
- Oba pola są opcjonalne: nic nie wymusza ich wypełnienia, więc nowo tworzone produkty też mogą wylądować z placeholderem u klienta, jeśli producent je pominie.

**Neutral**:
- Krok "Dane podstawowe" i krok "Dane techniczne" rosną o jedno pole każdy, krótko po tym jak spec 0049/0050 je skracały.
- Istniejące, już opublikowane produkty (dziesiątki, jak przy spec 0049) zostają z pustymi tymi polami do czasu ręcznej edycji; żadna migracja ich nie dotyka (AC-8).

## Follow-up

- [ ] Rozważyć komunikat (baner w panelu producenta albo e-mail) zachęcający producentów z już opublikowanymi produktami do uzupełnienia tych dwóch pól, ten sam, świadomie odłożony wzorzec co spec 0049 Follow-up dla PDF specyfikacji.
- [ ] `roofType`, `constructionSystem`, `customizationScope` — pozostałe pola z tego samego pierwotnego Follow-upu spec 0018 ("pola obecne tylko w dzisiejszym fixture Project"), nadal nie zebrane przez kreator. Poza zakresem tej specyfikacji, dotyczyła wyłącznie dwóch pól z aktualnego zgłoszenia (externalDimensions, foundationOptions).
