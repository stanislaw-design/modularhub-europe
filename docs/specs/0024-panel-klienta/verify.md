# Verify: panel klienta · spec 0024 · updated 2026-09-03
_Steps derived from spec 0024 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Zaloguj się jako klient z wcześniej wysłanym zapytaniem → wejdź na `/klient/panel/zapytania` → widoczne własne zapytanie (produkty, status, data) → AC-1
- [ ] Zalogowany klient klika serce na karcie `/wyniki` → serce pokazuje stan zapisany → odśwież stronę → stan przetrwał → AC-2
- [ ] Zaznacz produkt jako ulubiony, potem (Neon MCP) ustaw jego `status` na `draft` albo `deleted_at` → wejdź na `/klient/panel/ulubione` → karta zostaje na liście, oznaczona "Produkt niedostępny", nie znika → AC-3
- [ ] Wyloguj się → kliknij serce na `/wyniki` → przekierowanie do `/logowanie?callbackUrl=<dokładnie ta sama ścieżka i parametry>`; po zalogowaniu powrót dokładnie tam → AC-4
- [ ] Wyloguj się → wejdź bezpośrednio na `/klient/panel/ulubione` (i pozostałe dwie podstrony) → to samo przekierowanie do logowania z zachowanym powrotem → AC-4
- [ ] Zaloguj się jako producent lub administrator → wejdź na dowolną podstronę `/klient/panel/*` → przekierowanie do własnej sekcji (`/producent` lub `/internal/zapytania`), panel klienta nie jest widoczny → AC-5
- [ ] Zaznacz 2 lub więcej ulubionych checkboxem na `/klient/panel/ulubione` → pojawia się tabela porównawcza (metraż, cena, czas produkcji, standard wykończenia) → odśwież stronę → zaznaczenie (parametr URL `compare`) przetrwało → AC-6
- [ ] Spróbuj zaznaczyć 4. ulubiony przy 3 już zaznaczonych → checkbox czwartego jest zablokowany → AC-6
- [ ] Wejdź na `/klient/panel/profil` → e mail widoczny bez możliwości edycji, imię i telefon edytowalne → zmień telefon → zapisz → odśwież stronę → zmiana widoczna → AC-7
- [ ] Wywołaj przejściowy błąd zapisu (np. tymczasowo niedostępna baza) przy przełączeniu ulubionego albo zapisie profilu → komunikat w miejscu z możliwością ponowienia, wprowadzone dane w formularzu profilu nie znikają → AC-8
- [ ] Nagłówek pokazuje włączony przycisk "Ulubione" prowadzący do `/klient/panel/ulubione` → AC-9
- [ ] Menu konta zalogowanego klienta zawiera link "Mój profil" do `/klient/panel/profil` → AC-9
- [ ] Nowe konto klienta bez wysłanych zapytań i bez ulubionych → `/klient/panel/zapytania` i `/klient/panel/ulubione` pokazują przyjazny pusty stan z linkiem powrotnym do `/wyniki`, nie błąd ani pustą stronę → AC-11
- [ ] Dwóch różnych klientów, każdy z własnymi zapytaniami/ulubionymi/profilem → każdy widzi na `/klient/panel/*` wyłącznie swoje dane → AC-10

## Commands

- [ ] `npm run db:migrate` → `favorite` istnieje w bazie z triggerem `favorite_audit` (potwierdzone `information_schema` podczas builda) → AC-2, AC-10
- [ ] `npx tsc --noEmit` → brak błędów → build spójny z resztą kodu
- [ ] `npm run lint` → brak nowych błędów/ostrzeżeń w `app/`, `components/`, `lib/`
- [ ] `npm run test` → istniejące testy (`ResultCard.test.tsx`, `ResultsSelection.test.tsx`, …) przechodzą bez regresji
- [ ] `npm run build` → wszystkie trzy trasy `/klient/panel/{zapytania,ulubione,profil}` kompilują się jako dynamiczne (`ƒ`)

## Acceptance-criteria coverage

- AC-1 covered by the zapytania UI step · AC-2 covered by the favorite-toggle UI step and the migration command · AC-3 covered by the unavailable-product UI step · AC-4 covered by the two logged-out redirect steps · AC-5 covered by the producer/admin redirect step · AC-6 covered by the compare-selection and 4th-item-blocked steps · AC-7 covered by the profil edit step · AC-8 covered by the transient-error step · AC-9 covered by the header button and account-menu steps · AC-10 covered by the two-clients-isolation step and the migration command · AC-11 covered by the empty-state step
