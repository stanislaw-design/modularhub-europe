# Verify: model danych dla dużych zamówień B2B · spec 0037 · updated 2026-09-13

_Kroki wyprowadzone z acceptance criteria spec 0037. `/check verify` je uruchamia, `/test` blokuje te trwałe jako regresje. Zakres tego builda: migracja + Zod (Build plan zadanie 1-2), zapisywanie zapytań (zadanie 3), odpowiedzi i cykl życia (zadanie 4). Testy (zadanie 5) to osobny krok, `/test`._

## Commands

- [ ] `npm run db:generate` po `lib/db/schema.ts` → brak nowego pliku migracji (schemat już zgodny z zastosowanymi migracjami) → AC-1, AC-4, AC-6, AC-9, AC-12
- [ ] Insert `project_request` z `unit_count_min < 10` → odrzucone przez CHECK `project_request_unit_count_min` → AC-12
- [ ] Insert `project_request` z `families = '[]'::jsonb` → odrzucone przez CHECK `project_request_families_not_empty` → AC-12
- [ ] Insert `project_request`/`bulk_product_inquiry` z `unit_count_max < unit_count_min`, albo z oknem "do" wcześniejszym niż "od" → odrzucone przez odpowiedni CHECK → AC-12
- [ ] Cztery zgłoszenia (`project_request`/`bulk_product_inquiry` łącznie) z tym samym znormalizowanym e mailem, wszystkie w statusie `open`/`quoted` → czwarte odrzucone błędem `bulk_request_email_limit_exceeded` (trigger `enforce_bulk_request_email_limit`) → AC-10
- [ ] Insert `project_quote` z oboma `project_request_id`/`bulk_product_inquiry_id` ustawionymi (albo żadnym) → odrzucone przez CHECK `project_quote_exactly_one_link` → Key invariant
- [ ] Dwie próby ustawienia `project_quote.status = 'accepted'` na ten sam `project_request` (różni producenci) → druga odrzucona przez `project_quote_accepted_per_request` → AC-9

## Logika aplikacji (przez server actions, np. skrypt tsx albo przyszła UI)

- [ ] `submitProjectRequest` z krajem, w którym istnieje producent `producer_capacity_profile.volumeVerificationStatus = 'approved'` dostarczający do tego kraju → wiersz `project_request` (`status = 'open'`), automatycznie powstaje wiersz `project_request_target_producer` dla tego producenta → AC-1, AC-2
- [ ] `submitProjectRequest` do kraju bez zweryfikowanego wolumenowo producenta → wiersz `project_request` mimo to powstaje (`status = 'open'`, zero wierszy `project_request_target_producer`) → AC-2 (Key invariant, nie błąd)
- [ ] `submitBulkProductInquiry` na `productId` w statusie `draft` (nieopublikowany) → odrzucone ("Nie znaleziono opublikowanego produktu") → AC-4
- [ ] `submitProjectQuote` z `projectRequestId` od producenta BEZ wiersza `project_request_target_producer` → odrzucone ("Nie jesteś przypisany do tego zapytania") → AC-3
- [ ] `submitProjectQuote` z `bulkProductInquiryId` od producenta, który NIE jest właścicielem `product.producerId` tego zapytania → odrzucone → AC-5
- [ ] Ten sam producent wywołuje `submitProjectQuote` dwa razy na to samo zapytanie → pierwsza wycena `status = 'superseded'`, druga `active`, `project_request.status` przechodzi `open` → `quoted` → AC-3
- [ ] Po `submitProjectQuote` na `contactEmail` bez istniejącego konta → powstaje wiersz `pending_registration` (rola `client`) i próba wysyłki e maila logującego (Resend) → AC-11
- [ ] Logowanie tym samym, znormalizowanym `contactEmail` (klik linku magicznego) → `project_request`/`bulk_product_inquiry` z tym e mailem dostają `clientId` → AC-7
- [ ] `acceptProjectQuote` gdy `client.b2bVerificationStatus != 'approved'` → odrzucone z jasnym powodem → AC-9
- [ ] Administrator ustawia `setClientB2bVerification(clientId, 'approved')`, potem `acceptProjectQuote` na jedną z aktywnych wycen → ta wycena `accepted`, pozostałe aktywne na to samo zapytanie automatycznie `rejected`, `project_request.status = 'accepted'` → AC-9
- [ ] `updateProducerCapacityProfile` (producent) zapisuje/aktualizuje profil (upsert po `producerId`), potem `setProducerVolumeVerification(producerId, 'approved')` (admin) → `volume_verification_status = 'approved'` → AC-6
- [ ] `submitClientB2bDetails` (klient, `lib/project-quote-actions.ts`) → `client.nip`/`companyName` zapisane, `b2bVerificationStatus` przechodzi na `pending` → AC-8 (funkcja gotowa od `/debug` 2026-09-13; ekran profilu, który by ją wywołał, to wciąż przyszły ekran, patrz Follow-up)

## Acceptance-criteria coverage

- AC-1: `submitProjectRequest`, walidacja Zod (`lib/project-request-actions.ts`).
- AC-2: `autoTargetProducers` (kraj + `volumeVerificationStatus = 'approved'`).
- AC-3: `submitProjectQuote` (ścieżka `project_request`), zastąpienie aktywnej wyceny.
- AC-4: `submitBulkProductInquiry`, sprawdzenie `product.status = 'published'`.
- AC-5: `submitProjectQuote` (ścieżka `bulk_product_inquiry`), sprawdzenie własności produktu.
- AC-6: tabela `producer_capacity_profile`, `updateProducerCapacityProfile`, `setProducerVolumeVerification`.
- AC-7: `linkRequestsToClientOnLogin`, wywoływane z `auth.ts` `events.signIn`.
- AC-8: rozszerzenie `client` (`nip`/`companyName`/`b2bVerificationStatus`) plus `submitClientB2bDetails` (`lib/project-quote-actions.ts`, dodane 2026-09-13 po tym, że `/check verify` znalazło brakującą funkcję) — ekran, który by ją wywołał, to nadal przyszła decyzja (Follow-up).
- AC-9: `acceptProjectQuote` (bramka B2B, wzajemne wykluczanie przez unikalne indeksy).
- AC-10: trigger `enforce_bulk_request_email_limit` (`drizzle/0014_bulk_request_limit_and_audit.sql`).
- AC-11: `notifyContactOfNewQuote` w `submitProjectQuote`.
- AC-12: CHECK na `project_request`/`bulk_product_inquiry` (`drizzle/0013_cynical_vance_astro.sql`).

## Znane luki i założenia do przejrzenia

- AC-11 wymagało, żeby kontakt bez konta mógł dostać link logujący; dzisiejszy mechanizm (`auth.ts` `createUser`) zakłada istniejący wiersz `pending_registration`. `notifyContactOfNewQuote` (`lib/project-quote-actions.ts`) tworzy go w locie (rola `client`, `phone` puste jeśli nie podano) tylko gdy nie ma ani `users`, ani `pending_registration` dla tego e maila — nie nadpisuje rejestracji w toku. To założenie budowlane, nie jest opisane wprost w spec 0037; warto dopisać do spec przy najbliższej okazji.
- `redirectTo` linku logującego wskazuje na `/pl/panel` (istniejący, bezpieczny cel) — panel jeszcze NIE pokazuje `project_request`/`bulk_product_inquiry`/`project_quote` (ekrany to przyszła decyzja, Follow-up).
- `updateProducerCapacityProfile` nie było nazwane wprost w spec 0037 Build plan (zadanie 4 nie go wymieniało), ale AC-6 wymaga, żeby producent mógł prowadzić profil, nie tylko żeby tabela istniała — dodane, żeby AC-6 było faktycznie zbudowane, nie tylko zamodelowane.
- **Rozwiązane 2026-09-13** (`/check verify` + `/debug`): `isBulkRequestEmailLimitError`/`isUniqueViolation` sprawdzały `error.code`, ale `drizzle-orm/neon-http` opakowuje każdy błąd sterownika w `DrizzleQueryError`, którego prawdziwy SQLSTATE jest zagnieżdżony pod `error.cause.code` — czwarte zgłoszenie było poprawnie blokowane w bazie, ale użytkownik widział ogólny błąd zamiast jasnego komunikatu (AC-10). Naprawione wspólnym `getPgErrorCode` (`lib/db/pg-error.ts`), zastosowanym też do bliźniaczego błędu w `lib/offer-actions.ts` (spec 0033).
- **Rozwiązane 2026-09-13**: brakująca połowa AC-8 (klient nie miał żadnej funkcji do wpisania NIP/nazwy firmy) — dodano `submitClientB2bDetails` (`lib/project-quote-actions.ts`).
