# Verify: rodziny produktów i kategorie · spec 0022 · updated 2026-09-02

_Steps derived from spec 0022 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Open `/pl/producent/projekt` (kreator nowego produktu) → krok 1 "Informacje podstawowe" pokazuje selektor Rodzina produktu przed Krajem produkcji → AC-6
- [ ] Wybierz rodzinę "Pergola" na kroku 1 → pojawia się "Podkategoria" z opcjami pergoli zamiast dotychczasowej "Kategoria" domu → AC-3, AC-6
- [ ] Przejdź do kroku 2 "Dane techniczne" → pokazuje pola właściwe pergoli (Typ dachu, Materiał dachu, Wymiary, ...), nie pola domu (Układ ścian, Izolacja, ...) → AC-4, AC-6
- [ ] Dokończ kreator i zapisz produkt rodziny "Pergola" → otwórz `/pl/producent/produkty/[id]/edytuj` dla tego produktu → krok 1 pokazuje "Rodzina produktu: Pergola" jako tekst bez selektora → AC-7
- [ ] Odwiedź `/pl/klient` (strona główna) → CategoryShowcase pokazuje 3 karty (Domy modułowe, Spa modułowe, Pergole), każda z prawdziwą liczbą (0 dziś, brak opublikowanych produktów), linkujące do nieprzefiltrowanego `/wyniki` → AC-8
- [ ] Potwierdź, że CategoryFilterBar na `/wyniki` pozostaje bez zmian (dalej dekoracyjny/wyłączony) → AC-9

## Commands

- [ ] `npx tsc --noEmit` → czysto, bez błędów → ogólna poprawność typów
- [ ] `npm run lint` (na plikach tej funkcji) → czysto → ogólna poprawność
- [ ] `npm run test -- --run` → 418/418 testów przechodzi (poza dwoma niezwiązanymi, wcześniej istniejącymi błędami `dev-rfc` w `.agents/skills`/`.claude/skills`, nieużywającymi bun:test w tym środowisku) → AC-3, AC-4, AC-6, AC-7
- [ ] `npm run build` → kompiluje się, `/pl/klient` prerenderuje się poprawnie wywołując prawdziwe `getProductFamilyCounts()` względem Neon → AC-8
- [ ] Neon MCP `describe_table_schema` na `product` (projekt `spring-rain-58383710`, baza `modularhub`) → kolumna `family` NOT NULL bez wartości domyślnej, `spa_subcategory`/`pergola_subcategory`/`technical_specs` nullable, 8 dawnych płaskich kolumn technicznych (`wall_build_up`...`wind_resistance`) nieobecne, ograniczenie `product_family_subcategory_match` obecne → AC-1, AC-2, AC-5 (potwierdzone już raz podczas builda, 2026-09-02)
- [ ] Neon MCP `run_sql`: `INSERT INTO product (id, producer_id, family, pergola_subcategory) VALUES (gen_random_uuid(), '<istniejący producer_id>', 'dom', 'drewniana')` → oczekiwany błąd naruszenia ograniczenia `product_family_subcategory_match` → AC-2

## Acceptance-criteria coverage

- AC-1 · pole `family` NOT NULL bez wartości domyślnej — potwierdzone live przez Neon MCP podczas builda (2026-09-02)
- AC-2 · CHECK `product_family_subcategory_match` chroni przed pomieszaniem rodzin — ograniczenie potwierdzone live; odrzucenie błędnego insertu do potwierdzenia w `/check verify`
- AC-3 · podkategorie per rodzina ustalone w `lib/producer-project-draft.ts` (`PROJECT_CATEGORY_OPTIONS`, `SPA_SUBCATEGORY_OPTIONS`, `PERGOLA_SUBCATEGORY_OPTIONS`) i w schemacie bazy
- AC-4 · `lib/product-technical-specs.ts`, schemat Zod `.strict()` per rodzina, warianty draft/published
- AC-5 · migracja usuwa 8 płaskich kolumn (`drizzle/0004_black_karen_page.sql`, potwierdzone live), widoki katalogu producenta czytają `technicalSpecs`
- AC-6 · krok 1 kreatora (`ProjectWizardBasicInfoStep.tsx`) zbiera rodzinę i podkategorię, jeden krok techniczny (`ProjectWizardTechnicalStep.tsx`) zależny od rodziny
- AC-7 · `familyLocked` w `ProductEditWizard`/`ProjectWizardBasicInfoStep`, `draftToSavedProduct` w `lib/producer-products.ts` ignoruje `family` z draftu przy edycji (odpowiednik "akcji serwerowej" z AC-7 dla dzisiejszej warstwy localStorage, patrz komentarz w kodzie)
- AC-8 · `getProductFamilyCounts()` (`lib/db/queries.ts`) + `CategoryShowcase.tsx`, potwierdzone przez udany produkcyjny build (`/pl/klient` prerenderuje się względem prawdziwego zapytania)
- AC-9 · `CategoryFilterBar.tsx` niezmieniony (brak diffu)
- AC-10 · kategorie kontroli zgodności per rodzina spisane w spec 0022, Feature design (dokumentacja, bez zmian kodu)
