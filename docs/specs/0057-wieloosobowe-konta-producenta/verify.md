# Verify: wieloosobowe konta producenta · spec 0057 · updated 2026-09-29

_Steps derived from spec 0057 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Zaloguj się jako dwie różne osoby przypisane do tego samego producenta (dwa różne magic linki) → obie widzą ten sam panel producenta i te same dane firmy → AC-1
- [ ] Na koncie z rolą `producer` bez wiersza `producer_member` (np. właśnie usuniętym) zaloguj się → widoczny komunikat "Nie znaleziono danych firmy dla tego konta." zamiast błędu 500 → AC-6
- [ ] Zablokuj producenta z więcej niż jednym członkiem na `/internal/producers` → wszyscy członkowie natychmiast nie mogą się zalogować (aktywne sesje usunięte) → AC-5
- [ ] Odblokuj tego samego producenta → wszyscy członkowie mogą się znów zalogować → AC-5
- [ ] Zarejestruj nowego producenta przez dzisiejszy formularz (`registerProducer` → magic link) → dokładnie jeden wiersz `producer` i jeden wiersz `producer_member` powstają razem → AC-7

## Commands

- [ ] `SELECT count(*) FROM producer p WHERE NOT EXISTS (SELECT 1 FROM producer_member pm WHERE pm.producer_id = p.id)` → `0` → AC-8 (zweryfikowane na `modularhub-dev`: 163/163 producentów, 0 osieroconych; powtórzyć na produkcji po wdrożeniu, i ponownie przed fazą 2, Build plan zadanie 9)
- [ ] `addProducerMember` z e mailem będącym już członkiem innego producenta → odrzucone: "Ta osoba jest już członkiem innego producenta." → AC-2
- [ ] `addProducerMember` z e mailem będącym już członkiem tego samego producenta → odrzucone: "Ta osoba jest już członkiem tego producenta." → AC-2, AC-3
- [ ] `removeProducerMember` na jedynym pozostałym członku → odrzucone: "Nie można usunąć ostatniego pozostałego członka producenta." → AC-4
- [ ] `addProducerMember` na producencie z ustawionym `blockedAt` → odrzucone: "Producent jest dziś zablokowany. Odblokuj go najpierw." → spec Key invariants
- [ ] `npx vitest run` na dziewięć plików fixture zaktualizowanych w tym build (`case-legacy-guard`, `offer-actions`, `producer-product-actions`, `producer-product-variant-actions`, `producer-project-translation-actions`, `producer-room-layout-actions`, `producer-standards-extraction-actions`, `product-photo-actions`, `project-quote-actions`) → 153/153 przechodzi → potwierdzone w tym buildzie na `modularhub-dev`

## Acceptance-criteria coverage

- AC-1 (wielu użytkowników, pełny dostęp) — `producer_member` + `getProducerIdForUser`; manualna weryfikacja dwoma loginami jeszcze do wykonania po wdrożeniu
- AC-2 (najwyżej jeden producent na użytkownika) — unique index na `producer_member.userId` + walidacja w `addProducerMember`
- AC-3 (dodanie osoby przez administratora) — `lib/producer-member-actions.ts` `addProducerMember`; uruchomienie dla Budman House (Lejman.jakub@gmail.com) jeszcze nie wykonane — czeka na jego imię/telefon i na wdrożenie migracji na produkcję
- AC-4 (usunięcie osoby, ochrona ostatniego członka) — `removeProducerMember`
- AC-5 (blokada odcina wszystkich naraz) — `blockProducer`/`unblockProducer` przepisane na `producerId` + `db.batch`
- AC-6 (komunikat braku firmy) — zweryfikowane, panel już obsługiwał `null` bezpiecznie (`app/[locale]/producer/panel/page.tsx`, `t("noProfile")`)
- AC-7 (rejestracja nadal działa) — `auth.ts` `createUser` gałąź producer, dual write w `db.batch`
- AC-8 (jedyna droga odczytu przez `producer_member`) — `getProducerIdForUser`, `getAllProducersForAdmin` przepisane; zero osieroconych zweryfikowane na dev (163/163); `producer.userId` zostaje jako dual write do fazy 2 (świadomie, Migration plan)
