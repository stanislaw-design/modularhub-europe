# 0070 część C. Powiadomienia, języki i przypomnienia

## Summary

Część C sprawia, że o każdym kroku przetargu wiedzą właściwe osoby, w ich języku. Dodaje maile w czterech językach dla klienta (zgodnie z językiem strony, na której złożył zapytanie), poprawia link logujący, który dziś prowadzi zawsze do `/pl/panel`, dodaje alerty dla zespołu i przypomnienia o terminie wysyłane zadaniem cyklicznym. Pierwsza część (język i mail do zespołu) wchodzi w tygodniu 1, reszta w tygodniu 3.

Kryteria: **AC-23 do AC-26** z [index.md](index.md).

## Zakres

**W zakresie**: nadawca maili świadomy języka, szablony, dziennik wysyłek, zadanie cykliczne, poprawka linku logującego. **Poza zakresem**: powiadomienia w panelu, SMS, język preferowany przez producenta.

## Zasady

- Jedna funkcja na zdarzenie w `lib/notifications/` (wzór z `lib/notifications/AGENTS.md`), wołająca `sendNotificationEmail`. Funkcje są best effort: błąd wysyłki jest zapisywany w Sentry (`captureError`) i nigdy nie cofa zapisu w bazie.
- Język: klient według `contact_locale` zapytania, producent `pl`, zespół `pl`. Funkcja przyjmuje język jawnie i nie ma wartości domyślnej `pl` na sztywno (stan dzisiejszy w `new-inquiry.ts` i `new-offer.ts` do poprawy).
- Teksty w `messages/*.json` pod nowymi przestrzeniami nazw (po jednej na rodzaj maila), z prawdziwymi tłumaczeniami pl, en, de, nl. Nazwy plików i klucze po angielsku.
- Dzisiejsze `notifyContactOfNewQuote` wysyła klientowi link logujący przy każdej nowej ofercie, co zdradza istnienie ofert przed publikacją (AC-13). Usuwamy to wywołanie z `submitProjectQuote` w tygodniu 2 razem z bramką publikacji, a mail z linkiem wysyła dopiero akcja `publishSummary`. Tworzenie `pending_registration` dla klienta bez konta przenosi się do tej samej funkcji (tak samo jak dziś, tylko w innym momencie).
- Link logujący w mailu do klienta używa `redirectTo = /{contact_locale}/panel/quotes`, nie `/pl/panel`.
- Klient bez konta: mail z linkiem tworzy konto przy pierwszym kliknięciu (istniejący mechanizm `pending_registration`). Jeśli klient nie zaloguje się od publikacji, szczegóły zapytania w adminie pokazują "klient jeszcze się nie zalogował", żeby zespół mógł się skontaktować.
- Kolejność w tygodniach: język maili i mail do zespołu o nowym zapytaniu w tygodniu 1, usunięcie maila przy złożeniu oferty i mail o publikacji w tygodniu 2 (razem z bramką), pozostałe maile i zadanie cykliczne w tygodniu 3.

## Maile

| Zdarzenie | Odbiorca | Język | Kiedy |
|---|---|---|---|
| Nowe zapytanie | Zespół | pl | Od razu po złożeniu |
| Nowe zapytanie | Dopasowani producenci | pl | Od razu po złożeniu |
| Zapytanie bez dopasowanych producentów | Zespół | pl | Od razu po złożeniu |
| Nowa oferta | Zespół | pl | Po złożeniu oferty |
| Zapytanie złożone przez doradcę | Klient | `contact_locale` | Po zapisie |
| Opublikowane podsumowanie | Klient | `contact_locale` | Po `publishSummary` |
| Wybór oczekuje na B2B | Zespół | pl | Po wyborze bez zatwierdzonego B2B |
| Połączenie stron | Klient i producent, zespół w kopii | każdy w swoim | Po `contact_revealed_at` |
| Neutralna informacja dla przegranych | Producenci z aktywną ofertą | pl | Po połączeniu |
| Zamknięcie zapytania | Producenci z aktywną ofertą | pl | Po `closeRequest` |
| Przypomnienie o terminie | Dopasowani producenci bez aktywnej oferty | pl | 3 dni i 1 dzień przed terminem |
| Termin minął | Zespół | pl | W dniu terminu, z liczbą ofert |

Treść maila do producenta o nowym zapytaniu zawiera: kraj, liczbę domów, rodziny, termin ofert, link do tablicy. Nie zawiera żadnych danych kontaktowych klienta. Treść maila o połączeniu zawiera dane obu stron i prośbę, żeby ustalenia o cenie, zakresie i terminie potwierdzać w systemie.

## Zadanie cykliczne

`GET /api/cron/large-orders-reminders` (ścieżka robocza), chronione nagłówkiem `Authorization: Bearer ${CRON_SECRET}`. Wywoływane z `vercel.json` raz na godzinę. Dla każdego zapytania w statusie `open`, `quoted` lub `published`, z przyszłym `deadline_at`: oblicza próg 3 dni i 1 dzień, wybiera dopasowanych producentów bez aktywnej oferty, wstawia wiersz do `project_notification_log` z unikalnością (cel, producent, rodzaj) i wysyła maila tylko wtedy, gdy wstawienie się powiodło. Kolejność wstawienia przed wysłaniem gwarantuje, że przypomnienie wyjdzie najwyżej raz, nawet przy równoległym uruchomieniu. To samo zadanie raz na godzinę wywołuje `connectSelection` dla zapytań z wyborem klienta, bez połączenia, których klient ma zatwierdzone B2B (sprzątanie po ewentualnym wyścigu lub błędzie). Alert zespołu w dniu terminu: rodzaj `deadline_team`, jeden raz na zapytanie, także gdy zapytanie nie ma ofert (wtedy zespół zamyka je z powodem `expired` albo przedłuża termin). Zadanie nie działa na stagingu, testuje się je wywołaniem ręcznym z sekretem.

## Przypadki brzegowe

- Zmiana terminu po wysłaniu przypomnienia: nowy termin ma nowe progi, a stare wpisy w dzienniku nie blokują, bo rodzaj przypomnienia zawiera datę terminu (`reminder_3d:2026-10-23`).
- Producent złożył ofertę między przypomnieniami: nie dostaje następnego.
- Awaria dostawcy poczty: wiersz w `project_notification_log` powstaje przed wysłaniem, więc brakujący mail nie zostanie ponowiony automatycznie. Dla przypomnień to akceptowalne, bo to powiadomienie pomocnicze. Zespół widzi błąd w Sentry. Mail "nowe zapytanie do producenta" jest ważniejszy, więc przy błędzie jego wysyłki zespół dostaje alert z listą producentów.
- Adres nadawcy i uwierzytelnianie domeny (SPF, DKIM, DMARC): wymagane przed pilotażem, sprawdzane ręcznie, poza kodem.

## Krytyczne scenariusze testowe

- Klient z `contact_locale = de` dostaje maila po niemiecku z linkiem do `/de/panel/quotes`, verifies **AC-23**
- Zapytanie bez dopasowanych producentów wysyła alert do zespołu, verifies **AC-24**
- Zadanie uruchomione dwa razy wysyła jedno przypomnienie, verifies **AC-25**
- Błąd wysyłki jednego maila nie cofa zapisu oferty i trafia do Sentry, verifies **AC-25**
- Każda nowa przestrzeń nazw mailowa i ekranowa ma te same klucze w pl, en, de i nl (nowy test zgodności kluczy; `npm run check:translations` tego nie sprawdza), verifies **AC-26**
- Złożenie oferty nie wysyła klientowi żadnego maila, dopiero publikacja wysyła mail z linkiem, verifies **AC-13, AC-24**
- Zadanie godzinne łączy oczekujący wybór po zatwierdzeniu B2B, verifies **AC-17**
