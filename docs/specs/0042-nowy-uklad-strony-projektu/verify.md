# Verify: nowy układ strony projektu · spec 0042 · updated 2026-09-16

_Steps derived from spec 0042 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Otwórz `/pl/project/[id]` dla produktu z dwoma lub więcej wariantami → przełącznik wariantów widoczny w hero, wybór wariantu przez `<Link>` (bez przeładowania) aktualizuje cenę, opis zakresu i harmonogram jednocześnie → AC-1, AC-14
- [ ] Kliknij "Wyślij zapytanie" po wybraniu niedomyślnego wariantu → link niesie `wariant=<standard>` w query string → AC-1
- [ ] Sekcja "Cena i zakres" dla produktu z ≥2 wariantami pokazuje tabelę porównawczą wielokolumnową z pozycjami kosztowymi i statusem (5 stanów) → AC-2
- [ ] Zaznacz "Pokaż tylko różnice" w tabeli porównawczej → wiersze identyczne we wszystkich wariantach znikają → AC-2, AC-14
- [ ] Otwórz produkt z dokładnie jednym wariantem → brak przełącznika wariantów i brak wielokolumnowej tabeli, tylko pojedynczy blok cena/zakres → AC-3
- [ ] Otwórz produkt z wypełnionym `room_layout` → sekcja "Układ domu" renderuje tabelę pomieszczeń; produkt bez `room_layout` → sekcja całkowicie nieobecna (bez pustego placeholdera) → AC-4
- [ ] Otwórz produkt z częściowo wypełnioną logistyką (np. tylko `transportDimensions`) → sekcja "Działka i dostawa" pokazuje tylko to jedno pole → AC-5
- [ ] Otwórz produkt z brakującym jednym etapem harmonogramu (np. bez `formalnosci`) → harmonogram pokazuje tylko istniejące etapy, w stałej kolejności formalności/produkcja/transport/montaż/wykończenie → AC-6
- [ ] Zakładka galerii "Realizacje" jest zawsze widoczna: bez zdjęć pokazuje komunikat "do uzupełnienia przez producenta"; zakładka "Rzut" pojawia się tylko gdy istnieje dokument `product_floor_plan` → AC-7, AC-8
- [ ] Dokument realizacji przypisany do jednego wariantu pokazuje się tylko przy tym wariancie, znika po przełączeniu na inny → AC-7, AC-8
- [ ] Sekcja "Producent" dla producenta z `showroom_visit_available = true/false/null` pokazuje trzy rozróżnialne, jawne komunikaty (nigdy ciche "nie" dla `null`) → AC-9
- [ ] Linia "odpowiada w ciągu X dni" pod przyciskiem zapytania w hero pokazuje się tylko gdy `producer.inquiry_response_time_label` jest wypełnione → AC-10
- [ ] Produkt bez żadnego aktywnego wariantu (`priceMin` puste) renderuje się identycznie jak `priceOnRequest`: brak zakresu ceny, samo wezwanie do zapytania → AC-11
- [ ] Kolejność sekcji na stronie odpowiada: hero → układ domu → cena i zakres → działka i dostawa → harmonogram → komfort i technologia → producent → dokumenty/zgodność prawna i większe zamówienia → wezwanie końcowe → AC-12
- [ ] Odznaka przeznaczenia (np. "Dom całoroczny") widoczna w hero obok nazwy projektu → AC-13
- [ ] Nawigacja klawiaturą (Tab) przez przełącznik wariantów, zakładki galerii i checkbox "pokaż tylko różnice" — każdy element ma widoczny `.focus-ring` → AC-14
- [ ] Strona nie renderuje żadnej sekcji "Podobne domy" ani indywidualnych opinii o modelu → AC-15 (świadomie poza zakresem)

## Commands

- [ ] `npx tsc --noEmit` → bez błędów → cały build
- [ ] `npm run build` → kompiluje się, `● /[locale]/project/[id]` w wyjściu → cały build
- [ ] `npx vitest run` → zielone poza trzema przedistniejącymi, niezwiązanymi testami (`lib/product-family-groups.test.ts`, dwa w `lib/project-request-actions.test.ts`, potwierdzone jako pre-existing przez izolowane uruchomienie) → cały build
- [ ] Neon MCP `describe_table_schema` na `producer` i `product` → kolumny `inquiry_response_time_label`, `showroom_visit_available`, `showroom_visit_note`, `room_layout` obecne na żywej bazie → AC-9, AC-10, Fundament

## Acceptance-criteria coverage

- AC-1 (integralność wariantu/ceny, wybór przez URL) … covered by UI steps 1-2 · `lib/data/project-variants.test.ts`, `components/klient/ProjectVariantPicker.test.tsx`
- AC-2 (tabela porównawcza kosztów) … covered by UI steps 3-4 · `components/klient/ProjectCostComparisonTable.test.tsx`
- AC-3 (jeden wariant, brak przełącznika) … covered by UI step 5 · `ProjectVariantPicker.test.tsx`
- AC-4 (układ domu, brak danych = brak sekcji) … covered by UI step 6 · `ProjectRoomLayout.test.tsx`
- AC-5 (logistyka, pola niezależne) … covered by UI step 7 · `ProjectLogistics.test.tsx`
- AC-6 (harmonogram, kolejność stała) … covered by UI step 8 · `ProjectTimeline.test.tsx`, `lib/data/projects.test.ts`
- AC-7, AC-8 (zakładki galerii, placeholder Realizacje) … covered by UI steps 9-10 · `ProjectGalleryTabs.test.tsx`, `lib/data/projects.test.ts`
- AC-9, AC-10 (trzy stany odwiedzin, linia odpowiedzi) … covered by UI steps 11-12 · `ProducerCard.test.tsx`, `lib/data/producers.test.ts`
- AC-11 (brak wariantu = priceOnRequest) … covered by UI step 13 · `lib/data/projects.test.ts`
- AC-12 (kolejność sekcji) … covered by UI step 14 (manual, no automated test — section order is a page-level layout concern)
- AC-13 (odznaka przeznaczenia) … covered by UI step 15 (manual; reuses existing `ProjectOptions` translations)
- AC-14 (dostępność klawiatury) … covered by UI step 16 (manual); primitives (`Checkbox`, `<Link>`) already carry `.focus-ring`
- AC-15 (poza zakresem) … covered by UI step 17 (regression, manual)
