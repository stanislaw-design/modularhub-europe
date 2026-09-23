# Verify: zarządzany przepływ doradczy · spec 0048 · updated 2026-09-23
_Steps derived from spec 0048 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Etap 3: karty startowe i podsumowanie potrzeb (krok 6 planu)

### Commands
- [ ] `npx vitest run lib/cases/cards.test.ts lib/cases/create.test.ts` (z `DATABASE_URL`/`DATABASE_URL_UNPOOLED` ustawionymi) → wybór opcji zapisuje `confirmed`, "nie wiem" zapisuje `missing` z `value = null`, wartość spoza katalogu odrzucona, producent nie może odpowiedzieć na kartę klienta, dwie równoległe odpowiedzi na tę samą kartę zostawiają jeden wiersz, `upsertCaseField` działa tylko dla doradcy, `assessReadiness` przestawia `stage`/`closedReason` i wysyła wiadomość, siedem wiadomości `createAdvisoryCase` ma ściśle rosnący `created_at` w kolejności system → warstwa 1 → warstwa 2 → AC-7, AC-12, AC-13, AC-38, AC-40, AC-44
- [ ] `npx vitest run components/klient/CaseChat.test.tsx` → czat nadal renderuje się bez regresji z `payload` w DTO → AC-6 (regresja)
- [ ] `npx tsc --noEmit` i `npx eslint lib/cases lib/case-schemas.ts lib/case-actions.ts components/klient/CaseChat.tsx components/klient/CaseCardStack.tsx` → bez błędów

### Baza (Neon)
- [ ] Zapytanie do `information_schema` → istnieje tabela `case_field` z kluczem głównym `(inquiry_id, key)` i enumami `case_field_state`, `case_field_source` → AC-12
- [ ] Nowe zapytanie klienta (`submitAdvisoryInquiry`) → w kanale `klient_doradca` powstaje siedem wierszy `message` (jeden `system_notice`, sześć `question_card`), payload każdej karty to `{fieldKey, allowUnsure: true}` → AC-38

### UI / manual
- [ ] Klient wysyła zapytanie i otwiera stronę sprawy → widzi tylko cztery karty warstwy pierwszej, jedną aktywną naraz, z widocznym postępem ("Pytanie X z Y") → AC-38, AC-43
- [ ] Klient wybiera opcję → widzi podgląd "Zapiszemy: …" przed zatwierdzeniem, zatwierdza → odpowiedź zapisana, następna karta staje się aktywna → AC-7
- [ ] Klient wybiera "Nie wiem, niech doradca zaproponuje" na jednej karcie warstwy pierwszej → karta liczy się jako odpowiedziana, przechodzi dalej → AC-40
- [ ] Po odpowiedzeniu na cztery karty warstwy pierwszej → pojawiają się dwie karty warstwy drugiej (ogrzewanie, standard wykończenia), oznaczone jako dodatkowe i opcjonalne → AC-42
- [ ] Klient klika "Pomiń te pytania" w trakcie sekwencji → karty znikają z aktywnego widoku, klient nadal może pisać do doradcy w tym samym kanale bez przeszkód → AC-41
- [ ] Doradca otwiera widok sprawy (`/internal/cases/[id]`) → widzi wszystkie karty w historii, odpowiedziane i nieodpowiedziane, żadna nie blokuje wysyłania wiadomości doradcy → AC-7
- [ ] Sprawdzenie etykiet interfejsu klienta (wszystkie języki) → nigdzie nie występuje słowo "odrzucone" ani jego odpowiednik → AC-13

## Acceptance-criteria coverage (etap 3)
- AC-7 (karty od systemu i doradcy, ten sam typ) · AC-12 (cztery stany, katalog w kodzie) · AC-13 (ocena gotowości bez etykiety widocznej klientowi) · AC-38 do AC-43 (kolejność zapisu, ikony/etykiety z katalogu tłumaczeń, "nie wiem" = missing, pomiń bez zapisu, jedna aktywna karta)
- AC-44 (prefill szkicu briefu z `case_field` kart startowych) częściowo: `case_field` ma poprawny stan/wartość gotowe do odczytu, ale `draftBrief` jeszcze nie istnieje (krok 8 planu) — pełne pokrycie dopiero po tym kroku
- Jeszcze niepokryte, dochodzą z kolejnymi krokami planu: AC-9, AC-14 do AC-30, AC-35 do AC-37

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
