# Verify: zapytanie o ofertę bez logowania · spec 0066 · updated 2026-10-07 (jeden mail z linkiem magicznym)
_Steps derived from spec 0066 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Wyloguj się, wejdź na `/pl/inquiry?projects=<id>&country=PL` z poprawnym wyborem → widać formularz z polami imię, e mail, telefon, bez przekierowania do `/login` → AC-1, AC-2
- [ ] Wejdź na `/pl/inquiry` bez `projects` → przekierowanie na `/pl/results` → AC-1
- [ ] Zalogowany jako producent i jako administrator wejdź na `/pl/inquiry?...` → przekierowanie do `/pl/producer` i `/pl/internal` → AC-1
- [ ] Zalogowany jako klient → formularz bez pól kontaktowych, po wysłaniu przekierowanie do `/pl/panel/inquiries/{id}` → AC-2, AC-14
- [ ] Jako gość z nowym e mailem wyślij zapytanie → zostajesz na stronie, widać ekran „Zapytanie wysłane" z tekstem „Sprawdź skrzynkę, wysłaliśmy link do Twojej sprawy" i małym „Nie dostałeś maila? Wyślij ponownie", bez przycisku „Załóż konto" → AC-3, AC-6
- [ ] Pod przyciskiem wysyłki gościa jest informacja o przetwarzaniu danych i link do polityki prywatności (PL, EN, NL) → AC-17
- [ ] Otwórz jedyny mail (stały tekst „Dziękujemy za zapytanie, kliknij, aby zobaczyć sprawę i założyć konto", bez imienia, wiadomości i adresu wpisanych w formularzu), kliknij link → konto powstaje przy pierwszym kliknięciu, trafiasz na `/pl/panel/inquiries/{id}?welcome=new`, sprawa jest na liście z potwierdzonym kontaktem, czat działa → AC-7, AC-8, AC-9
- [ ] Wyślij zapytanie z e mailem producenta lub administratora → ekran identyczny jak dla nowego e maila, nie wychodzi żaden mail, w bazie nie ma wiersza `pending_registration` dla tego adresu → AC-6, AC-8
- [ ] Zasymuluj błąd wysyłki maila (np. zły `RESEND_API_KEY` na dev) → sprawa jest zapisana, ekran pokazuje błąd i „Ponów wysyłanie", po naprawie klucza ponowienie wysyła link → AC-6, AC-8
- [ ] Na ekranie potwierdzenia kliknij „Wyślij ponownie" (symulacja zużytego linku przez skaner poczty) → przychodzi nowy link, który loguje; po 3 aktywnych linkach na adres kolejne się nie wysyłają → AC-6, AC-8
- [ ] Mail „czy to Ty" dla istniejącego klienta ma tekst „Ktoś wysłał zapytanie na ten adres i dopisaliśmy je do Twojego konta…", nagłówek Reply-To z `SUPPORT_REPLY_TO_EMAIL` i link z `?welcome=existing`; samo kliknięcie nie ustawia `contact_email_verified_at` → AC-10
- [ ] W PostHog zdarzenia `notification_email_sent` dla maili gościa mają `entityId` równe id sprawy, nigdy e mail → AC-16
- [ ] Jako doradca otwórz sprawę gościa w `/pl/internal/cases/{id}` → widać e mail i telefon z migawki oraz „E mail niepotwierdzony" → AC-11
- [ ] Jako doradca odpisz w sprawie gościa, który nie założył konta → na jego e mail przychodzi mail tylko z linkiem do `/{locale}/inquiry/claim/{id}`, bez treści wiadomości; druga odpowiedź w ciągu 10 minut nie wysyła drugiego maila → AC-12
- [ ] Wyślij zapytanie jako gość z e mailem istniejącego klienta → ekran potwierdzenia identyczny jak dla nowego e maila, sprawa od razu na koncie klienta jako niepotwierdzona, właściciel dostaje „Czy to Ty" z Reply-To → AC-10
- [ ] Otwórz `/pl/inquiry/claim/{id}` (także z nieznanym id) → strona z jednym przyciskiem, nic się nie wysyła przy samym wejściu, brak danych sprawy → AC-7, AC-15
- [ ] Wyślij zapytanie 4 razy z tym samym e mailem w dobie → czwarte kończy się komunikatem o limicie i nic nie zapisuje → AC-5
- [ ] Ukryte pole „website" wypełnione (devtools) → odpowiedź wygląda na sukces, brak sprawy i maili → AC-5
- [ ] Zalogowany klient, który jest przypięty do sprawy z AC-10, wysyła pierwszą wiadomość → `contact_email_verified_at` ustawione, znacznik znika → AC-13

## Commands
- [ ] `npx vitest run lib/case-actions lib/cases lib/guest-case-actions components/klient/InquiryFlow` → wszystko zielone → AC-1 do AC-17
- [ ] zapytanie SQL na dev: `select client_id, contact_email_verified_at, locale from inquiry order by received_at desc limit 5` → sprawa gościa ma `client_id` NULL i `contact_email_verified_at` NULL → AC-3
- [ ] `select count(*) from inquiry where client_id is not null and contact_email_verified_at is null and received_at < '2026-10-05'` → 0 (migracja uzupełniła stare sprawy) → AC-11
- [ ] `npx vitest run lib/notifications lib/guest-case-actions lib/case-actions components/klient/InquiryFlow` → zielone (parser markera `welcome`, warianty maila, reguła kwalifikacji adresu) → AC-6 do AC-10, AC-16
- [ ] Pierwsze logowanie nowego konta z `pending_registration` (zapisanym przy wysłaniu zapytania) → sprawa dostaje `client_id` także przy pierwszym logowaniu, `events.signIn` czyta rolę z bazy → AC-9
- [ ] `grep -n "0066" docs/specs/0023*/index.md docs/specs/0048*/index.md` → adnotacje obecne → AC-18

## Acceptance-criteria coverage
- AC-1, AC-2 … strony 1 do 4 UI · AC-3 … ekran potwierdzenia i SQL · AC-4 … testy jednostkowe (`case-actions`, `cases/guest`) · AC-5 … limit i pułapka · AC-6 … ekran potwierdzenia · AC-7 … strona claim i mail · AC-8 … „Załóż konto" · AC-9 … logowanie linkiem, także pierwsze · AC-10 … e mail istniejącego klienta · AC-11 … widok doradcy · AC-12 … odpowiedź doradcy · AC-13 … pierwsza wiadomość klienta · AC-14 … klient zalogowany · AC-15 … strona claim i testy dostępu · AC-16 … `trackEvent` z `guest` (test jednostkowy) · AC-17 … informacja RODO · AC-18 … grep adnotacji
