# Verify: bezpośrednie wgrywanie plików do R2 · spec 0085 · updated 2026-11-16
_Steps derived from spec 0085 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Stan po budowie: kod, migracja `0072` (dev) i testy jednostkowe są gotowe. Nie zrobiono reguły CORS na prywatnym buckecie (krok zero) ani testu na staging, więc kroki ze znakiem (staging) czekają na to.

## UI / manual
- [ ] (staging) Gość z `uploadToken` wgrywa PDF 15 MB do zapytania → pasek postępu rośnie, plik dostaje status "gotowe", w sieci nie ma żądania z ciałem pliku do funkcji serwerowej, plik da się pobrać podpisanym linkiem → AC-1, AC-2
- [ ] (staging) Zalogowany klient, admin i producent wgrywają plik 15 MB (zapytanie, a producent PDF oferty) → każdy kończy się sukcesem → AC-1, AC-8
- [ ] (staging) Obraz 15 MB do zapytania jako gość → przyjęty jako obraz → AC-1, AC-5
- [ ] Wybierz plik, który kończy PUT błędem (np. wyłącz sieć w trakcie) → przy pliku komunikat o błędzie wysyłki i przycisk "Spróbuj ponownie", pozostałe pliki bez zmian → AC-11
- [ ] (staging) Usuń na chwilę regułę CORS i wgraj plik → komunikat `upload_failed` w czytelnym tekście, nie ogólny błąd → AC-11, AC-12
- [ ] Wgraj plik, w tym czasie w drugiej karcie wybierz ofertę jako klient, potem potwierdzenie → komunikat o zamkniętym zapytaniu, w R2 nie zostaje obiekt → AC-7
- [ ] Przełącz język na en, de, nl i wywołaj każdy nowy błąd (`not_uploaded`, `expired`, `upload_failed`) → tekst w wybranym języku → AC-11, AC-13
- [ ] Producent zastępuje PDF oferty drugim plikiem → w ofercie jest jeden aktywny PDF, stary miękko usunięty → AC-8

## Commands
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/inquiry-attachment-actions.test.ts lib/storage/direct-upload.test.ts lib/project-quote-actions.test.ts` → wszystkie przechodzą → AC-2 do AC-9, AC-14
- [ ] `node --env-file=.env.local node_modules/vitest/vitest.mjs run components/inquiry-attachments components/producent app/api/cron/uploads-cleanup` → przechodzą → AC-9, AC-11
- [ ] `npx tsc --noEmit -p .` → bez błędów → AC-10
- [ ] `grep -rn "uploadInquiryAttachment\|uploadProjectQuotePdf" app components lib --include=*.ts --include=*.tsx` poza plikami testów → brak wyników → AC-10
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<staging>/api/cron/uploads-cleanup` → 200 z licznikami, a bez nagłówka 401 → AC-9
- [ ] (staging, zadanie 3) `curl -X PUT` na podpisany adres z ciałem o innej długości niż podpisana → wynik wpisać do Follow-up specu (czy R2 egzekwuje długość) → AC-4
- [ ] Zapytaj dev DB: `select count(*) from upload_intent` po serii wgrań i uruchomieniu zadania czyszczącego → niezużyte, wygasłe zamiary mają `purged_at`, a obiekty `uploads/*` znikają z R2 → AC-9
- [ ] Wgraj plik, potwierdź go, potem ponownie wyślij PUT pod ten sam adres → zapisany plik (klucz `inquiry-attachments/…`) bez zmian, obiekt `uploads/…` posprzątany przez zadanie → AC-14

## Acceptance-criteria coverage
- AC-1 … staging 15 MB (gość, klient, admin, producent) · AC-2 … `lib/inquiry-attachment-actions.test.ts` (prośba, not_uploaded, zużycie) · AC-3 … ten sam plik, limity, ponowna prośba · AC-4 … rozmiar z HEAD i twardy limit odczytu, test `curl` (staging) · AC-5 … sygnatura i `file_rejected` · AC-6 … ten sam wywołujący, jeden wiersz na zamiar · AC-7 … stan zapytania i wyzwalacz przy potwierdzeniu · AC-8 … `lib/project-quote-actions.test.ts` (dwa kroki w jednej transakcji, patrz Follow-up) · AC-9 … `lib/storage/direct-upload.test.ts` i `route.test.ts` · AC-10 … grep i tsc · AC-11 … testy uploaderów i krok ręczny z siecią · AC-12 … ręcznie na staging, jeszcze nie wykonane · AC-13 … tłumaczenia w czterech językach · AC-14 … klucz ostateczny jest kopią, test `curl` i zadanie czyszczące
