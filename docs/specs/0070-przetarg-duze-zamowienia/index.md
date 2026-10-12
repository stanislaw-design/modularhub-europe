# 0070. Przetarg na duże zamówienia z podsumowaniem ModularHub

**Date**: 2026-10-09
**Updated**: 2026-10-12 (jedna dokładna liczba domów, załączniki inwestora)
**Status**: In Progress

## Summary

Duże zamówienia (od 3 domów) przechodzą na model przetargu. Zapytanie samo trafia do producentów dopasowanych regułami, producenci składają oferty w jednym formacie przed terminem, a ModularHub publikuje klientowi podsumowanie z porównaniem. Klient wybiera producenta, a ModularHub łączy obie strony i zapisuje, kto wygrał. Ta specyfikacja zastępuje część 0062 (otwartą tablicę, na której klient widział oferty od razu i sam akceptował wybór). Do budowy: panel admina dla dużych zamówień, formularze zatwierdzeń, nowy format oferty, bramka publikacji, wybór z połączeniem stron, maile w czterech językach i przypomnienia.

Zmiana z 2026-10-12: inwestor podaje jedną dokładną liczbę domów (od 3, bez zakresu i bez plusa), bo producent potrzebuje jej do oferty, oraz może dołączać do zapytania pliki (projekt, rzuty, plan zagospodarowania, specyfikację). Pliki trafiają do prywatnego magazynu i są widoczne od razu dla dopasowanych producentów. Ochronę danych kontaktowych w plikach zapewnia ostrzeżenie przy wgrywaniu i ukrycie pliku przez administratora po fakcie (skaner danych kontaktowych dochodzi później).

## Structure

Ta decyzja ma cztery części, każda wystarczająca do budowy osobno. Wspólny model danych, reguły i kolejność budowy są w tym pliku.

- [Część A: panel admina, zatwierdzenia i formularze profilu](0070-czesc-a-admin-i-zatwierdzenia.md), wspiera decyzję o wglądzie ModularHub w zapytania i o weryfikacji producentów i klientów (tydzień 1).
- [Część B: przetarg, format oferty, publikacja, wybór i połączenie](0070-czesc-b-przetarg-i-podsumowanie.md), wspiera decyzję o modelu "przetarg z podsumowaniem", progu 3 domów i zapytaniu składanym przez doradcę (tydzień 2).
- [Część C: powiadomienia, języki i przypomnienia](0070-czesc-c-powiadomienia-i-jezyki.md), wspiera rynek DE i NL oraz regułę, że o każdym kroku wiedzą ModularHub i producent (tygodnie 1 i 3).
- [Część D: załączniki inwestora](0070-czesc-d-zalaczniki-inwestora.md), wspiera decyzję, że producent dostaje do oferty plany i rzuty już w trakcie przetargu, z ochroną kontaktu inwestora po fakcie (tydzień 2, po zadaniu 16).

Poza tą specyfikacją (osobna decyzja, czeka na prawnika): strony prawne (polityka prywatności, regulamin z zasadą dostępu do przetargów, Impressum, zgoda na cookies) i zgodność z rozporządzeniem UE 2019/1150.

## Requirements

**User stories**:
- Jako inwestor lub deweloper, chcę opisać projekt raz i dostać od ModularHub porównanie ofert, żeby wybrać producenta bez odbierania kilku telefonów.
- Jako producent, który pasuje do projektu, chcę dostać zapytanie bez szukania go, wiedzieć do kiedy składam ofertę i złożyć ją w jednym, znanym formacie.
- Jako zespół ModularHub, chcę widzieć każde zapytanie i każdą ofertę, publikować klientowi podsumowanie i wiedzieć, kto został wybrany, żeby łączyć strony i prowadzić rozliczenia z producentami.
- Jako doradca, chcę złożyć zapytanie w imieniu klienta, który zadzwonił lub napisał.

**Acceptance criteria** (kontrakt, każde kryterium można sprawdzić osobno):

Część A (admin, zatwierdzenia, formularze):
- **AC-1**: Administrator widzi na `/internal/large-orders` listę wszystkich zapytań (`project_request` i `bulk_product_inquiry`) z kolumnami: rodzaj, kraj, liczba domów, termin ofert, status, liczba ofert, liczba ofert czekających na publikację, data. Lista ma filtr po statusie i paginację. Użytkownik bez roli `admin` jest przekierowany tak samo jak na innych ekranach admina.
- **AC-2**: Szczegóły zapytania w adminie pokazują pełne dane kontaktowe klienta, wszystkie oferty (także nieopublikowane) w formacie oferty, PDF przez krótko ważny link, listę producentów, którzy widzą zapytanie (z podziałem na dopasowanych i wyjątki), oraz znaczniki czasu: złożenie, publikacja, wybór, połączenie, zamknięcie.
- **AC-3**: Administrator zatwierdza lub odrzuca `volumeVerificationStatus` producenta na ekranie "Weryfikacja wolumenowa" (akcja `setProducerVolumeVerification` jest podpięta, zmiana trafia do dziennika audytu). Widzi profil zdolności producenta przy decyzji.
- **AC-4**: Administrator zatwierdza lub odrzuca `b2bVerificationStatus` klienta na ekranie z NIP i nazwą firmy (akcja `setClientB2bVerification` podpięta, audyt).
- **AC-5**: Producent wypełnia profil zdolności produkcyjnej w panelu (`/producer/panel/capacity`), w tym listę krajów dostawy (zapis do `producer_delivery_country`, dziś możliwy tylko skryptem importu), i wysyła profil do weryfikacji. Wysłanie zmienia status z `not_submitted` na `pending`. Edycja po zatwierdzeniu nie zmienia statusu (zgodnie z 0037). Administrator może te kraje poprawić na ekranie producenta.
- **AC-6**: Klient podaje NIP i nazwę firmy w panelu (`/panel/profile`). Zapis ustawia `b2bVerificationStatus` na `pending` (akcja `submitClientB2bDetails` podpięta).
- **AC-7**: Pusty stan tablicy producenta (producent niezatwierdzony) prowadzi do formularza profilu z AC-5, a nie do ogólnego panelu.

Część B (przetarg i podsumowanie):
- **AC-8**: `submitProjectRequest` i `submitBulkProductInquiry` przyjmują `unitCount`, jedną dokładną liczbę całkowitą od 3, bez zakresu i bez plusa. Baza ma kolumnę `unit_count` NOT NULL z ograniczeniem `CHECK >= 3` na obu tabelach, a kolumny `unit_count_min` i `unit_count_max` znikają (po przejściu kodu, patrz AC-27). Formularze, maile i teksty (pl, en, de, nl) mówią "od 3 domów" tylko jako próg, a liczba w zapytaniu jest jedną liczbą ("12 domów", nigdy "12+" ani "10 do 20"). Pod polem liczby domów jest wskazówka: kto nie zna dokładnej liczby, podaje liczbę pierwszego etapu i opisuje resztę w uwagach (`extras_note` lub `note`), bez trybu orientacyjnego. Przy 1 lub 2 domach formularz pokazuje wskazówkę o zwykłej ścieżce zapytania.
- **AC-9**: Każde nowe zapytanie dostaje `deadline_at` równy chwili złożenia plus 14 dni oraz `contact_locale` z języka strony, na której zostało złożone. Administrator może zmienić termin (przedłużyć lub skrócić), a zmiana jest w dzienniku audytu.
- **AC-10**: Producent widzi zapytanie na tablicy i może złożyć ofertę tylko wtedy, gdy spełnia regułę dopasowania z sekcji "Dopasowanie" poniżej. Ta sama funkcja steruje listą, szczegółem i walidacją w `submitProjectQuote`. Administrator może dodać lub wykluczyć producenta wyjątkiem, a zapytanie bez żadnego dopasowanego producenta wywołuje alert do zespołu.
- **AC-11**: Oferta ma wspólny format: tryb ceny (netto lub brutto) ze stawką VAT, cena łączna i opcjonalnie za sztukę, zakres w cenie, zakres poza ceną, transport, montaż i dźwig (każda pozycja jako kwota, widełki lub "do późniejszej wyceny"), plan płatności, ważność oferty (data), gwarancja, termin produkcji w tygodniach, okno dostawy, opcjonalny PDF. Pola obowiązkowe: tryb ceny, cena łączna, zakres w cenie, ważność oferty. Dalej obowiązuje jedna aktywna wycena producenta na zapytanie.
- **AC-12**: Oferty i lista na tablicy są dostępne dla zapytań w statusie `open`, `quoted` lub `published`, do `deadline_at`. Po terminie, po wyborze klienta (`selected_quote_id` ustawione) i po zamknięciu zapytania nowa oferta jest odrzucana z komunikatem, a warunki są sprawdzane w SQL obu kroków zapisu oferty (zastąpienie poprzedniej wersji i wstawienie nowej), nie tylko w odczycie przed nim. Gdy administrator przedłuży termin, producenci mogą składać oferty, a nowe oferty nie są widoczne dla klienta do ponownej publikacji.
- **AC-13**: Klient nie widzi żadnej oferty, dopóki nie ma ona `published_to_client_at`. Warunek jest w zapytaniach SQL klienta i w plikach PDF, nie tylko w interfejsie. Złożenie oferty nie wysyła klientowi żadnego maila ani linku logującego (dzisiejsze `notifyContactOfNewQuote` jest usunięte z tej ścieżki), bo zdradzałoby istnienie ofert przed publikacją.
- **AC-14**: Administrator publikuje podsumowanie jedną akcją. Akcja wymaga co najmniej jednej aktywnej oferty i potwierdzenia, że administrator przejrzał PDF i teksty ofert pod kątem danych kontaktowych producenta, ustawia `published_to_client_at` na aktywnych ofertach, status zapytania na `published` i `summary_published_at`. Przed publikacją administrator może dopisać do każdej oferty komentarz ModularHub (`advisor_note`), bez oceny i bez punktacji. Producent, którego oferta jest opublikowana, nie może złożyć nowej wersji, dopóki administrator nie cofnie jej publikacji akcją `unpublishQuote`.
- **AC-15**: Klient widzi podsumowanie jako tabelę porównawczą generowaną z pól ofert, z nazwami producentów, ale bez e maila, telefonu i adresu strony producenta w polach systemu, oraz oryginalne pliki PDF ofert jako załączniki. Dane kontaktowe, które producent wpisał w treści oferty lub w PDF, wychwytuje przegląd administratora z AC-14. Dla zapytania o konkretny produkt (jedna oferta) tabela ma jedną kolumnę.
- **AC-16**: Klient wybiera jedną opublikowaną, aktywną ofertę i może zmienić wybór aż do połączenia stron. Wybór zapisuje `selected_quote_id` i `selected_at` na zapytaniu (jeden wiersz, bez indeksu unikalnego na ofertach) i nie ujawnia kontaktu. Gdy wybór istnieje, nowe oferty są blokowane.
- **AC-17**: Połączenie stron wykonuje jedna funkcja `connectSelection(zapytanie)`, wołana po wyborze, po zatwierdzeniu B2B klienta, przez godzinne zadanie czyszczące i przez przycisk w adminie. Funkcja jest idempotentna i czyta stan B2B i wyboru w samym SQL: gdy zapytanie ma wybór, a `b2bVerificationStatus` klienta to `approved`, w jednym `db.batch` ustawia `contact_revealed_at` i `accepted` na wybranej ofercie, `rejected` na pozostałych aktywnych, status `accepted` na zapytaniu. Jeśli B2B nie jest zatwierdzone, wybór czeka, a zespół dostaje powiadomienie. Kolejność "najpierw zapis faktu, potem wywołanie połączenia" po obu stronach (wybór i zatwierdzenie B2B) gwarantuje, że wyścig między nimi nie zostawi wyboru oczekującego na zawsze.
- **AC-18**: Zwycięski producent potwierdza wynik (`signed`, `no_agreement`, `withdrew`) w panelu ofert. Pozostali producenci z aktywną ofertą dostają neutralną informację bez nazwy zwycięzcy i bez cen.
- **AC-19**: Administrator zamyka zapytanie z powodem (`client_cancelled`, `no_offers`, `expired`, `staff_closed`). Producenci z aktywną ofertą dostają neutralną informację. Klient może wznowić zamknięte zapytanie przez 30 dni od zamknięcia, wznowienie ustawia nowy termin plus 14 dni.
- **AC-20**: Administrator może złożyć zapytanie w imieniu klienta na `/internal/large-orders/new`. Formularz wymaga potwierdzenia, że klient wyraził zgodę (pole tekstowe `staff_consent_note`) i jawnego wyboru języka klienta (pl, en, de lub nl, bez wartości domyślnej, bo admin pracuje po polsku). Zapytanie ma znacznik `created_by_staff_user_id`, klient dostaje mail o złożeniu zapytania w jego imieniu we wskazanym języku i może się zalogować linkiem.
- **AC-21**: Zapytanie o konkretny produkt (`bulk_product_inquiry`) ma ten sam termin, tę samą bramkę publikacji, ten sam wybór i połączenie co przetarg. Odbiorcą oferty pozostaje producent produktu, bez reguły dopasowania.
- **AC-22**: Producent nigdy nie widzi liczby ani treści cudzych ofert ani danych kontaktowych klienta przed `contact_revealed_at`. Na tablicy widzi tylko termin zapytania i stan własnej oferty, nie status zapytania (`open` lub `quoted` zdradzałoby, że ktoś inny już złożył ofertę). Wszystkie akcje administratora na tych danych idą przez `withAdminActor` (audyt, spec 0064), a administrator ma własną ścieżkę do PDF ofert (`getProjectQuotePdfUrl` obsługuje rolę `admin`).

Część C (powiadomienia i języki):
- **AC-23**: Każdy mail tej funkcji jest wysyłany w języku odbiorcy: do klienta według `contact_locale` zapytania (pl, en, de, nl), do producenta po polsku, do zespołu po polsku. Link logujący w mailu do klienta prowadzi do `/{contact_locale}/panel/quotes`, nie do `/pl/panel`.
- **AC-24**: Maile wysyłane są w tych zdarzeniach: nowe zapytanie (do zespołu i do dopasowanych producentów od razu), nowa oferta (do zespołu), opublikowane podsumowanie (do klienta, z linkiem, bez wymogu konta), wybór oczekujący na B2B (do zespołu), połączenie (do klienta i producenta, zespół w kopii), neutralna informacja dla przegranych, zamknięcie zapytania (do producentów z ofertą), zapytanie złożone przez doradcę (do klienta).
- **AC-25**: Przypomnienia o terminie wysyła zadanie cykliczne: do dopasowanych producentów bez aktywnej oferty 3 dni i 1 dzień przed `deadline_at`, a w dniu terminu alert do zespołu z liczbą ofert. Każde przypomnienie wychodzi dokładnie raz dzięki `project_notification_log`. Błąd wysyłki nie cofa żadnego zapisu i trafia do Sentry.
- **AC-26**: Wszystkie nowe teksty ekranów klienta i maili mają prawdziwe tłumaczenia w pl, en, de i nl. Sprawdza to nowy test zgodności kluczy w `messages/*.json` (czterojęzyczny, w Vitest), bo `npm run check:translations` dotyczy tylko tłumaczeń danych produktów w bazie i pozostaje na zero braków.

Część B, dopisek (liczba domów, zmiana z 2026-10-12):
- **AC-27**: Migracja przenosi stare zapytania na jedną liczbę, tak samo na dev i prod. Dla każdego wiersza `project_request` i `bulk_product_inquiry`: `unit_count = unit_count_min`. Gdy `unit_count_max` był ustawiony i różny od `unit_count_min`, do `extras_note` (`project_request`) lub `note` (`bulk_product_inquiry`) dopisuje się zdanie "Pierwotnie podany zakres: {min} do {max} domów." Gdy `unit_count_max` było puste (formularz pokazywał "{min}+"), dopisuje się "Pierwotnie podano: co najmniej {min} domów." Zdanie dodaje się w nowej linii po istniejącej treści, a przy pustej lub brakującej treści jest całą treścią (`CASE WHEN ... IS NULL OR ... = '' THEN zdanie ELSE treść || E'\n' || zdanie END`, bo sama konkatenacja z NULL dałaby NULL i zgubiła zdanie). Po migracji nie ma wiersza z `unit_count < 3` ani z pustym `unit_count`. Kolumny `unit_count_min` i `unit_count_max` są usuwane osobną, późniejszą migracją, po tym jak kod przestanie je czytać (rozszerz i zwęż, patrz plan migracji). Funkcja dopasowania, ekrany admina i producenta oraz maile czytają wyłącznie `unit_count`.

Część D (załączniki inwestora, zmiana z 2026-10-12, szczegóły w [części D](0070-czesc-d-zalaczniki-inwestora.md)):
- **AC-28**: Inwestor dołącza pliki do wolnego zapytania i do zapytania o produkt: przy składaniu (zaraz po zapisie zapytania) i później, aż do wyboru oferty. Dozwolone typy: PDF, JPEG, PNG, WebP, rozpoznawane po sygnaturze bajtów, nie po rozszerzeniu ani nagłówku przeglądarki. Limity na zapytanie: 10 aktywnych plików (usunięte nie liczą się, ukryte tak), 20 MB na plik, 60 MB łącznie aktywnych, a do tego drugi, twardy limit 30 wierszy i 150 MB wszystkich plików, które nie zostały jeszcze usunięte z R2 (`purged_at IS NULL`), żeby wgrywanie i usuwanie w pętli nie omijało limitu. PDF z `/Encrypt`, `/JavaScript`, `/JS` lub `/Launch` jest odrzucany jako prosta heurystyka (nie jest to ochrona przed celowo przygotowanym plikiem, patrz Security model); `/OpenAction` nie jest odrzucane, bo występuje w zwykłych PDF z programów CAD i edytorów. Limity i stan zapytania (status `open`, `quoted` lub `published`, brak `selected_quote_id`) są sprawdzane w bazie przy zapisie wiersza (wyzwalacz z blokadą doradczą, patrz Key invariants), nie tylko przed nim. Klient i gość zmieniają pliki (dodają, usuwają) tylko przed `deadline_at` i przed `summary_published_at`; później zmienia je wyłącznie admin, bo producent nie może już złożyć nowej wersji oferty i porównanie w podsumowaniu byłoby nieaktualne.
- **AC-29**: Wgrywanie przez gościa bez konta działa na tokenie. Akcje składające zapytanie zwracają `uploadToken` (HMAC z identyfikatora zapytania, ważny 2 godziny). Wgranie pliku wymaga jednego z trzech: ważnego tokenu, sesji klienta będącego właścicielem zapytania albo roli admin. Każdy plik jest osobnym wywołaniem akcji. Gdy wgranie pliku zawiedzie, zapytanie pozostaje złożone, a klient widzi, który plik się nie wgrał i jak dodać go później (po zalogowaniu, albo przez ModularHub).
- **AC-30**: Pliki są w prywatnym magazynie R2 (`private-r2-client`), pod losowym kluczem, nigdy publicznie. Jedyną drogą odczytu jest akcja `getInquiryAttachmentUrl`, która po sprawdzeniu uprawnień generuje podpisany link ważny 10 minut z nagłówkiem pobrania jako załącznik (nigdy inline), na nowo przy każdym wywołaniu i bez zapisu. Nazwa pliku jest oczyszczona (bez znaków sterujących i ścieżek, do 120 znaków). Brak uprawnień i brak pliku dają ten sam komunikat "nie znaleziono".
- **AC-31**: Widoczność plików. Admin widzi wszystkie pliki zawsze. Klient będący właścicielem widzi swoje pliki, także ukryte przez ModularHub (z oznaczeniem). Producent widzi pliki od razu po wgraniu, bez przeglądu admina, i niezależnie od `contact_revealed_at`, gdy nie jest zablokowany ani usunięty (warunek 1 dopasowania) i jest dopasowany do zapytania (ta sama funkcja co AC-10; dla zapytania o produkt: producent produktu), a zapytanie ma status `open`, `quoted` lub `published`, albo gdy ma na nim ofertę `active` (przy statusie `open`, `quoted` lub `published`) lub `accepted` (zawsze). Zablokowany producent traci dostęp także przy ofercie. Przy zapytaniu zamkniętym dostęp zachowuje tylko producent z ofertą `accepted`. Plik ukryty (`hidden_at`) lub usunięty (`deleted_at`) znika producentowi natychmiast. Inni producenci nie widzą plików nigdy. Dane kontaktowe inwestora w polach systemu pozostają maskowane do `contact_revealed_at` (AC-22).
- **AC-32**: Ochrona danych kontaktowych inwestora w plikach opiera się na trzech rzeczach. Po pierwsze, przed wgraniem inwestor widzi ostrzeżenie i zaznacza zgodę "W plikach nie ma moich danych kontaktowych"; akcja wgrania wymaga tego potwierdzenia. Po drugie, administrator widzi w szczegółach zapytania listę plików (kto wgrał, kiedy, rozmiar, typ), otwiera je i może je ukryć akcją `hideInquiryAttachment` (obowiązkowy powód, zapis w audycie przez `withAdminActor`) oraz przywrócić. Po trzecie, automatyczny skaner danych kontaktowych jest w Follow-up, bez niego plik nie czeka na zatwierdzenie.
- **AC-33**: Usuwanie i wymiana. Klient-właściciel, gość z ważnym tokenem (tylko pliki `guest` tego samego zapytania, żeby mógł cofnąć pomyłkę) lub admin usuwa plik miękko (`deleted_at`), dla klienta i gościa do wyboru oferty (`selected_quote_id` puste, status zapytania nie `accepted` ani `closed`), do `deadline_at` i do `summary_published_at` (AC-28). Admin dodaje, usuwa i ukrywa pliki zawsze, w każdym stanie zapytania (warunki stanu z AC-28 dotyczą tylko klienta i gościa, w SQL rozdzielone według `uploaded_by_kind`), a limity liczby i rozmiaru obowiązują także jego. Wymiana to nowy plik plus usunięcie starego, bez edycji w miejscu. Godzinne zadanie czyszczące (zadanie 17) usuwa obiekt z R2 30 dni po `deleted_at` i ustawia `purged_at`. Producent z aktywną ofertą widzi znacznik "Pliki zmieniono po złożeniu Twojej oferty", gdy `attachments_changed_at` zapytania (kolumna na obu tabelach zapytań, ustawiana w tym samym zapisie co każda zmiana pliku: wgranie, usunięcie, ukrycie, przywrócenie) jest późniejsze niż chwila złożenia jego aktywnej oferty. Zmiana plików nie wysyła maila. Wznowienie zamkniętego zapytania (AC-19) czyści wybór klienta, więc klient znów może zmieniać pliki.
- **AC-34**: Doradca. Admin składający zapytanie w imieniu klienta (`createRequestOnBehalf`, AC-20) może dołączyć pliki w tym samym formularzu, a każdy admin może dodawać i usuwać pliki w dowolnym zapytaniu (`uploaded_by_kind = 'staff'`, audyt). Tekst pola `staff_consent_note` mówi, że zgoda klienta obejmuje przekazanie plików dopasowanym producentom. Pliki wgrane przez doradcę podlegają tym samym limitom, typom i ukrywaniu.

## Decision

**Chosen option**: Option 2: przetarg z automatycznym dopasowaniem i podsumowaniem publikowanym przez ModularHub.

Zapytanie jest widoczne dla producentów dopasowanych regułą, oferty są ukryte przed klientem do publikacji podsumowania przez ModularHub, klient wybiera jedną ofertę, a ModularHub łączy strony i zapisuje zwycięzcę.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

Wspólny kontrakt dla trzech części.

**Data model sketch**:

Zmiany w `project_request` i `bulk_product_inquiry` (te same nowe pola na obu):

| Pole | Typ | Uwagi |
|---|---|---|
| `deadline_at` | timestamptz, NOT NULL, default `now() + interval '14 days'` | Domyślną wartość w bazie ustawia migracja (dodanie kolumny, uzupełnienie istniejących wierszy, dopiero potem NOT NULL). Dla istniejących niezamkniętych zapytań uzupełnienie to `greatest(created_at + 14 dni, now() + 14 dni)`, żeby żadne nie było od razu po terminie. |
| `selected_quote_id` | uuid, nullable, FK do `project_quote.id` | Wybór klienta przed połączeniem. Zmiana wyboru to zapis jednego wiersza zapytania, bez indeksu unikalnego na ofertach (wcześniejszy pomysł z `UPDATE` na wielu wierszach i częściowym indeksem unikalnym nie jest bezpieczny, bo Postgres sprawdza taki indeks wiersz po wierszu). |
| `selected_at` | timestamptz, nullable | Chwila wyboru, ustawiana razem z `selected_quote_id`. |
| `contact_locale` | text, NOT NULL, default `pl` | `CHECK` na pl, en, de, nl. Ustawiane z języka strony przy składaniu. |
| `created_by_staff_user_id` | text, nullable, FK do `users.id` | Ustawiane, gdy zapytanie składa doradca. |
| `staff_consent_note` | text, nullable | `CHECK`: wymagane, gdy `created_by_staff_user_id` jest ustawione. |
| `summary_published_at` | timestamptz, nullable | Pierwsza publikacja podsumowania. |
| `closed_at` | timestamptz, nullable | |
| `closed_reason` | enum `bulk_close_reason`, nullable | `client_cancelled`, `no_offers`, `expired`, `staff_closed`. `CHECK`: `status = 'closed'` wtedy i tylko wtedy, gdy `closed_at` i `closed_reason` są ustawione. Migracja uzupełnia istniejące zamknięte wiersze (`closed_at = updated_at`, `closed_reason = staff_closed`). |
| `attachments_changed_at` | timestamptz, nullable | Chwila ostatniej zmiany plików zapytania (wgranie, usunięcie, ukrycie, przywrócenie), ustawiana w tym samym zapisie co zmiana. Służy do znacznika "pliki zmieniono po złożeniu oferty" (AC-33). Dodana w migracji 4. |
| `unit_count` | integer, NOT NULL | Jedna dokładna liczba domów, `CHECK >= 3` (nazwa constraintu `project_request_unit_count` i `bulk_product_inquiry_unit_count`). Zastępuje `unit_count_min` i `unit_count_max`. Dodana nullable, uzupełniona z `unit_count_min`, dopiero potem NOT NULL. Dawne `unit_count_min` traci NOT NULL i swoje `CHECK >= 10` w tej samej migracji, a obie stare kolumny znikają osobną późniejszą migracją (rozszerz i zwęż). Dla wierszy z dawnym zakresem zdanie o pierwotnym zakresie trafia do `extras_note` lub `note` (AC-27). Do migracji 5 nowy kod zapisuje też `unit_count_min = unit_count`, a tymczasowy wyzwalacz BEFORE INSERT ustawia `unit_count := coalesce(unit_count, unit_count_min)`, dzięki czemu stary kod nadal wstawia wiersze i wycofanie samego kodu jest bezpieczne. Wyzwalacz znika w migracji 5. |

Status `bulk_request_status` dostaje wartość `published` (obok `open`, `quoted`, `accepted`, `closed`). Wszystkie dzisiejsze filtry `open` lub `quoted` (`getOpenProjectRequestsForBoard`, `getProjectRequestForBoardDetail`, `submitProjectQuote`) rozszerzamy o `published`, inaczej zapytanie po publikacji znika z tablicy i przedłużenie terminu nic nie daje.

Zmiany w `project_quote`:

| Pole | Typ | Uwagi |
|---|---|---|
| `price_tax_mode` | enum `net` lub `gross`, NOT NULL, default `net` | |
| `vat_rate_percent` | numeric(4,1), nullable | |
| `scope_included` | text, nullable w bazie, wymagane w akcji | Co jest w cenie. |
| `scope_excluded` | text, nullable | |
| `logistics` | jsonb, NOT NULL, default `{}` | Sprawdzane schematem Zod: `transport`, `assembly`, `crane`, każdy `{ mode: "amount" lub "range" lub "tbd", amountCents, maxAmountCents, note }`. |
| `payment_plan` | text, nullable | |
| `valid_until` | date, nullable w bazie, wymagane w akcji | |
| `warranty_note` | text, nullable | |
| `delivery_window_from`, `delivery_window_to` | date, nullable | `CHECK` do nie wcześniej niż od. |
| `advisor_note` | text, nullable | Komentarz ModularHub, widoczny klientowi po publikacji. |
| `published_to_client_at` | timestamptz, nullable, **tymczasowy default `now()`** | Bramka widoczności dla klienta. Default `now()` w migracji 1 sprawia, że oferty złożone w tygodniu 1 pozostają widoczne dla klienta. Migracja 2 uzupełnia puste wartości i usuwa default. |
| `producer_outcome` | enum `signed`, `no_agreement`, `withdrew`, nullable | Tylko na zwycięskiej ofercie. |
| `producer_outcome_at` | timestamptz, nullable | |

Nowe tabele:

| Tabela | Pola | Cel |
|---|---|---|
| `project_request_producer_override` | `project_request_id` (FK), `producer_id` (FK), `mode` (`include` lub `exclude`), `created_by_user_id`, `created_at`. Klucz główny złożony (zapytanie, producent). | Wyjątki admina od reguły dopasowania. Dotyczy tylko `project_request`. |
| `project_notification_log` | `id`, `project_request_id` lub `bulk_product_inquiry_id` (dokładnie jedno, `CHECK`), `producer_id` (nullable), `kind` (tekst, np. `reminder_3d`, `reminder_1d`, `deadline_team`), `sent_at`. Unikalność (cel, producent, rodzaj). | Pilnuje, żeby przypomnienie wyszło raz. |
| `inquiry_attachment` | `id` uuid PK; `project_request_id` (FK, nullable) lub `bulk_product_inquiry_id` (FK, nullable), dokładnie jedno (`CHECK`); `r2_key` text NOT NULL (losowy UUID z `buildR2Key`); `filename` text NOT NULL (oczyszczona nazwa do wyświetlenia); `mime_type` text NOT NULL; `size_bytes` integer NOT NULL, `CHECK > 0`; `uploaded_by_kind` text NOT NULL, `CHECK IN ('client','guest','staff')`; `uploaded_by_user_id` text, nullable FK do `users.id` (puste dla gościa), `CHECK`: `uploaded_by_kind = 'guest'` wtedy i tylko wtedy, gdy `uploaded_by_user_id IS NULL`; `created_at`; `hidden_at`, `hidden_reason`, `hidden_by_user_id` (FK do `users.id`), `CHECK`: `hidden_at` ustawione wtedy i tylko wtedy, gdy powód i autor są ustawieni; `deleted_at`, `deleted_by_kind` text (`client` lub `staff`), `CHECK`: oba ustawione razem albo oba puste; `purged_at` (chwila usunięcia obiektu z R2, ustawiana przez zadanie czyszczące). Indeksy częściowe na `project_request_id` i `bulk_product_inquiry_id` z warunkiem `deleted_at IS NULL`. | Pliki inwestora. Osobna tabela zamiast `document`, bo `document.owner_user_id` jest NOT NULL i wskazuje użytkownika, którego gość nie ma. Typ i status w kolumnach tekstowych z `CHECK`, nie w enumach Postgresa (enum jest nieodwracalny). Bez `ON DELETE CASCADE`, bo zapytania nie są usuwane. |

Istniejące `contact_revealed_at` zostaje i jest jedynym znacznikiem ujawnienia kontaktu producentowi.

**Dopasowanie** (jedna funkcja zapytania, używana na liście, w szczególe i w `submitProjectQuote`). Producent widzi `project_request` R, gdy:
1. jego `volumeVerificationStatus` to `approved`, nie jest zablokowany ani usunięty, oraz
2. nie ma wyjątku `exclude` dla R, oraz
3. ma wyjątek `include` dla R, albo spełnia wszystkie cztery warunki:
   - kraj dostawy z R jest w `producer_delivery_country` (brak wierszy oznacza brak dopasowania),
   - przynajmniej jedna rodzina z R jest wśród rodzin jego opublikowanych produktów,
   - R nie ma standardu wykończenia, albo lista `completionStandardsSupported` producenta jest pusta, albo go zawiera,
   - `unitsPerMonth` producenta jest puste, albo `unitsPerMonth` razy 12 jest co najmniej `unit_count` z R.

Zapytanie o konkretny produkt nie używa reguły: odbiorcą jest producent produktu.

Uwagi do reguły:
- Dane krajów dostawy dziś zapisują tylko skrypty importu (producenci dostarczani do Polski). Zapytanie z Niemiec lub Holandii nie trafiłoby do nikogo, dopóki producent lub administrator nie doda tych krajów, dlatego AC-5 daje ekran do ich edycji. Dodanie kraju zmienia też widoczność produktów producenta w katalogu tego kraju (`lib/data/projects.ts`), co trzeba sprawdzić przy budowie.
- "Zablokowany" producent znaczy tyle, ile znaczy dziś `ProducerBlockControl` (spec 0055). Wykonawca sprawdza, które pole to ustawia (blokada jest na użytkowniku, a producent ma wielu członków).
- Wyjątek `exclude` dodany po złożeniu oferty blokuje nowe wersje, ale nie usuwa istniejącej oferty. Cofnięcie weryfikacji wolumenowej po złożeniu oferty też nie usuwa oferty (zgodnie z 0062 AC-12).
- Odwrotna funkcja `getMatchedProducersForRequest` (lista producentów dla zapytania) korzysta z tych samych warunków i służy adminowi oraz mailom.
- Przy progu 3 warunek mocy (`unitsPerMonth` razy 12) prawie nic nie filtruje, ale zostaje, bo zespół wybrał go jako twarde kryterium i działa dla większych zapytań.
- Wskazówka pod polami formularza zapytania ("widzą wszyscy zweryfikowani producenci", 0062 AC-10) zmienia się na "widzą dopasowani producenci".

**State transitions**:

`project_request` i `bulk_product_inquiry`: `open` (zbieramy oferty) → `quoted` (jest co najmniej jedna aktywna oferta) → `published` (podsumowanie opublikowane) → `accepted` (połączenie wykonane) → `closed`. Z każdego stanu poza `accepted` administrator może przejść do `closed` z powodem. Zamknięte zapytanie wraca do `open` lub `quoted` (wznowienie przez klienta w 30 dni, nowy termin). Wybór klienta przed połączeniem nie zmienia statusu zapytania, tylko ustawia `selected_quote_id`. Zapytanie bez ofert po terminie zostaje w `open` do czasu zamknięcia przez administratora z powodem `expired` (alert "termin minął" z części C przypomina o tym zespołowi). Zwycięstwo zakończone wynikiem `no_agreement` lub `withdrew` zostawia zapytanie w `accepted`, ponowne otwarcie wyboru to ręczna akcja administratora poza tą wersją (patrz Follow-up).

`project_quote.status` (bez zmian): `active`, `superseded`, `accepted`, `rejected`. Widoczność dla klienta zależy od `published_to_client_at`, nie od statusu.

**API surface** (akcje serwerowe, szczegóły w częściach):

| Akcja | Część | Wywołuje | Autoryzacja |
|---|---|---|---|
| `setProducerVolumeVerification`, `setClientB2bVerification` (istnieją, podpięcie UI) | A | admin | rola admin |
| `updateProducerCapacityProfile`, nowa `submitCapacityProfileForReview` | A | producent | rola producent |
| `submitClientB2bDetails` (istnieje, podpięcie UI) | A | klient | rola klient |
| `submitProjectRequest`, `submitBulkProductInquiry` (zmienione) | B | publiczne | brak |
| `submitProjectQuote` (zmieniona: dopasowanie, termin, format) | B | producent | rola producent, dopasowanie |
| `publishSummary`, `unpublishQuote`, `extendDeadline`, `closeRequest`, `setProducerOverride`, `setAdvisorNote`, `connectSelection` (przycisk dla oczekujących) (nowe) | B | admin | rola admin |
| `selectProjectQuote` (zastępuje `acceptProjectQuote`), `reopenRequest` (nowe) | B | klient | rola klient, własne zapytanie |
| `getMatchedProducersForRequest` (odczyt, odwrotna funkcja dopasowania: producenci widzący dane zapytanie) | B | admin, maile | rola admin lub wywołanie serwera |
| `reportQuoteOutcome` (nowa) | B | producent | zwycięski producent |
| `createRequestOnBehalf` (nowa) | B | admin | rola admin |
| `sendDueReminders` (zadanie cykliczne) | C | cron | sekret w nagłówku |
| `uploadInquiryAttachment(kind, inquiryId, file, auth)` (nowa, `FormData`, jeden plik na wywołanie), `deleteInquiryAttachment(attachmentId)` (nowa) | D | klient, gość z tokenem, admin | właściciel zapytania, ważny `uploadToken` albo rola admin |
| `getInquiryAttachmentUrl(attachmentId)`, `listInquiryAttachments(kind, inquiryId)` (nowe, odczyt) | D | klient, producent, admin | zasady widoczności z AC-31 |
| `hideInquiryAttachment(attachmentId, reason)`, `unhideInquiryAttachment(attachmentId)` (nowe) | D | admin | rola admin, `withAdminActor` |
| zadanie czyszczące usuwa obiekty R2 po 30 dniach od `deleted_at` (rozszerzenie zadania godzinnego z części C) | D | cron | sekret w nagłówku |

**Key invariants**:
- Klient dostaje wyłącznie oferty z `published_to_client_at`, w zapytaniach SQL i w linkach do PDF.
- Producent dostaje dane kontaktowe klienta wyłącznie z ofert z `contact_revealed_at`.
- Wybór klienta to jeden zapis `selected_quote_id` i `selected_at` na zapytaniu. Na zapytanie przypada najwyżej jedna oferta `accepted` (istniejący indeks unikalny). Wybrać można tylko ofertę ze statusem `active` i `published_to_client_at`.
- Nowa oferta jest odrzucana, gdy minął `deadline_at`, istnieje `selected_quote_id`, status to `accepted` lub `closed`. Te warunki stoją w SQL obu kroków `db.batch` zapisu oferty (zastąpienie poprzedniej aktywnej oferty i wstawienie nowej), inaczej równoległy wybór klienta zastąpiłby wybraną ofertę.
- Oferta opublikowana nie jest zastępowana nową wersją, dopóki administrator nie cofnie jej publikacji (`unpublishQuote`). Dzięki temu klient widzi zawsze jedną wersję oferty producenta, ze statusem `active`, i nie ma mieszania wersji.
- `connectSelection` czyta B2B i wybór w samym SQL (warunek `EXISTS` w kroku zapisu) i jest idempotentna. Zatwierdzenie B2B i wybór klienta najpierw zapisują swój fakt, a dopiero potem wołają `connectSelection`, więc wyścig między nimi nie zostawia wyboru oczekującego na zawsze. Godzinne zadanie czyszczące (część C) łapie ewentualne zaległości.
- Sterownik `neon-http` nie ma transakcji, więc zapisy wieloetapowe używają `db.batch` z warunkiem `EXISTS`, jak w `acceptProjectQuote`.
- Plik inwestora trafia do tabeli dopiero po poprawnym zapisie obiektu w R2. Limity (10 aktywnych plików, 60 MB aktywnych, 30 wierszy i 150 MB nieusuniętych z R2) i stan zapytania egzekwuje wyzwalacz BEFORE INSERT na `inquiry_attachment`, który najpierw bierze `pg_advisory_xact_lock(hashtext(id zapytania))`, potem liczy i sumuje, a przy przekroczeniu zgłasza błąd (wzór: `enforce_bulk_request_email_limit` z `drizzle/0014`). Sam `INSERT ... SELECT ... WHERE` nie wystarcza, bo przy równoległych wywołaniach każde widzi ten sam stan i atakujący z tokenem wgrałby naraz dziesiątki plików. Wyzwalacz sprawdza też `uploaded_by_kind`: warunki stanu (status, `selected_quote_id`, `deadline_at`, `summary_published_at`) dotyczą `client` i `guest`, nie `staff`. Gdy wstawienie się nie powiedzie, akcja próbuje usunąć właśnie zapisany obiekt z R2 (najlepszy wysiłek, błąd trafia do Sentry) i zwraca komunikat. Akcje serwerowe sprawdzają te same warunki przed zapisem, żeby błąd był czytelny, ale prawdziwą granicą jest wyzwalacz.
- Producent dostaje link do pliku inwestora wyłącznie z `getInquiryAttachmentUrl`, która liczy uprawnienie za każdym razem tą samą funkcją dopasowania co lista zapytań (AC-10). Wartość `contact_revealed_at` nie bramkuje plików, bo producent potrzebuje planów do oferty, a kontakt inwestora w polach systemu pozostaje maskowany.
- Plik ukryty lub usunięty jest niewidoczny dla producenta od następnego odczytu. Link wydany wcześniej wygasa po najwyżej 10 minutach, co jest zaakceptowanym oknem.

**Security model**:
- Admin: pełny dostęp do zapytań i ofert, każda zmiana przez `withAdminActor` (dziennik audytu).
- Producent: widzi tylko zapytania spełniające regułę dopasowania (bez kontaktu) i własne oferty. Kontakt klienta dopiero od `contact_revealed_at`. Nie widzi cudzych ofert ani ich liczby.
- Klient: widzi własne zapytania (po `clientId` lub dopasowaniu e mail przy logowaniu, jak w 0037) i opublikowane oferty. Nie widzi kontaktów producentów.
- Dane osobowe klienta (imię, e mail, telefon) przekazujemy producentowi po zgodzie wyrażonej wyborem, co do treści zgody rozstrzyga prawnik (poza tą specyfikacją). Zapytanie składane przez doradcę wymaga zapisu zgody klienta.
- PDF ofert nadal w prywatnym magazynie, tylko przez podpisany link, widoczny dla klienta dopiero po publikacji.
- Pliki inwestora (część D): ten sam prywatny magazyn, bez publicznej domeny. Anonimowy gość może wgrywać, więc obowiązują: token HMAC wiązany z identyfikatorem zapytania i terminem (klucz z `AUTH_SECRET` z osobnym prefiksem celu, porównanie w stałym czasie), twarde limity liczby i rozmiaru na zapytanie, istniejący limit otwartych zapytań na e mail oraz walidacja zawartości (sygnatura, brak aktywnych elementów PDF). Pobranie zawsze jako załącznik, nigdy wyświetlenie na naszej domenie, z nagłówkiem `filename*=UTF-8''...` i zapasową nazwą ASCII (polskie znaki). Odrzucanie `/JavaScript`, `/JS` i `/Launch` w PDF to heurystyka na surowych bajtach, którą obejdzie nazwa w skompresowanym strumieniu lub zapisana z `#xx`; nie jest to ochrona przed celowo przygotowanym plikiem, dlatego pliki są pobierane, nie wyświetlane, a antywirus jest w Follow-up. Limit otwartych zapytań na e mail liczy niezweryfikowany adres, więc nowy adres daje nowe zapytanie i nowy token; dlatego dochodzi dzienny globalny limit bajtów wgrywanych przez gości (próg w zmiennej `GUEST_UPLOAD_DAILY_BYTES`, domyślnie 500 MB), po którego przekroczeniu wgrania gości są odrzucane z komunikatem, a zespół dostaje alert. Wyzwalacz limitu e maili z `drizzle/0014` liczy tylko `open` i `quoted`; wykonawca dopisuje do niego `published`. `uploadToken` żyje tylko w stanie komponentu i w odpowiedzi akcji, nigdy w adresie URL (historia przeglądarki, nagłówek Referer). Nazwa pliku jest oczyszczana przed zapisem i przed wstawieniem do nagłówka pobrania. Ukrycie pliku przez admina idzie przez `withAdminActor`. Pliki mogą zawierać dane osobowe inwestora (adres działki, nazwiska na rysunkach), więc dotyczą ich te same zasady co danych kontaktowych w zgodzie z prawnikiem (Follow-up), a usunięcie przez klienta kasuje obiekt po 30 dniach.
- Dane kontaktowe inwestora w treści plików (stopka rysunku, wizytówka) nie są wykrywane automatycznie w tej wersji. Ochrona to ostrzeżenie i zgoda przy wgrywaniu, przegląd i ukrycie przez admina po fakcie oraz zasada dostępu do przetargów w regulaminie. Wpływa to na ryzyko obejścia platformy opisane w Consequences.

**Configuration required**:
- `OPERATIONS_NOTIFY_EMAIL`: adres zespołu na alerty i powiadomienia.
- `CRON_SECRET`: sekret zadania cyklicznego przypomnień.
- `vercel.json` z harmonogramem zadania (raz na godzinę). Zadania cykliczne Vercel działają tylko w środowisku produkcyjnym, więc staging testuje się wywołaniem ręcznym.
- Załączniki (część D) korzystają z `PRIVATE_R2_BUCKET_NAME`, `PRIVATE_R2_ACCESS_KEY_ID`, `PRIVATE_R2_SECRET_ACCESS_KEY` i `AUTH_SECRET`, a dodają jedną opcjonalną zmienną: `GUEST_UPLOAD_DAILY_BYTES` (dzienny globalny limit bajtów od gości, domyślnie 500 MB). Limit ciała akcji serwerowej i `proxyClientMaxBodySize` wynoszą już 24 MB (spec 0063), a pliki idą po jednym na wywołanie. To limity Next.js. Funkcje Vercel mogą mieć własny, niższy limit ciała żądania (około 4,5 MB, błąd 413), którego tu nie zweryfikowano. Wykonawca sprawdza to w zadaniu 20 na wdrożeniu podglądowym z plikiem 10 MB (dotyczy też PDF oferty z 0063). Jeśli limit obowiązuje, plan awaryjny to wgrywanie bezpośrednio do prywatnego R2 przez podpisany link PUT (CORS na kubełku) i akcja kończąca, która czyta obiekt, waliduje bajty i wstawia wiersz, albo tymczasowy limit pliku 4 MB. Do dodania: nazwa zdarzenia `inquiry_attachment_uploaded` w `lib/observability/types.ts` (bez nazw plików w zdarzeniach i w Sentry).

**Critical test scenarios** (każdy mapuje się na AC):
- Ścieżka od początku do końca: zapytanie, dopasowani producenci dostają mail, dwóch składa ofertę, admin publikuje, klient wybiera, połączenie, zwycięzca potwierdza wynik, verifies **AC-9, AC-10, AC-11, AC-14, AC-15, AC-16, AC-17, AC-18, AC-24**.
- Klient bez konta: dostaje mail z linkiem po publikacji, loguje się i widzi tabelę, verifies **AC-13, AC-15, AC-23**.
- Dopasowanie: producent z krajem, rodziną i mocą widzi zapytanie, a producent bez kraju nie widzi i nie może złożyć oferty bezpośrednim wywołaniem akcji, verifies **AC-10**.
- Wyjątki: wykluczony producent traci dostęp, dodany bez dopasowania dostaje dostęp, verifies **AC-10**.
- Ukrycie: klient nie widzi nieopublikowanej oferty ani jej PDF, nawet znając identyfikator, a złożenie oferty nie wysyła mu maila, verifies **AC-13**.
- Termin: oferta po terminie odrzucona, po przedłużeniu przyjęta ale niewidoczna dla klienta do ponownej publikacji, także dla zapytania w statusie `published`, verifies **AC-12**.
- Wyścig wyboru i oferty: producent składa nową wersję w chwili, gdy klient wybiera ofertę, wybrana oferta pozostaje `active`, verifies **AC-12, AC-16**.
- Wybór bez B2B: wybór zapisany jako oczekujący, zatwierdzenie B2B uruchamia połączenie, także gdy oba zdarzenia nastąpią jednocześnie, verifies **AC-17**.
- Zmiana wyboru przed połączeniem poprawna, po połączeniu odmowa, verifies **AC-16**.
- Cofnięcie publikacji oferty pozwala producentowi na nową wersję, bez cofnięcia nowa wersja jest odrzucona, verifies **AC-14**.
- Producent widzi na tablicy termin i stan własnej oferty, nie status zapytania, verifies **AC-22**.
- Dopasowanie z krajem dostawy DE: producent bez wpisu kraju nie widzi zapytania, po dodaniu kraju w formularzu widzi je, verifies **AC-5, AC-10**.
- Próg 3: zapytanie na 2 domy odrzucone, na 3 przyjęte, verifies **AC-8**
- Jedna liczba: zapytanie z zakresem (pole `unitCountMax`) nie jest już przyjmowane, a mail do zespołu i ekrany pokazują "12 domów", nigdy "12+", verifies **AC-8**
- Migracja liczby: wiersz z dawnym zakresem 10 do 20 dostaje `unit_count = 10` i zdanie o zakresie dopisane na końcu istniejących uwag, wiersz bez zakresu nie zmienia uwag, verifies **AC-27**
- Załączniki, ścieżka pozytywna: zapytanie, token, trzy pliki (PDF, JPEG, PNG), producent dopasowany widzi je i pobiera, producent niedopasowany dostaje "nie znaleziono", verifies **AC-28, AC-30, AC-31**
- Załączniki, gość: wgranie bez tokenu odrzucone, z tokenem po 2 godzinach odrzucone, z ważnym przyjęte, verifies **AC-29**
- Załączniki, walidacja: plik .pdf z treścią obrazu, PDF z `/JavaScript`, plik 21 MB, 11. plik i przekroczenie 60 MB są odrzucone, verifies **AC-28**
- Załączniki, ukrycie: admin ukrywa plik, producent traci do niego dostęp przy następnym odczycie, klient widzi go z oznaczeniem, verifies **AC-31, AC-32**
- Załączniki, po wyborze: klient nie wgra ani nie usunie pliku po `selected_quote_id`, admin może ukryć, verifies **AC-33**
- Załączniki, znacznik zmian: producent z aktywną ofertą widzi znacznik po usunięciu pliku przez klienta, bez wysłanego maila, verifies **AC-33**
- Załączniki, doradca: admin składa zapytanie w imieniu klienta z plikiem i dodaje drugi plik później, wpis w audycie, verifies **AC-34**
- Załączniki, czyszczenie: obiekt usunięty 31 dni temu znika z R2 i dostaje `purged_at`, usunięty 29 dni temu zostaje, verifies **AC-33**.
- Producent nie widzi cudzych ofert ani kontaktu przed ujawnieniem, verifies **AC-22**.
- Przypomnienie wychodzi raz, mimo dwukrotnego uruchomienia zadania, verifies **AC-25**.
- Doradca składa zapytanie bez zapisu zgody: odmowa, verifies **AC-20**.

## Build plan

Podejście do budowy nie jest zapisane dla tej funkcji, więc zakładam kawałki pionowe od początku do końca (tracer bullet), po jednym tygodniu na kawałek. Tydzień 1 odblokowuje obecną ścieżkę bez zmiany modelu, tydzień 2 wprowadza nowy model, tydzień 3 domyka maile, testy i pilotaż.

Tydzień 1 (części A i C):
1. [x] Migracja 1, dodająca wszystkie nowe kolumny i tabele z sekcji "Data model sketch" bez zmiany progu (kolumny nullable lub z domyślną wartością, wartość `published` w enumie, `deadline_at` dodane w trzech krokach: kolumna, uzupełnienie, NOT NULL; `published_to_client_at` z tymczasowym `DEFAULT now()`; uzupełnienie `closed_at` dla istniejących zamkniętych zapytań). Sprawdzić na osobnej gałęzi Neon, satisfies **AC-9, AC-13**
2. [x] Ekran admina "Duże zamówienia": lista i szczegóły (tylko odczyt), pozycja w pasku bocznym, satisfies **AC-1, AC-2, AC-22**
3. [x] Ekrany zatwierdzeń: weryfikacja wolumenowa producentów i weryfikacja B2B klientów, podpięcie istniejących akcji, satisfies **AC-3, AC-4**
4. [x] Formularz profilu zdolności w panelu producenta z listą krajów dostawy (zapis do `producer_delivery_country`, edycja także przez admina, sprawdzenie wpływu na katalog krajowy) i wysłaniem do weryfikacji, poprawka pustego stanu tablicy, satisfies **AC-5, AC-7**
5. [x] Formularz NIP i firmy w panelu klienta, satisfies **AC-6**
6. [x] Wspólny nadawca maili z językiem odbiorcy, tłumaczenia pl, en, de, nl, `contact_locale` przy składaniu zapytania, mail "nowe zapytanie" do zespołu, test zgodności kluczy `messages/*.json` w czterech językach, satisfies **AC-9 (część: język), AC-23, AC-24 (część), AC-26**. Zbudowane: `contact_locale` zapisywany z języka strony, mail do zespołu (`lib/notifications/large-order-team.ts`), test tłumaczeń. Link logujący `/{contact_locale}/panel/quotes` z AC-23 dochodzi w zadaniu 11 razem z mailem o publikacji

Tydzień 2 (część B):
7. Migracja 2 (rozszerz) i zmiany walidacji: dodanie `unit_count` nullable na obu tabelach, uzupełnienie z `unit_count_min`, dopisanie zdania o dawnym zakresie do `extras_note` lub `note`, `unit_count` NOT NULL z `CHECK >= 3`, zdjęcie z `unit_count_min` NOT NULL i `CHECK >= 10`. Kod przechodzi na jedną liczbę: `lib/db/schema.ts`, schematy Zod w `lib/project-request-actions.ts` (bez pól zakresu), `lib/project-request-specs.ts`, zapytania w `lib/db/queries.ts` (także surowy SQL z `row.unit_count_min`), `lib/notifications/large-order-team.ts` (bez "+"), ekrany admina i producenta (`large-orders`, `board`), `ProjectRequestFlow`, `BulkProductInquiryModal`, cztery pliki `messages/*.json` (pole liczby, wskazówka "podaj liczbę pierwszego etapu", próg od 3, wskazówka dla 1 do 2 domów), testy i `e2e`. Migrację sprawdzić na osobnej gałęzi Neon ze starymi wierszami zakresu, potem dev, potem prod, satisfies **AC-8, AC-27**
8. Zapytanie dopasowania, tabela wyjątków, ekran wyjątków w adminie, użycie tej samej funkcji na tablicy, w szczególe i w `submitProjectQuote`, alert przy zerze dopasowanych, satisfies **AC-10**
9. Nowy format oferty: schemat Zod, `QuoteForm`, walidacja pól obowiązkowych, satisfies **AC-11**
10. Termin: ustawianie przy składaniu, przedłużenie przez admina, blokada ofert po terminie, wyborze i zamknięciu, satisfies **AC-9, AC-12**
11. Migracja 3, bramka publikacji: uzupełnienie pustych `published_to_client_at` i usunięcie defaultu, filtr w zapytaniach klienta i PDF (w tym ścieżka admina do PDF), usunięcie maila z linkiem przy złożeniu oferty, akcje `publishSummary` (z potwierdzeniem przeglądu PDF i tekstów), `unpublishQuote`, komentarz doradcy, rozszerzenie filtrów statusu o `published`, satisfies **AC-12, AC-13, AC-14, AC-22**
12. Ekran podsumowania klienta: tabela porównawcza z pól ofert, załączniki PDF, satisfies **AC-15**
13. Wybór klienta (`selected_quote_id`), zmiana wyboru, idempotentna `connectSelection` (po wyborze, po zatwierdzeniu B2B, przycisk admina), maile połączenia, satisfies **AC-16, AC-17**
14. Zapytanie o konkretny produkt na tej samej bramce, terminie i wyborze, satisfies **AC-21**
15. Zapytanie składane przez doradcę (z jawnym wyborem języka klienta), satisfies **AC-20**
16. Wynik producenta, neutralne informacje dla przegranych, zamknięcie i wznowienie, satisfies **AC-18, AC-19**

Załączniki inwestora (część D, dodane 2026-10-12). Numeracja zostaje, kolejność budowy to: po zadaniu 16, przed zadaniem 17, bo zadanie czyszczące z zadania 17 obsługuje też pliki:
20. Migracja 4 (tabela `inquiry_attachment` z ograniczeniami i indeksami, wyzwalacz limitów z blokadą doradczą, wyzwalacz audytu `inquiry_attachment_audit` jak na innych tabelach (bez nazwy pliku w treści audytu), kolumna `attachments_changed_at` na obu tabelach zapytań, wyłącznie dodanie), sprawdzenie limitu ciała żądania na Vercel (opis w Configuration required), funkcja usuwania obiektu w `lib/storage/private-r2-client.ts` (dziś jej nie ma, potrzebuje jej sprzątanie po nieudanym zapisie i zadanie czyszczące), walidator `lib/storage/inquiry-attachment-validation.ts` (sygnatura PDF/JPEG/PNG/WebP, odrzucanie `/Encrypt`, `/JavaScript`, `/JS`, `/Launch`, `/OpenAction`, limit 20 MB, rozszerzenie istniejącego `validateDocumentPdf` zamiast kopiowania), token wgrywania (HMAC, 2 godziny), akcje `uploadInquiryAttachment` (z warunkowym `INSERT ... SELECT` i sprzątaniem obiektu R2 przy porażce) i `deleteInquiryAttachment`, zdarzenie `inquiry_attachment_uploaded`, satisfies **AC-28, AC-29, AC-33**
21. Odczyt i uprawnienia: `listInquiryAttachments` i `getInquiryAttachmentUrl` (podpisany link 10 minut, pobranie jako załącznik, ta sama funkcja dopasowania co AC-10, brak ujawniania istnienia), znacznik "pliki zmieniono po złożeniu oferty" w zapytaniu producenta, satisfies **AC-30, AC-31, AC-33**
22. Interfejs: pole plików w kreatorze `ProjectRequestFlow` (krok po zapisie zapytania, osobny pasek postępu i ponowienie dla każdego pliku, ostrzeżenie i pole zgody) i w `BulkProductInquiryModal`, sekcja plików w szczegółach zapytania w panelu klienta (dodawanie, usuwanie), sekcja plików w szczegółach zapytania producenta, sekcja "Pliki inwestora" w szczegółach admina z przyciskami ukryj i przywróć, cztery języki, satisfies **AC-28, AC-29, AC-31, AC-32**
23. Admin: `hideInquiryAttachment` i `unhideInquiryAttachment` z powodem i audytem, dodawanie i usuwanie plików przez admina, pliki w `createRequestOnBehalf`, tekst `staff_consent_note` obejmujący pliki, satisfies **AC-32, AC-34**
24. Migracja 5 (zwężenie): usunięcie kolumn `unit_count_min` i `unit_count_max` oraz ich ograniczeń po tym, jak kod z zadania 7 działa na dev i prod bez błędów, satisfies **AC-27**

Jeśli tydzień 2 się nie mieści, na pilotaż z jednym inwestorem można przesunąć po pilotażu: wznowienie zapytania przez klienta (część AC-19, administrator może otworzyć zapytanie ręcznie), samodzielne potwierdzenie wyniku przez producenta (AC-18, wynik wpisuje administrator) i zapytanie składane przez doradcę (AC-20, doradca może użyć publicznego formularza z e mailem klienta). Rdzeń, którego nie wolno ciąć: zadania 7 do 14. Załączniki (zadania 20 do 23) są drugim rzędem: pilotaż da się przeprowadzić bez nich, jeśli inwestor wyśle pliki mailem do zespołu, a zespół doda je ręcznie; najprostsze cięcie to zadania 20 do 22 bez ekranu admina z zadania 23 (ukrywanie zostaje wtedy przez bezpośrednie usunięcie przez admina). Zadanie 24 nie blokuje niczego i może poczekać na koniec pilotażu.

Tydzień 3 (część C i stabilizacja):
17. Pozostałe maile, tabela `project_notification_log`, zadanie cykliczne (przypomnienia, godzinne czyszczenie zaległych połączeń, alert o minionym terminie), `vercel.json`, satisfies **AC-17, AC-24, AC-25**. Przy pojedynczym przetargu pilotażu przypomnienia można wywołać ręcznie.
18. Testy E2E całej ścieżki (z uwzględnieniem przepisania `e2e/pdf-wyceny-tablica-b2b.spec.ts`), kontrola tłumaczeń, satisfies **AC-26** i wszystkie powyższe
19. Pilotaż z jednym dużym inwestorem, poprawki, zamrożenie zmian

## Migration plan

**Strategy**: strangler. Nowe kolumny i tabele dochodzą obok starych, kod przełącza się etapami, a stary przepływ (akceptacja przez klienta od razu) znika dopiero po tygodniu 2.

**Phases**:
1. Migracja 1 (tydzień 1): tylko dodanie kolumn z wartościami domyślnymi i nowych tabel. `deadline_at` dodawane najpierw jako nullable z uzupełnieniem, dopiero potem NOT NULL z domyślną wartością w bazie (`ADD COLUMN NOT NULL` bez wartości padłoby na niepustej tabeli). `published_to_client_at` z tymczasowym `DEFAULT now()`, żeby oferty składane w tygodniu 1 pozostały widoczne dla klienta. Dodanie wartości `published` do enumu wykonać osobno od wszystkiego, co jej używa (zasada z `lib/db/AGENTS.md`).
2. Kod tygodnia 1 działa na starym modelu (klient widzi oferty od razu, bo każda oferta dostaje default `now()`).
3. Migracja 2 (tydzień 2, rozszerz): nowa kolumna `unit_count` z `CHECK >= 3`, uzupełniona z `unit_count_min`, razem z kodem progu i jednej liczby (zadanie 7). Kolejność wewnątrz pliku: dodanie `unit_count` nullable, uzupełnienie, dopisanie zdania o zakresie, `SET NOT NULL`, nowe `CHECK`, zdjęcie `NOT NULL` i `CHECK >= 10` z `unit_count_min`. Dodawanie i usuwanie kolumn w jednej tabeli idzie w osobnych przebiegach `drizzle-kit` (zasada z `lib/db/AGENTS.md`), więc usunięcie starych kolumn to osobna migracja 5. Okna błędów nie ma: tymczasowy wyzwalacz BEFORE INSERT ustawia `unit_count := coalesce(unit_count, unit_count_min)`, więc stary kod, który zna tylko `unit_count_min`, nadal wstawia poprawne wiersze, a nowy kod zapisuje oba pola do migracji 5. Dzięki temu wycofanie samego kodu jest bezpieczne. `drizzle-kit generate` wygeneruje `ADD COLUMN ... NOT NULL` w jednym kroku, więc wykonawca rozbija plik ręcznie na kroki "dodaj nullable, uzupełnij, SET NOT NULL" i sprawdza go na gałęzi Neon.
4. Migracja 3 (tydzień 2, razem z bramką publikacji i ekranami admina): uzupełnienie wszystkich pustych `published_to_client_at` (oferty z tygodnia 1 i wcześniejsze) i usunięcie defaultu. Po tej migracji nowe oferty są ukryte do publikacji.
5. Migracja 4 (tydzień 2, zadanie 20): tabela `inquiry_attachment`, wyłącznie dodanie, bez wpływu na istniejące wiersze. Brak enumów, więc brak ograniczenia migracji w jednej transakcji.
6. Po stabilizacji: usunięcie kodu `acceptProjectQuote` w starej postaci i starych tekstów tablicy.
7. Migracja 5 (zwężenie, zadanie 24): usunięcie `unit_count_min` i `unit_count_max` oraz ich `CHECK`, dopiero gdy `grep` po kodzie nie znajduje żadnego odczytu tych kolumn, a dev i prod działają na `unit_count`.

**Rollback**: migracje 1 do 4 są addytywne (migracja 2 tylko zdejmuje ograniczenia ze starych kolumn), więc wycofanie kodu zostawia nieszkodliwe kolumny i tabelę, a stare kolumny nadal mają dawne dane. Po migracji 5 pierwotny zakres jest odtwarzalny tylko ze zdania w uwagach, a `unit_count_min` trzeba odtworzyć z `unit_count`. Powrót do progu 10 wymaga migracji odwracającej i jest możliwy tylko, gdy w tabelach nie ma zapytań na mniej niż 10 domów. Pliki inwestora wycofuje się przez ukrycie lub usunięcie (tabela może zostać).

**Risks**: migracja z nową wartością enumu nie może jej używać w tym samym pliku. Oferty bez `published_to_client_at` zniknęłyby klientowi, więc uzupełnienie w migracji 3 jest obowiązkowe (oferty z tygodnia 1 mają default, ale wcześniejsze trzeba uzupełnić). Cron nie działa na stagingu. Szczegóły, które wykonawca musi sprawdzić na istniejącym kodzie: rozszerzenie filtrów statusu o `published` w trzech miejscach, usunięcie maila z linkiem przy złożeniu oferty, ścieżka admina do PDF. Zmiana liczby domów dotyka około dwudziestu miejsc w kodzie i surowego SQL w `lib/db/queries.ts` (odczyt `row.unit_count_min`), który kompilator typów nie złapie, więc po przejściu trzeba przeszukać repozytorium po `unit_count_min`, `unitCountMin` i `unitCountMax`. Stare zapytania w bazie mają zakresy, dlatego migrację sprawdza się na gałęzi Neon z takimi wierszami przed dev i prod. Załączniki: anonimowy gość wgrywa pliki do prywatnego magazynu, więc nadużycie (zapychanie magazynu) ograniczają limity na zapytanie i istniejący limit otwartych zapytań na e mail, a nie limit na adres IP, którego projekt nie ma.

## Consequences

**Positive**:
- ModularHub widzi każde zapytanie i ofertę, zna zwycięzcę i może rozliczać się z producentami poza systemem.
- Producent ma silną zachętę, żeby nie omijać platformy (traci dostęp do kolejnych przetargów), a klient dostaje porównanie, którego sam by nie przygotował.
- Rdzeń z tygodnia 1 odblokowuje obecny przepływ, zanim zmieni się model.
- Jedna funkcja dopasowania chroni listę, szczegół i zapis oferty przed obejściem przez bezpośrednie wywołanie akcji.
- Producent dostaje plany i rzuty już na etapie oferty, więc oferuje na konkretnych danych, a inwestor nie musi powtarzać tych samych plików każdemu producentowi.
- Jedna dokładna liczba domów upraszcza dopasowanie mocy, ofertę i maile (koniec zapisu "10+").

**Negative / tradeoffs**:
- Publikacja podsumowania to praca ręczna zespołu. Przy wielu równoległych przetargach stanie się wąskim gardłem.
- Moc produkcyjna jako twarde kryterium może odciąć dobrych producentów z błędnie wypełnionym profilem. Łagodzi to reguła "brak wartości nie wyklucza" i wyjątek `include`.
- Nazwy producentów są widoczne dla klienta, więc obejście platformy przez klienta jest możliwe. Ochroną jest zasada dostępu do przetargów, a nie ukrywanie nazw.
- Dwa przepływy dużych zamówień obok siebie (ten i spec 0048) przez jakiś czas.
- Pliki widoczne od razu dla dopasowanych producentów oznaczają, że numer telefonu lub e mail w stopce rysunku może dotrzeć do producenta przed wyborem i obejść zasadę "kontakt po wyborze". Przyjęte świadomie, żeby nie zatrzymywać procesu na ręcznym przeglądzie; łagodzą to ostrzeżenie i zgoda przy wgrywaniu, ukrycie przez admina po fakcie i zasada dostępu do przetargów. Do czasu skanera danych kontaktowych ochrona opiera się na uwadze zespołu.
- Brak skanera antywirusowego: ochrona to walidacja sygnatury, odrzucenie aktywnych elementów PDF i pobranie zawsze jako załącznik. Producent otwiera plik na własnym urządzeniu. Wynik: akceptowalne ryzyko przy typach plików ograniczonych do PDF i obrazów.
- Stare zapytania z zakresem tracą rozróżnienie min i max w polach (zakres zostaje tylko jako zdanie w uwagach).
- Dwie nowe migracje (4 i 5), w tym tymczasowy wyzwalacz zgodności starej i nowej kolumny liczby domów do migracji 5.
- Wyzwalacz limitów z blokadą doradczą to dodatkowa logika w bazie, ale tylko on daje twardy limit przy równoległych wgraniach na sterowniku bez transakcji.

**Neutral**:
- Część 0062 zostaje zastąpiona: AC-2 (tablica widoczna dla wszystkich zatwierdzonych), AC-6 i AC-7 (klient widzi oferty od razu, kontakt po jego akceptacji). Maskowanie kontaktu, ekrany producenta, PDF oferty i AC-13 (autoryzacja w `submitProjectQuote`) zostają i są rozszerzone.
- `acceptProjectQuote` zmienia się w `selectProjectQuote` i traci wymóg B2B na etapie wyboru (wymóg przesuwa się na moment połączenia).

## Follow-up

- [ ] Strony prawne jako osobna specyfikacja po dokumencie od prawnika: polityka prywatności, regulamin z zasadą dostępu do przetargów, zakaz omijania platformy, Impressum, zgoda na cookies, tekst zgody na przekazanie danych producentowi. Zgodność z rozporządzeniem UE 2019/1150 do sprawdzenia przez prawnika.
- [ ] Ponowne otwarcie wyboru po wyniku `no_agreement` lub `withdrew` (akcja admina, która czyści wybór i pozwala wybrać drugiego producenta). W tej wersji robi to administrator ręcznie.
- [ ] Wskazówka pod polami formularza zapytania zmienia się z "widzą wszyscy zweryfikowani producenci" na "widzą dopasowani producenci" (teksty w czterech językach).
- [ ] Język mailów do producentów: dziś zawsze po polsku. Jeśli pojawią się producenci spoza Polski, dodać preferowany język producenta.
- [ ] Skaner danych kontaktowych w plikach inwestora: odczyt warstwy tekstowej PDF i wyszukanie e maili, numerów telefonu i adresów www, a dla obrazów i skanów rozpoznawanie tekstu (OCR). Plik z trafieniem trafia do kolejki admina albo jest ukrywany automatycznie do przeglądu. Wymaga osobnej decyzji (biblioteka do odczytu PDF, OCR, koszt). Do czasu skanera obowiązuje ukrywanie przez admina po fakcie.
- [ ] Skaner antywirusowy plików inwestora, gdy ruch anonimowych wgrań urośnie lub pojawi się wymóg klienta (ClamAV z 0047 został usunięty w 0050).
- [ ] Rozszerzenie typów plików o DWG i DXF po pilotażu, jeśli architekci będą o nie prosić. Wymaga decyzji o walidacji lub o tym, że przyjmujemy je bez sprawdzania zawartości.
- [ ] Limit wgrań na adres IP lub Cloudflare Turnstile na składaniu zapytania, jeśli pojawi się nadużycie (projekt nie ma dziś limitów IP; dzienny globalny limit bajtów od gości jest w tej wersji).
- [ ] Usuwanie metadanych EXIF (położenie GPS działki, autor) z JPEG i WebP przed zapisem, bo pliki trafiają do producentów bez przeglądu.
- [ ] Okres przechowywania plików zamkniętych i porzuconych zapytań (dane osobowe), do uzgodnienia z prawnikiem; dziś pliki zostają, dopóki nikt ich nie usunie.
- [ ] Walidacja PDF parserem zamiast wyszukiwania w bajtach (obecna heurystyka jest do obejścia), razem ze skanerem antywirusowym.
- [ ] Tekst zgody inwestora na przekazanie plików dopasowanym producentom oraz zakaz umieszczania danych kontaktowych w plikach dopisać do dokumentu od prawnika (strony prawne).
- [ ] Po pilotażu: automatyczne przygotowanie podsumowania i alert o nowych niepublikowanych ofertach, gdy zespół urośnie.
- [ ] Zaktualizować wiersz 49 w `docs/scope/produkcja.md` (tablica ogłoszeń) i dodać nową funkcję dla tej decyzji.
- [ ] Zaktualizować spec 0062: status "częściowo zastąpiona przez 0070" z listą zastąpionych kryteriów.
- [ ] Po wdrożeniu `/sync` zapisze zasady tej funkcji w `lib/notifications/AGENTS.md` i `app/[locale]/internal/AGENTS.md`.
