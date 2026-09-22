# Verify: uproszczenie pól technicznych domu i PDF specyfikacji · spec 0049 · updated 2026-09-22

_Steps derived from spec 0049 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Otwórz kreator producenta, krok „Dane techniczne" dla rodziny `dom` → nie widać pól budowa ściany, izolacja, klasa okien, odporność ogniowa, odporność na wiatr, wymiary transportowe, wymagania dźwigu, minimalna szerokość działki, opis zakresu usług → AC-1
- [ ] W tym samym kroku klasa energetyczna, wentylacja i źródło ciepła nadal są zbierane jako selecty → AC-4
- [ ] Uruchom import PDF (jeśli flaga `AI_IMPORT_ENABLED` włączona) → ekran przeglądu nigdy nie proponuje żadnego z dziewięciu usuniętych pól → AC-2
- [ ] Otwórz stronę produktu klienta dla produktu `dom` bez wgranego pliku specyfikacji → sekcja „Dokumenty" pokazuje placeholder „Do uzupełnienia", żaden z dziewięciu usuniętych wierszy się nie pojawia → AC-3, AC-9
- [ ] Ta sama strona nadal pokazuje klasę energetyczną, wentylację, źródło ciepła i gwarancję konstrukcyjną → AC-4
- [ ] W kreatorze producenta, krok „Pliki”, wgraj poprawny PDF do 10 MB w sekcji „Specyfikacja PDF” → sukces, plik widoczny z opcją zastąpienia/usunięcia → AC-6
- [ ] Wgraj drugi plik w tej samej sekcji → poprzedni znika, tylko nowy jest aktywny → AC-7
- [ ] Usuń plik specyfikacji bez wgrywania nowego → sekcja wraca do stanu pustego → AC-8
- [ ] Odśwież stronę produktu klienta dla tego produktu → pojawia się link „Pobierz PDF ze specyfikacją” zamiast placeholdera → AC-9
- [ ] Otwórz ten link w przeglądarce bez zalogowania (np. w oknie prywatnym) → plik pobiera się bez przekierowania do logowania → AC-10
- [ ] Spróbuj wgrać plik `.pdf` ze zmienioną zawartością (np. zwykły tekst zapisany z rozszerzeniem `.pdf`) → odrzucone z czytelnym komunikatem błędu, przed zapisem do magazynu → AC-11
- [ ] Spróbuj wgrać plik większy niż 10 MB → odrzucone z czytelnym komunikatem błędu → AC-11

## Commands

- [ ] `npx tsc --noEmit -p tsconfig.json` → bez błędów
- [ ] `npx vitest run lib/house-ai-apply.test.ts lib/house-ai-field-catalog.test.ts components/producent/HouseAiFieldReview.test.tsx lib/product-technical-specs.test.ts lib/producer-project-draft.test.ts components/producent/ProjectWizardTechnicalStep.test.tsx components/klient/ProjectTechnicalSpecs.test.tsx components/klient/ProjectLogistics.test.tsx lib/storage/document-pdf-validation.test.ts components/producent/ProjectWizardFilesStep.test.tsx components/producent/ProductEditWizard.test.tsx components/producent/ProjectWizard.test.tsx components/producent/ProjectWizardSummaryStep.test.tsx components/klient/ProjectDocumentsAndFaq.test.tsx lib/data/projects.test.ts` → wszystkie zielone → AC-1 do AC-5, AC-9, AC-11
- [ ] Zapytanie SQL na żywej bazie: `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'document_purpose'` zawiera `product_specification` → migracja 0028 zastosowana → AC-6, AC-7
- [ ] Zapytanie SQL: `SELECT indexname FROM pg_indexes WHERE tablename = 'document' AND indexname = 'document_one_specification_per_product'` zwraca jeden wiersz → indeks częściowy istnieje → AC-7
- [ ] Zapytanie SQL na produktach sprzed tego spec: `SELECT technical_specs FROM product WHERE technical_specs ? 'wallBuildUp' LIMIT 1` nadal zwraca wiersz z tym kluczem → dane historyczne nietknięte → AC-5

## Acceptance-criteria coverage

- AC-1 (kreator nie zbiera 9 pól) … covered by manual step 1, `ProjectWizardTechnicalStep.test.tsx`
- AC-2 (katalog AI nie zna 9 pól) … covered by manual step 3, `lib/house-ai-field-catalog.test.ts`
- AC-3 (strona klienta nie pokazuje 9 pól) … covered by manual step 4, `ProjectTechnicalSpecs.test.tsx`, `ProjectLogistics.test.tsx`
- AC-4 (3 pola + gwarancje + zgoda uproszczona bez zmian) … covered by manual steps 2 i 5, `lib/producer-project-draft.test.ts`, `ProjectTechnicalSpecs.test.tsx`
- AC-5 (dane historyczne nietknięte, brak migracji usuwającej) … covered by SQL check, `lib/product-technical-specs.test.ts` ("accepts a dom shape missing the five retired fields")
- AC-6 (upload dokładnie jednego PDF, walidacja sygnatury) … covered by manual step 6, `lib/storage/document-pdf-validation.test.ts`
- AC-7 (zastąpienie atomowe) … covered by manual step 7, SQL index check
- AC-8 (usunięcie bez nowego pliku) … covered by manual step 8
- AC-9 (sekcja pobierania warunkowa) … covered by manual steps 4 i 9, `ProjectDocumentsAndFaq.test.tsx`
- AC-10 (pobranie publiczne, bez logowania) … covered by manual step 10
- AC-11 (nieprawidłowy plik odrzucony przed zapisem) … covered by manual steps 11-12, `lib/storage/document-pdf-validation.test.ts`
