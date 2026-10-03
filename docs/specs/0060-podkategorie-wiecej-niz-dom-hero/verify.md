# Verify: podkategorie "Więcej niż dom" bezpośrednio w hero · spec 0060 · updated 2026-10-01
_Steps derived from spec 0060 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Na stronie głównej (pl) kliknij zakładkę "Więcej niż dom" w karcie wyszukiwania hero → pola Gdzie/Budżet/Powierzchnia i przycisk Szukaj znikają, zastąpione rzędem trzech linków (Spa modułowe, Kontenery, Outdoor TV) → AC-1
- [ ] Z zakładką "Więcej niż dom" aktywną, bez wybierania kraju, kliknij "Spa modułowe" → nawigacja od razu na `/pl/results?family=spa-modulowe`, bez klikania osobnego przycisku Szukaj → AC-2
- [ ] Kliknij "Kontenery" → nawigacja na `/pl/results?family=kontenery-modulowe`; kliknij "Outdoor TV" → nawigacja na `/pl/results?family=outdoor-tv` → AC-2, AC-4
- [ ] Wróć na stronę główną, zakładka "Domy" (domyślna) → pola Gdzie/Budżet/Powierzchnia i przycisk Szukaj widoczne bez zmian; Szukaj zablokowany dopóki kraj nie jest wybrany → AC-3
- [ ] Na stronie wyników, zakładka "Wszystko" w `FamilyTabs` nadal prowadzi do widoku łączonego wszystkich trzech rodzin stylu życia (ścieżka zniknęła tylko z hero, nie z produktu) → AC-5
- [ ] Powtórz klik "Więcej niż dom" → link podkategorii na `/en/results` i `/nl/results`, etykiety po angielsku/niderlandzku, bez brakujących/pustych tekstów → AC-6
- [ ] Z klawiaturą (Tab), bez myszy: dojdź fokusem do linku podkategorii → widoczny `.focus-ring`; na wąskim viewport (375px) rząd linków przewija się poziomo zamiast zawijać → AC-7

## Commands
- [ ] `npx vitest run components/klient/SearchCard.test.tsx` → 16 testów zielonych (w tym nowe testy AC-1/AC-2/AC-4 i poprawione testy AC-3) → AC-1, AC-2, AC-3, AC-4
- [ ] `npx vitest run lib/i18n/messages.test.ts` → zielony, brak brakujących kluczy w en/nl/de względem pl → AC-6
- [ ] `npx tsc --noEmit` → brak błędów
- [ ] `npx eslint components/klient/SearchCard.tsx components/klient/SearchCard.test.tsx` → brak błędów

## Acceptance-criteria coverage
- AC-1 … covered by manual step 1, `SearchCard.test.tsx` "replaces Gdzie/Budżet/Powierzchnia/Szukaj with subcategory links…"
- AC-2 … covered by manual steps 2-3, `SearchCard.test.tsx` "links each subcategory straight to /wyniki…"
- AC-3 … covered by manual step 4, `SearchCard.test.tsx` "keeps Budżet, Powierzchnia and Szukaj on the Domy tab…"
- AC-4 … covered by manual step 3, `SearchCard.test.tsx` "renders exactly the families in FAMILY_GROUPS['wiecej-niz-dom']…"
- AC-5 … covered by manual step 5 (FamilyTabs "Wszystko", unchanged, not re-tested here)
- AC-6 … covered by manual step 6, `lib/i18n/messages.test.ts` key-parity check
- AC-7 … covered by manual step 7 (focus-ring + horizontal scroll, visual/manual only, no automated test)
