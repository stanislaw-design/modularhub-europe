# 0085. Uzasadnienie: bezpośrednie wgrywanie plików do R2

## Context

> ⚠️ Premise note: Limit około 4,5 MB na żądanie funkcji Vercela jest w tym repozytorium opisany w spec 0080, ale nie udało się go zacytować z dokumentacji Vercela, a logi środowiska nie pokazują wywołań funkcji dla nieudanego wgrania. Dowód z objawów jest mocny (PDF 5,6 MB daje ogólny błąd, PNG 164 KB działa, walidator przepuszcza plik, brak błędów w logach funkcji), ale pełny dowód to test z plikiem 15 MB na staging. Dlatego pierwszy wątek budowy (zadanie 5 w Build plan) sprawdza to na prawdziwym wdrożeniu, zanim cokolwiek zostanie uznane za gotowe.

Załączniki zapytań (spec 0070 część D) i PDF oferty (spec 0063) idą dziś przez akcje serwerowe: przeglądarka wysyła plik jako ciało żądania, funkcja waliduje go i zapisuje w prywatnym R2. Spec 0063 podniósł limity Next.js (`bodySizeLimit` i `proxyClientMaxBodySize` do 24 MB), ale Vercel ma własny, twardy limit ciała żądania funkcji, niezależny od Next.js. Spec 0080 już to zauważył i dla notatnika rozmów zbudował wgrywanie z przeglądarki prosto do R2, z krokiem potwierdzenia po stronie serwera. Jego Follow-up wprost mówi, że PDF oferty z 0063 może mieć ten sam limit.

W praktyce oznacza to błąd tam, gdzie spec obiecuje 20 MB: inwestor z rzutami i specyfikacją, doradca wgrywający plik w imieniu klienta, producent z ofertą z rysunkami. Uploader pokazuje przy każdym rzuconym błędzie transportu ten sam ogólny tekst "Nie udało się zapisać pliku", więc przyczyna nie jest widoczna dla użytkownika ani dla zespołu.

Zasady z kodu, które kształtują rozwiązanie: wyzwalacz w bazie (`drizzle/0059`) jest ostateczną granicą limitów i stanu zapytania, wgranie gościa opiera się na tokenie HMAC ważnym 2 godziny, zgoda AC-32 (brak danych kontaktowych w plikach) jest wymagana od klienta i gościa, a PDF oferty podmienia stary plik atomowo z warunkiem w SQL (spec 0063 AC-13). Bucket prywatny nie ma dziś reguły CORS potwierdzonej w repozytorium. Zadanie czyszczące z 0070 (zadanie 17) jest opisane, ale nie ma go w `vercel.json`.

## Options considered

### Option 1: Bezpośrednie wgrywanie podpisanym adresem z tabelą zamiarów w bazie

Przeglądarka dostaje od serwera krótko ważny adres PUT, wysyła plik prosto do prywatnego R2, a drugi krok serwerowy sprawdza rozmiar i zawartość i dopiero wtedy zapisuje wiersz. Rozpoczęte wgrania są wierszami w nowej tabeli `upload_intent`.

**Pros**:
- Omija limit ciała żądania funkcji Vercela, więc 20 MB działa naprawdę.
- Reuse sprawdzonego wzorca z 0080 i gotowych narzędzi w `private-r2-client.ts`.
- Jedno miejsce prawdy rozwiązuje trzy problemy naraz: limit dzienny gościa (liczy rozpoczęte wgrania), wyścig dwóch potwierdzeń (atomowe zużycie) i sprzątanie sierot (zadanie po wierszach, bez listowania bucketu).
- Wspólny mechanizm dla zapytań i PDF oferty.

**Cons**:
- Nowa tabela, migracja i zadanie czyszczące do utrzymania.
- Wgranie ma dwa kroki i więcej stanów błędu niż jedna akcja.
- Zależy od reguły CORS i od tego, czy R2 egzekwuje podpisaną długość.
- Potwierdzenie kopiuje obiekt z klucza tymczasowego na ostateczny (dodatkowa operacja w R2), żeby ponowny PUT po potwierdzeniu nie mógł podmienić zapisanego pliku.

### Option 2: Bezpośrednie wgrywanie bez stanu (klucz z prefiksem i reguła wygasania w R2)

Tak jak w notatniku rozmów: klucz ma nieprzejrzysty prefiks, a R2 sam kasuje niepotwierdzone obiekty po 24 godzinach regułą cyklu życia. Brak tabeli.

**Pros**:
- Brak migracji i brak nowej tabeli, mniej kodu.
- Spójne z istniejącym wzorcem 0080.

**Cons**:
- Nie da się policzyć rozpoczętych wgrań gościa, więc dzienny limit nie obejmuje plików, które nie zostały potwierdzone.
- Podwójne potwierdzenie tego samego klucza chroni tylko unikalność klucza w bazie, bez wiązania z wywołującym i zapytaniem.
- Reguła cyklu życia w R2 działa na prefiks, nie na stan w bazie, więc przypadkowo usunęłaby także potwierdzone obiekty, jeśli klucze nie byłyby przeniesione po potwierdzeniu (dodatkowy CopyObject).
- Nie rozwiązuje 30 dniowego czyszczenia skasowanych plików zapytań.

### Option 3: Wgrywanie kawałkami przez funkcję serwerową

Przeglądarka tnie plik na kawałki po około 3,5 MB, każdy idzie osobnym wywołaniem akcji i jest dołączany do wielokawałkowego wgrania w R2.

**Pros**:
- Nie wymaga CORS na buckecie, bo wszystko idzie przez serwer.

**Cons**:
- Dużo stanu (identyfikator wielokawałkowego wgrania, kolejność kawałków, wygasanie), więcej miejsc na błąd niż w Option 1.
- Każdy kawałek to wywołanie funkcji, więc koszt i opóźnienie rosną z rozmiarem pliku.
- Walidacja pełnego pliku nadal wymaga pobrania go z R2 po złożeniu.

### Option 4: Zostawić dzisiejszy mechanizm i kompresować pliki

Użytkownik ma dostać komunikat o limicie około 4 MB i zmniejszyć plik. Limit w specyfikacji spada z 20 MB do 4 MB.

**Pros**:
- Zero pracy po stronie kodu, poza komunikatem i zmianą limitów w tekstach.

**Cons**:
- Rzuty, projekty i oferty z rysunkami regularnie przekraczają 4 MB, więc inwestor lub producent musi kompresować, tracąc czytelność rysunków.
- Cofa obietnicę z spec 0070 AC-28 i spec 0063 (20 MB) i obniża jakość ofert, które porównuje klient.

## Rationale

Option 1 wygrywa, bo siły z Context są trzy naraz: twardy limit żądania funkcji (wymusza ominięcie funkcji), wymóg, by uprawnienia, zgoda AC-32 i limity w bazie obowiązywały tak jak dziś (wymusza krok potwierdzenia i ponowne sprawdzenie), oraz potrzeba kontroli nad tym, co leży w R2 (wymusza stan i sprzątanie). Option 2 jest lżejszy, ale pozostawia bez rozwiązania właśnie te problemy, o które zapytano: limit dzienny gościa, wyścig potwierdzeń i sprzątanie. Option 3 wygrywa tylko brakiem CORS, a płaci za to największą złożonością. Option 4 jest najtańszy, ale łamie obietnicę 20 MB.

Inżynier wybrał jedną tabelę zamiarów dla obu zastosowań, jedną ścieżkę (usunięcie starych akcji) i wspólne zadanie czyszczące z 30 dniowym czyszczeniem plików zapytań. Kosztem jest nowa tabela i migracja, zyskiem jedno miejsce prawdy o rozpoczętych wgraniach i zamknięcie luki, w której skasowane pliki nigdy nie znikały z R2.

Cztery decyzje drobne, podjęte w specyfikacji (z drugą w kolejności opcją):
- **Ważność adresu 15 minut, ważność zamiaru 1 godzina, zapas czyszczenia 15 minut.** Adres musi wystarczyć na 20 MB przez wolne łącze, a potwierdzenie ma zapas na ponowienia. Alternatywa: adres 5 minut jak w 0080, co dla plików 20 MB na słabym łączu bywa za krótkie.
- **Podpis zawiera długość i typ pliku.** Serwer sam decyduje, że plik ma deklarowany rozmiar, a R2 powinno odrzucić inny. Alternatywa: tylko kontrola HEAD przy potwierdzeniu, co zostawia okno na obiekt większy niż deklaracja; ten wariant zostaje jako zabezpieczenie, jeśli test pokaże, że R2 ignoruje podpisaną długość.
- **Klucz tymczasowy i kopia na klucz ostateczny.** Podpisany adres PUT działa przez 15 minut także po potwierdzeniu, więc przy jednym kluczu ktoś mógłby podmienić zapisany plik na niezwalidowany. Obiekt ląduje pod `uploads/<uuid>`, a po walidacji serwer kopiuje go na klucz ostateczny (`CopyObject` z `If-Match` na ETag zwalidowanej wersji). Alternatywa: jeden klucz i zaufanie do krótkiego czasu ważności adresu, co zostawia dziurę.
- **Zużycie zamiaru na końcu, razem z zapisem pliku.** Kolejność to HEAD, walidacja, kopia, a dopiero potem jedno polecenie SQL zużywa zamiar i wstawia wiersz. Dzięki temu chwilowy błąd R2 nie spala zamiaru, a błąd wyzwalacza cofa zużycie. Alternatywa: zużyć zamiar na początku, co psuje ponowienia.

## Cross check

Niezależny przegląd na innym modelu (tylko do odczytu) uznał specyfikację za solidną z poprawkami. Przyjęte: klucz tymczasowy i kopia (dziura z podmianą po potwierdzeniu), kolejność zużycia zamiaru, wiązanie z wywołującym przez `actor_user_id` i `purpose`, okno 15 minut w limitach i unieważnianie poprzedniego zamiaru przy ponowieniu, AC-4 niezależne od zachowania R2, kody błędów PDF oferty i oczyszczona nazwa, warunkowe zajęcie wiersza w zadaniu czyszczącym, zadanie czyszczące wdrażane razem z zadaniem 5, usunięcie `Content-Length` z reguły CORS, jedno wydanie zamiast dwóch.

Nie przyjęte w całości: pominięcie liczenia rozpoczętych wgrań w limitach zapytania (wyzwalacz w bazie i tak jest ostateczną granicą). Zostawione z oknem 15 minut, bo daje czytelny komunikat przed wysłaniem 20 MB, a nie dopiero przy potwierdzeniu. Poza zakresem: sprzątanie miękko usuniętych PDF oferty (trafiło do Follow-up) i naprawa tej samej luki w notatniku rozmów (Follow-up, spec 0080).

## Evidence

**Objawy z tej sesji (2026-11-13)**: PDF 5,6 MB (`zapytanie-ofertowe-domki-holandia.pdf`) daje "Nie udało się zapisać pliku. Spróbuj ponownie."; PNG 164 KB wgrywa się poprawnie. Walidator (`validateDocumentPdf` z `rejectActiveContent`) przepuszcza ten PDF (nagłówek `%PDF-1.4`, `%%EOF` w ostatnich 2 KB, brak `/Encrypt`, `/JS`, `/Launch`). W logach runtime projektu `modularhub-europe` brak błędów w oknie godziny obejmującym próbę, co pasuje do odrzucenia żądania przed funkcją.

**Ślady w repozytorium**: komentarz w `next.config.ts` (limity Next.js, spec 0063), opis limitu 4,5 MB i bezpośredniego wgrywania w `docs/specs/0080-notatnik-rozmow-z-kontrahentami/index.md`, gotowe narzędzia `buildSignedUploadUrl`, `headPrivateObjectSize`, `readPrivateObjectHead` w `lib/storage/private-r2-client.ts`, wzorzec prośby i potwierdzenia w `lib/conversations/attachments.ts`.

**Inne wgrania przez akcję serwerową** (kandydaci do wspólnego mechanizmu, poza zakresem tej specyfikacji): sprawdzić w Follow-up.
