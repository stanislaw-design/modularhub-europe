# Verify: powiadomienia e mail · spec 0051 · updated 2026-09-28
_Steps derived from spec 0051 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Zaloguj się magic linkiem (dowolne konto) → e mail przychodzi z brandowanego szablonu (nagłówek, przycisk, stopka "ModularHub Europe"), nie z domyślnego, gołego HTML Auth.js → AC-9
- [ ] Ustaw chwilowo `RESEND_API_KEY` na nieprawidłowy klucz i spróbuj zalogować się magic linkiem → Auth.js pokazuje swój ekran błędu logowania (nie ciche niepowodzenie) → AC-10
- [ ] Zaloguj się jako admin, wejdź na `/pl/internal/notifications` → widać podgląd wszystkich pięciu szablonów (login, potwierdzenie zapytania, nowa oferta, status, płatność) z tematem i wyrenderowanym HTML, bez przycisku "wyślij naprawdę" → AC-12, AC-13
- [ ] Wejdź na `/pl/internal/notifications` bez sesji albo jako klient/producent → redirect (login albo `/pl`), lista szablonów nigdy nie renderuje się → AC-12
- [ ] Jako klient złóż nowe zapytanie doradcze → e mail potwierdzający przychodzi na adres klienta → AC-1
- [ ] Jako producent złóż ofertę na zapytaniu bezpośrednim (legacy_direct) → klient (adres z `inquiry.email`) dostaje e mail o nowej ofercie z działającym linkiem do `/panel/inquiries/[id]` → AC-2
- [ ] Złóż drugą ofertę tego samego producenta na to samo zapytanie → przychodzi drugi, osobny e mail o nowej ofercie (nie duplikat pierwszego) → AC-5

## Commands
- [ ] `npm run test` → `lib/notifications/*.test.ts`, `lib/cases/notify.test.ts`, `lib/case-actions.test.ts`, `lib/offer-actions.test.ts`, `app/[locale]/internal/notifications/page.test.tsx` wszystkie zielone → AC-1 do AC-5, AC-7, AC-8, AC-9, AC-11, AC-12, AC-13
- [ ] `npm run build` → kompiluje się czysto z szablonami React Email w drzewie, brak konfliktu `react-dom/server` w server actions → AC-7
- [ ] `grep -rn "notifyClientOfOrderStatusChange\|notifyClientOfPaymentConfirmed" lib/ app/` poza `lib/notifications/order-status.ts`/`payment.ts` samymi → brak wywołań: obie funkcje zaprojektowane, jeszcze niepodłączone, zgodnie z AC-6
- [ ] Po realnej wysyłce (klucz Resend skonfigurowany) sprawdź w PostHog zdarzenia `notification_email_sent`/`notification_email_failed` z właściwym `emailType` i `entityId` → AC-4

## Design feedback (dodane po pierwszym przeglądzie, poza oryginalnymi AC)
- [ ] Otwórz dowolny wyrenderowany e mail (np. w `/pl/internal/notifications`) → logo i wordmark na środku u góry, przycisk wyśrodkowany, stopka pokazuje przykładowy kontakt i adres firmy
- [ ] Mail o zmianie statusu realizacji pokazuje plakietkę z nazwą etapu nad nagłówkiem, pozostałe cztery szablony jej nie mają
- [ ] Każdy z pięciu szablonów ma numer referencyjny w stopce oprócz maila logowania (nie dotyczy)
- [ ] `npm run test` → `lib/notifications/templates/*.test.ts` zielone (TransactionalEmail html, plain text, reference)

## Acceptance-criteria coverage
- AC-1 (potwierdzenie nowego zapytania) … manual step 5, `lib/case-actions.test.ts`, `lib/notifications/new-inquiry.test.ts`
- AC-2 (e mail o nowej ofercie) … manual step 6, `lib/offer-actions.test.ts`, `lib/notifications/new-offer.test.ts`
- AC-3 (błąd wysyłki nigdy nie blokuje akcji, `captureError`) … `lib/notifications/send.test.ts`
- AC-4 (zdarzenie obserwowalności na każdą próbę) … `lib/notifications/send.test.ts`, command step 4
- AC-5 (rewizja oferty = nowy, osobny e mail) … manual step 7, `lib/offer-actions.test.ts` ("a resubmission queues a second, distinct notification…")
- AC-6 (status realizacji i płatność zaprojektowane, niepodłączone) … command step 3, `lib/notifications/order-status.ts`, `lib/notifications/payment.ts` (Follow-up w spec)
- AC-7 (React Email + wspólny `lib/notifications/send.ts`, w tym e maile sprawy) … `lib/cases/notify.test.ts`, command step 2
- AC-8 (locale `"pl"` na sztywno) … kod w `lib/notifications/new-offer.ts`, `new-inquiry.ts`, `login.ts` (locale zahardkodowane, bez parametru)
- AC-9 (branded e mail logowania) … manual step 1, `lib/notifications/login.test.ts`
- AC-10 (błąd logowania rzuca dalej) … manual step 2, `lib/notifications/login.test.ts`, `lib/notifications/send.test.ts` (`throwOnFailure`)
- AC-11 (jeden wspólny adres nadawcy) … `auth.ts`, `lib/notifications/send.ts` (`DEFAULT_FROM_EMAIL`)
- AC-12 (podgląd w `internal/notifications`, tylko admin) … manual steps 3-4, `app/[locale]/internal/notifications/page.test.tsx`
- AC-13 (ekran tylko do odczytu) … manual step 3, `app/[locale]/internal/notifications/page.test.tsx` ("never renders a send button")
