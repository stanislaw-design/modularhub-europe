# Verify: nowy układ strony projektu (klient) · spec 0054 · updated 2026-09-25
_Steps derived from spec 0054 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open a project with 2 of 3 completion standards filled → variant picker and the price/scope table show exactly 2 tabs/columns, never a disabled "pod klucz" placeholder tab → AC-1, AC-2
- [ ] Open a project with exactly 1 real variant → the picker shows that one variant as a visible, non-clickable "current" tab (not a link, not hidden) → AC-3
- [ ] Visit the project with `?wariant=<a completion standard this project has no row for>` → the page falls back to the same default real variant as with no parameter at all, never a "to be completed" price card → AC-4, AC-9
- [ ] Open a project where `externalDimensions` is filled but `foundationOptions` is empty → "Działka i dostawa" shows only the one filled field in a single column, no "Do uzupełnienia" pill for the missing one → AC-5
- [ ] Open a project where both logistics fields and client requirements are empty → the "Działka i dostawa" section and its `ProjectSectionNav` entry disappear entirely (entry rendered disabled, not removed from the bar) → AC-5, AC-8
- [ ] Open a project variant with only 2 of the 5 timeline stages present → "Harmonogram" renders only those 2 stages in chronological order, connecting line only between them, no placeholder dot for the missing three → AC-6
- [ ] Open a project variant with zero timeline stages → "Harmonogram" and its nav entry disappear → AC-6, AC-8
- [ ] Open a project with no specification PDF and no FAQ items → "Dokumenty i pytania" and its nav entry disappear → AC-7, AC-8
- [ ] Open a project with only FAQ items filled (no PDF) → only the FAQ accordion shows, no documents block or placeholder pill → AC-7
- [ ] Open a producer with `inquiryResponseTimeLabel` empty (trust-details context) → the response-time row is entirely absent, no label text and no pill → AC-10
- [ ] Open a producer with `showroomVisitAvailable = null` → shows "Odwiedziny osobiste do ustalenia z producentem"; `true`/`false` states unchanged → AC-11
- [ ] Keyboard-only pass over the variant picker, gallery tabs, and "show only differences" checkbox → all reachable and operable → AC-14 (spec 0042, unaffected by this change, spot check)

## Commands
- [ ] `npx tsc --noEmit` → clean
- [ ] `npx eslint app/[locale]/(customer)/project/[id]/page.tsx components/klient/Project{VariantPicker,VariantSelect,CostComparisonTable,Logistics,Timeline,DocumentsAndFaq,SectionNav}.tsx components/klient/ProducerCard.tsx lib/data/{types,project-variants,projects}.ts` → clean
- [ ] `npx vitest run components/klient/ProjectVariantPicker.test.tsx components/klient/ProjectCostComparisonTable.test.tsx components/klient/ProjectLogistics.test.tsx components/klient/ProjectTimeline.test.tsx components/klient/ProjectDocumentsAndFaq.test.tsx components/klient/ProducerCard.test.tsx components/klient/ProducerRealizationsSection.test.tsx` → all pass
- [ ] `grep -rn "isPlaceholder\|getDisplayProjectVariants\|scopeToBeCompleted\|documentsPlaceholder\|questionsPlaceholder" --include=*.ts --include=*.tsx .` → no matches → AC-1, AC-12
- [ ] `npm run build` → clean

## Acceptance-criteria coverage
- AC-1 (only real `project.variants`, no synthetic placeholder) … covered by UI steps 1, 3 and the grep command
- AC-2 (exactly as many columns/tabs as real variants) … UI step 1
- AC-3 (single variant renders as non-clickable current tab) … UI step 2
- AC-4 (unreachable hero placeholder branch removed) … UI step 3
- AC-5 (each logistics field independent, grid reflows) … UI steps 4, 5
- AC-6 (only present timeline stages, line only between them) … UI steps 6, 7
- AC-7 (documents/FAQ blocks independent) … UI steps 8, 9
- AC-8 (whole section disappears when empty, nav gets `disabled`) … UI steps 5, 7, 8
- AC-9 (stale `?wariant=` falls back to default) … UI step 3
- AC-10 (response-time row disappears when empty) … UI step 10
- AC-11 (showroom "unknown" copy unambiguous, other two states unchanged) … UI step 11
- AC-12 (no test/fixture/screen references `isPlaceholder` or "do uzupełnienia") … grep command + full test suite command
