# Verify: prawdziwy model danych · spec 0018 · updated 2026-08-28

_Kroki wyprowadzone z kryteriów akceptacji spec 0018. `/check verify` uruchamia te kroki; `/test` utrwala te trwałe._

## Commands

- [ ] `npm run db:generate` po `lib/db/schema.ts` → brak nowego pliku migracji (schemat już zgodny z zastosowanymi migracjami) → AC-1, AC-3
- [ ] `npm run db:migrate` na pustej, deweloperskiej bazie Neon (lub świeżym branchu) → kończy się bez błędu → AC-3
- [ ] Zapytaj bazę o listę tabel w schemacie `public` → obecnych dokładnie 21 tabel wymienionych w spec Feature design → AC-1
- [ ] `SELECT code, name FROM country` → zwraca PL/Polska, DE/Niemcy, NL/Holandia → AC-1
- [ ] `npx vitest run lib/db/queries.test.ts` → oba testy przechodzą (izolacja per `producer_id`, pusty wynik zamiast błędu dla nieznanego producenta) → AC-5
- [ ] Porównaj kolumny `users`/`accounts`/`sessions`/`verification_tokens` z oczekiwanym kształtem `@auth/drizzle-adapter` → zgodne (adapter podłączy się bez zmiany schematu w funkcji 6) → AC-6

## UI / manual (SQL, przez `mcp__Neon__run_sql` albo dowolnego klienta SQL)

- [ ] Wstaw wiersz do `users`, potem do `producer` → w `audit_log` pojawiają się dokładnie dwa nowe wiersze `action='create'`, jeden per tabela → AC-2
- [ ] Zaktualizuj `producer.name` → w `audit_log` pojawia się dokładnie jeden nowy wiersz `action='update'` z `old_values`/`new_values` → AC-2
- [ ] W żadnym z powyższych wpisów `audit_log` pola `name`/`email`/`nip` nie są w postaci jawnego tekstu (są skrótem md5) → AC-2
- [ ] Usuń wiersz `producer` powiązany z `product` → wiersz `product` nie znika (FK bez kaskady), wcześniejsze wpisy `audit_log` też zostają (już zredagowane) → AC-2

## Acceptance-criteria coverage

- **AC-1** (schemat definiuje każdą encję z funkcji 2 zakresu): pokryte przez listę 21 tabel w `lib/db/schema.ts` i krok "lista tabel" powyżej.
- **AC-2** (ścieżka audytu + strategia usuwania): pokryte przez trigger `audit_log_capture()` (`drizzle/0002_audit_log_trigger.sql`) i kroki manualne powyżej. Sama funkcja anonimizacji (zerowanie `deleted_at`) nie jest jeszcze zaimplementowana w kodzie aplikacji — to zadanie przyszłej funkcji, która faktycznie usuwa konta; schemat (kolumny `deleted_at`) jest gotowy.
- **AC-3** (pierwsza migracja stosuje się bezbłędnie): potwierdzone, `npm run db:migrate` zastosowany na projekcie Neon `modularhub` (branch domyślny), wszystkie 21 tabel + seed + trigger widoczne przez `mcp__Neon__get_database_tables`.
- **AC-4** (żadna tabela nie wymaga przewidywalnej migracji łamiącej dla funkcji 6-15): ocena projektowa w spec Rationale; realnie zweryfikowane dopiero, gdy funkcje 7-15 zaczną budować na tym schemacie (patrz spec Follow-up).
- **AC-5** (izolacja per rola przez łańcuch FK): pokryte testem `lib/db/queries.test.ts` (`getProductsForProducer`).
- **AC-6** (tabele Auth.js zgodne z konwencją adaptera): pokryte kształtem `users`/`accounts`/`sessions`/`verification_tokens` w `lib/db/schema.ts`; realne podłączenie adaptera to funkcja 6.
