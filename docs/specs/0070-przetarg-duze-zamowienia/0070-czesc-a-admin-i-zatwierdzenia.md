# 0070 część A. Panel admina, zatwierdzenia i formularze profilu

## Summary

Część A daje zespołowi wgląd w duże zamówienia i odblokowuje ścieżkę, której dziś nie da się przejść bez ręcznych zmian w bazie. Dodaje ekran "Duże zamówienia" w panelu admina, ekrany zatwierdzania producentów (weryfikacja wolumenowa) i klientów (B2B) oraz brakujące formularze: profil zdolności producenta i NIP z nazwą firmy klienta. Nie zmienia jeszcze modelu przepływu, więc można ją wdrożyć w tygodniu 1.

Kryteria: **AC-1 do AC-7** z [index.md](index.md). Model danych, reguły i bezpieczeństwo: ten sam plik.

## Zakres

**W zakresie**: ekran listy i szczegółów, dwa ekrany zatwierdzeń, dwa formularze, poprawka pustego stanu tablicy. **Poza zakresem**: zmiany modelu ofert, dopasowanie, publikacja (część B), powiadomienia poza jednym mailem do zespołu (część C).

## Ekrany i akcje

**`/internal/large-orders`** (lista). Bramka sesji powtarza wzór z `app/[locale]/internal/AGENTS.md` (sesja, rola `admin`, przekierowanie), bez wspólnego sprawdzenia w layoucie (layout z paskiem bocznym istnieje, ale bramka sesji jest na każdej stronie osobno). Dane z nowego odczytu w `lib/db/queries.ts` (`getLargeOrdersForAdmin`), nie z katalogu ekranu. Kolumny jak w AC-1. Filtry: status, rodzaj (zapytanie wolne lub o produkt). Paginacja po 25. Pozycja w `InternalSidebar`.

**`/internal/large-orders/[id]`** (szczegóły, `kind` w parametrze zapytania, bo identyfikatory są w dwóch tabelach). Pokazuje: dane zapytania, pełny kontakt klienta, oferty ze wszystkimi polami (wraz z tymi z nowego formatu, gdy część B je doda, a do tego czasu tylko istniejące), link do PDF generowany krótko ważnym podpisem (`buildSignedDownloadUrl`; `getProjectQuotePdfUrl` dostaje dziś gałąź tylko dla producenta i klienta, więc dla admina trzeba dodać trzecią), znaczniki czasu. Sekcja producentów dopasowanych pojawia się w części B.

**Weryfikacja wolumenowa** (`/internal/producers/volume-verification` lub sekcja na `producers/[id]`; decyzja wykonawcy, byle była lista oczekujących). Pokazuje profil zdolności obok przycisków zatwierdź i odrzuć, woła `setProducerVolumeVerification`. Lista domyślnie pokazuje status `pending`.

**Weryfikacja B2B klientów** (`/internal/clients/b2b-verification`). Lista klientów w statusie `pending` z NIP i nazwą firmy, przyciski wołają `setClientB2bVerification`. W części B ta akcja dostaje dodatkowy skutek: połączenie oczekujących wyborów klienta.

**`/producer/panel/capacity`** (formularz profilu). Pola z `producerCapacityProfile`: kraje dostawy (wielokrotny wybór, zapis do `producer_delivery_country`, dziś tylko skrypty importu mają taki zapis), jednostek na miesiąc, linie produkcyjne, czasy realizacji (lista `{units, weeks}`), maksymalny rozmiar modułu, obsługiwane standardy wykończenia, certyfikaty, możliwość dostosowania projektu klienta i opis, transport, montaż, opis zdolności, referencje. Zapis woła `updateProducerCapacityProfile`. Osobny przycisk "Wyślij do weryfikacji" woła nową `submitCapacityProfileForReview`, która ustawia `volumeVerificationStatus` z `not_submitted` na `pending` (zatwierdzony i oczekujący bez zmian, odrzucony wraca na `pending`).

**`/panel/profile`** (sekcja danych firmy). Pola NIP i nazwa firmy, zapis woła `submitClientB2bDetails`. Pokazuje bieżący status weryfikacji.

**Tablica producenta** (`/producer/panel/board`). Link w pustym stanie dla niezatwierdzonych kieruje do `/producer/panel/capacity`.

## Szczegóły i przypadki brzegowe

- Brak zapytań: pusty stan z ikoną i tekstem. Błąd odczytu jednej sekcji nie psuje reszty ekranu (zasada z `app/[locale]/internal/AGENTS.md`).
- Zatwierdzenie producenta bez wypełnionego profilu jest możliwe (admin decyduje), ale lista pokazuje brakujące pola jako ostrzeżenie.
- Odrzucenie wymaga powodu tekstowego zapisanego w dzienniku audytu (nowe pole w akcji, bez zmiany schematu, jako wartość w audycie).
- Formularz NIP: walidacja formatu (10 cyfr dla Polski, inne kraje jako tekst z numerem VAT UE). Rozstrzygnięcie dla DE i NL: pole przyjmuje numer VAT UE zamiast NIP i etykieta mówi "NIP lub numer VAT UE".
- Wszystkie teksty ekranów klienta w czterech językach (AC-26), teksty admina po polsku, teksty producenta po polsku i angielsku, zgodnie z istniejącą praktyką.
- Akcje administratora idą przez `withAdminActor`.

## Krytyczne scenariusze testowe

- Admin zatwierdza producenta, ten widzi tablicę, verifies **AC-3, AC-7**
- Producent wysyła profil, status zmienia się na `pending`, nie można wysłać ponownie jako `approved`, verifies **AC-5**
- Klient podaje NIP, admin zatwierdza, status `approved`, verifies **AC-4, AC-6**
- Użytkownik bez roli `admin` nie ma dostępu do listy ani do szczegółów, verifies **AC-1**
- Szczegóły pokazują kontakt tylko adminowi, producent nie dostaje go z odczytu, verifies **AC-2**
