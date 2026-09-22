# Verify: zarządzany przepływ doradczy · spec 0048 · updated 2026-09-21
_Steps derived from spec 0048 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Etap 1: fundament i osłona (kroki 1 do 3 planu)

### Commands
- [ ] `npx vitest run lib/case-legacy-guard.test.ts` → sprawa `stage = nowe` niewidoczna w `getInquiriesForProducer` i `getInquiryDetailForProducer`, `submitOffer` na nią zwraca błąd i nie tworzy oferty → AC-4, AC-32, AC-34
- [ ] `npx vitest run lib/cases lib/case-producer-queries.test.ts` → macierz uprawnień (klient nie czyta `producent_doradca`, producent tylko własny kanał, kanał wspólny tylko finalista, `legacy_direct` dla nikogo) i brak kolumn osobowych w module zapytań producenta → AC-8, AC-31
- [ ] `npx vitest run lib/offer-actions.test.ts lib/db/queries.test.ts` → stary przepływ bez regresji → AC-32
- [ ] `npx tsc --noEmit` i `npx eslint lib` → bez błędów

### Baza (Neon)
- [ ] Zapytanie do `information_schema` → istnieją `channel`, `message`, `channel_read_state` oraz kolumny `inquiry.stage`, `plot_street`, `finalist_offer_id` → AC-3, AC-6
- [ ] `UPDATE message SET body = 'x'` i `DELETE FROM message` na wierszu testowym → odrzucone przez trigger `message_immutable` → AC-31
- [ ] `UPDATE message SET body = NULL, payload = NULL, redacted_at = now()` → przechodzi (redakcja) → AC-31
- [ ] Drugi kanał `klient_doradca` dla tej samej sprawy, drugi kanał `wspolny`, `klient_doradca` z `producer_id` → wszystkie odrzucone → AC-3, AC-6
- [ ] Wstawienie `inquiry` z `plot_street` i `client_message`, potem odczyt `audit_log.new_values` → pola jako skrót md5, nie tekst → RODO (spec 0048 Security model)
- [ ] `SELECT stage, count(*) FROM inquiry GROUP BY stage` → wszystkie dotychczasowe wiersze mają `legacy_direct` → AC-32

## Acceptance-criteria coverage (etap 1)
- AC-3 (schemat kanału i unikalność) · AC-4 · AC-6 (schemat wiadomości) · AC-8 · AC-31 · AC-32 · AC-34
- Jeszcze niepokryte, dochodzą z kolejnymi etapami: AC-1, AC-2, AC-5, AC-7, AC-9 do AC-30, AC-33, AC-35 do AC-37
