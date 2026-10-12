# 0070 część D. Załączniki inwestora

## Summary

Inwestor może dołączyć do zapytania pliki: projekt, rzuty, plan zagospodarowania, specyfikację. Producent potrzebuje ich do wyceny, więc widzą je od razu dopasowani producenci, bez ręcznego przeglądu. Pliki leżą w prywatnym magazynie i są otwierane tylko przez krótko ważny, podpisany link. Ochrona danych kontaktowych inwestora w plikach opiera się na ostrzeżeniu przy wgrywaniu, na ukryciu pliku przez administratora po fakcie i na skanerze, który dojdzie później. Część dotyczy zapytania wolnego i zapytania o konkretny produkt, także składanego przez gościa bez konta i przez doradcę.

Kryteria: **AC-28 do AC-34** z [index.md](index.md). Model danych (tabela `inquiry_attachment`), niezmienniki, model bezpieczeństwa i plan migracji są w [index.md](index.md) i nie są tu powtarzane. Jedna dokładna liczba domów (AC-8, AC-27) jest opisana w [części B](0070-czesc-b-przetarg-i-podsumowanie.md).

## Zakres

**W zakresie**: wgrywanie, lista, pobranie, ukrywanie, usuwanie i wymiana plików dla `project_request` i `bulk_product_inquiry`, token dla gościa, uprawnienia producenta, znacznik zmiany plików przy ofercie, sprzątanie obiektów po 30 dniach.

**Poza zakresem**: skaner danych kontaktowych i antywirusowy (Follow-up), typy DWG i DXF, pliki dołączane do oferty producenta (to PDF oferty z 0063), wiadomości i wątki rozmowy (to spec 0048), tekst zgody (prawnik).

## Zachowanie i akcje

**Wgrywanie (AC-28, AC-29).**
1. Akcje składające zapytanie (`submitProjectRequest`, `submitBulkProductInquiry`, `createRequestOnBehalf`) nie przyjmują plików. Zwracają dotychczasowe `id` oraz `uploadToken` (HMAC-SHA256 z `kind`, `id` i czasu wygaśnięcia, klucz wyprowadzony z `AUTH_SECRET` z osobnym prefiksem celu, ważny 2 godziny, porównanie w stałym czasie).
2. Formularz po sukcesie przechodzi do kroku "Dodaj pliki" i wysyła każdy plik osobnym wywołaniem `uploadInquiryAttachment(kind, inquiryId, file, { uploadToken, confirmedNoContactData })`. Jeden plik na wywołanie mieści się w limicie ciała 24 MB (spec 0063).
3. Akcja przyjmuje wywołanie, gdy spełniony jest jeden z warunków: rola admin, sesja klienta z `clientId` równym `clientId` zapytania, albo ważny `uploadToken` dla tego zapytania. Inaczej zwraca ogólny błąd "nie masz dostępu" (bez ujawniania, czy zapytanie istnieje).
4. `confirmedNoContactData` musi być `true` dla klienta i gościa (pole zgody w formularzu). Dla admina nie jest wymagane.
5. Walidacja bajtów w nowym `lib/storage/inquiry-attachment-validation.ts`: obraz przez istniejące `detectImageMimeType` (JPEG, PNG, WebP), PDF przez `validateDocumentPdf(bytes, 20 MB)` rozszerzone opcją o odrzucanie `/JavaScript`, `/JS` i `/Launch` (rozszerzenie wspólnego walidatora z opcją, nie kopia, żeby PDF oferty z 0063 zachował dzisiejsze zachowanie; `/OpenAction` nie jest odrzucane, bo występuje w zwykłych PDF z CAD i edytorów). To heurystyka, nie ochrona przed celowo przygotowanym plikiem. Rozmiar obrazu ograniczony do 20 MB tak samo.
6. Zapis: najpierw dzienny limit gości (`GUEST_UPLOAD_DAILY_BYTES`, dla `guest`), potem `buildR2Key` (losowy UUID plus rozszerzenie), `uploadPrivateObject`, potem zwykły `INSERT` z `attachments_changed_at` zapytania w tym samym `db.batch`. Warunki stanu i limity egzekwuje wyzwalacz (blokada doradcza, index.md, Key invariants). Błąd wyzwalacza: usuń obiekt z R2 najlepszym wysiłkiem i zwróć komunikat o limicie lub zamkniętym zapytaniu.
7. `uploaded_by_kind` to `staff` dla admina, `client` dla zalogowanego właściciela, `guest` dla tokenu. `uploaded_by_user_id` jest puste dla gościa.
8. Zdarzenie `inquiry_attachment_uploaded` (rodzaj zapytania, rozmiar, typ MIME) bez nazwy pliku. Błędy do Sentry bez nazwy pliku i bez adresu e mail.
9. Błąd jednego pliku nie cofa zapytania ani innych plików. Formularz pokazuje wynik per plik z przyciskiem "Spróbuj ponownie" i, po wygaśnięciu tokenu, komunikat "Dodaj pliki po zalogowaniu albo napisz do nas".

**Pobranie i lista (AC-30, AC-31).** `listInquiryAttachments(kind, inquiryId)` zwraca dla wywołującego tylko pliki, które może zobaczyć (id, oczyszczona nazwa, typ, rozmiar, data, `hidden` dla admina i klienta, `uploadedByKind` dla admina). `getInquiryAttachmentUrl(attachmentId)` sprawdza uprawnienie za każdym wywołaniem i dopiero wtedy woła `buildSignedDownloadUrl(key, 600, filename)` z nagłówkiem pobrania jako załącznik. Uprawnienie producenta jest liczone tą samą funkcją dopasowania co AC-10 (wariant dla pojedynczego producenta i zapytania) oraz stanem zapytania lub własną ofertą `active` lub `accepted`. Dla producenta brak uprawnień, ukryty plik, usunięty plik i brak pliku dają identyczną odpowiedź "nie znaleziono" (to samo dla `listInquiryAttachments`: zapytanie niedopasowane i nieistniejące wyglądają tak samo). Admin otwiera także ukryte i usunięte pliki, aż do `purged_at` (potrzebne do sporów), a klient-właściciel otwiera swoje ukryte pliki. Link nigdy nie jest zapisywany ani logowany.

**Ukrywanie (AC-32).** `hideInquiryAttachment(attachmentId, reason)` (admin, `withAdminActor`) ustawia `hidden_at`, `hidden_reason`, `hidden_by_user_id`. `unhideInquiryAttachment` czyści te trzy pola. Producent traci dostęp przy następnym odczycie (link wydany wcześniej wygasa w najwyżej 10 minut). Klient widzi ukryty plik z oznaczeniem "Ukryty przez ModularHub" i powodem, może go usunąć i wgrać poprawiony. Admin ma w szczegółach zapytania sekcję "Pliki inwestora": lista z typem, rozmiarem, datą, autorem (klient, gość, doradca), przyciskiem otwarcia, ukrycia i przywrócenia.

**Usuwanie i wymiana (AC-33).** `deleteInquiryAttachment(attachmentId)` wywołuje klient-właściciel (do wyboru oferty) albo admin (zawsze). Ustawia `deleted_at` i `deleted_by_kind`, z warunkiem w SQL jak przy wgrywaniu (brak `selected_quote_id` dla klienta). Wymiana pliku to wgranie nowego i usunięcie starego, interfejs podpowiada to jednym przyciskiem "Zamień". Godzinne zadanie czyszczące (zadanie 17) usuwa z R2 obiekty, dla których `deleted_at < now() - 30 dni` i `purged_at IS NULL`, i ustawia `purged_at`. Błąd usunięcia jednego obiektu nie przerywa pętli i trafia do Sentry. Znacznik zmiany dla producenta: porównujemy `attachments_changed_at` zapytania z chwilą złożenia jego aktywnej oferty (kolumna jest ustawiana przy każdej zmianie pliku, także przywróceniu, więc znacznik nie gubi zdarzeń). Maila nie wysyłamy. Gość z ważnym tokenem może usunąć swoje pliki z tego zapytania, żeby cofnąć pomyłkę, w granicach z AC-28.

**Doradca i admin (AC-34).** `createRequestOnBehalf` dostaje krok "Pliki" po zapisie zapytania, z `uploadToken` pomijanym (admin). Na szczegółach zapytania admin dodaje pliki tym samym `uploadInquiryAttachment`, a usuwa `deleteInquiryAttachment`. Pole `staff_consent_note` ma w formularzu podpowiedź: zgoda klienta obejmuje przekazanie plików dopasowanym producentom.

## Przypadki brzegowe

- Gość składa zapytanie i zamyka kartę, zanim wgra pliki: zapytanie istnieje bez plików. Dopiero po zalogowaniu tym samym e mailem (zasada 0037) lub przez doradcę dodaje pliki.
- Token wygasa w połowie wgrywania: pliki wgrane przed wygaśnięciem zostają, kolejne są odrzucane z komunikatem.
- Klient usuwa plik, a producent właśnie go pobiera: link pozostaje ważny do 10 minut, zaakceptowane okno.
- Klient wybiera ofertę (`selected_quote_id`) w chwili wgrywania pliku: warunek w SQL zapisu odrzuca plik, obiekt w R2 jest sprzątany.
- Wznowienie zamkniętego zapytania czyści wybór, więc klient znów może zmieniać pliki.
- Producent traci dopasowanie (wyjątek `exclude` dodany przez admina): przestaje widzieć pliki, ale jego istniejąca oferta `active` nadal daje mu dostęp do plików tego zapytania, o ile nie jest zablokowany ani usunięty. Jeśli admin chce odciąć także jego, ukrywa pliki lub zamyka zapytanie.
- Zapytanie zamknięte: producent z ofertą `active` lub bez oferty traci dostęp do plików, producent z ofertą `accepted` zachowuje go.
- Po terminie ofert lub po publikacji podsumowania klient i gość nie zmieniają już plików, robi to tylko admin.
- Wgrywanie 50 plików naraz z jednym tokenem: wyzwalacz z blokadą doradczą wpuszcza tylko tyle, ile mieści się w limitach, reszta dostaje błąd limitu.
- Plik o zmyślonym rozszerzeniu (obraz nazwany `.pdf`): typ ustala sygnatura, więc zapisuje się jako obraz albo jest odrzucany, jeśli nie pasuje do żadnego dozwolonego typu.

## Krytyczne scenariusze testowe

Wspólne z [index.md](index.md), sekcja "Critical test scenarios": ścieżka pozytywna, gość z tokenem, walidacja, ukrycie, blokada po wyborze, znacznik zmian, doradca, czyszczenie. Dodatkowo na poziomie tej części:
- Producent niedopasowany woła `getInquiryAttachmentUrl` z poprawnym identyfikatorem pliku i dostaje "nie znaleziono", identycznie jak dla nieistniejącego pliku, verifies **AC-30, AC-31**
- Nazwa pliku z `../`, znakami sterującymi i 300 znakami jest oczyszczona i skrócona w bazie oraz w nagłówku pobrania, verifies **AC-30**
- Wgranie bez `confirmedNoContactData` przez gościa jest odrzucone, przez admina przyjęte, verifies **AC-32, AC-34**
- Błąd zapisu w bazie po udanym zapisie w R2 usuwa obiekt, verifies **AC-28**
