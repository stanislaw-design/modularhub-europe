# 0063. Rationale: opcjonalny PDF wyceny w tablicy ogłoszeń B2B

## Context

Spec 0062 zbudowało pełny przepływ wyceny na tablicy ogłoszeń B2B: producent widzi otwarte zapytania, składa wycenę z ceną całkowitą, opcjonalną ceną za sztukę, czasem realizacji i notatką tekstową; inwestor przegląda otrzymane wyceny i akceptuje jedną. Dziś wycena jest czysto liczbowa i tekstowa — żaden plik nie jest częścią kontraktu.

Producenci przygotowują oferty wizualne (wizualizacje, prezentacje) poza aplikacją, w narzędziach, które już znają (Canva, PowerPoint, Word). Zamiast budować w aplikacji kreator wizualny, co byłoby dużym, osobnym projektem bez gwarancji, że dogoni jakość tego, co producent i tak już umie zrobić sam, ta decyzja pozwala dołączyć gotowy PDF jako opcjonalny dodatek do istniejącej wyceny.

Realnym problemem do rozwiązania jest nie samo przechowywanie pliku (`document`/R2 już to robi dla zdjęć, rzutów i PDF-ów produktowych od spec 0031/0049/0050), ale kontrola dostępu: ten konkretny plik zawiera warunki handlowe jednego producenta wobec jednego zapytania, i nie może zobaczyć go żaden inny, konkurencyjny producent, podczas gdy inwestor musi go zobaczyć od razu, bez czekania na akceptację (w przeciwieństwie do kontaktu inwestora, który spec 0062 maskuje do akceptacji).

Dwie wcześniejsze próby prywatnego magazynu w tym projekcie są martwe: `ai-private-r2-client.ts` (spec 0047, kwarantanna importu PDF) został usunięty wraz z kodem korzystającym w spec 0050; `CASE_PRIVATE_R2_*` (spec 0048, pliki rozmów doradczych) było tylko zaspecowane, nigdy zbudowane — brak zmiennej środowiskowej, brak klienta w kodzie. `lib/storage/AGENTS.md` wprost nazywa dzisiejszy publiczny kubełek R2 nieodpowiednim dla prywatnych dokumentów, od spec 0031 Follow-up, ale nikt jeszcze nie zbudował zamiennika, który przetrwał.

## Options considered

### Option 1: Podpisany, krótkoterminowy URL generowany na żądanie (prywatny kubełek R2)

Plik leży w osobnym, prywatnym kubełku R2. Każde kliknięcie „Pobierz PDF” woła akcję serwerową, która sprawdza autoryzację na nowo i zwraca świeży podpisany URL (`@aws-sdk/s3-request-presigner`, TTL 10 minut); przeglądarka łączy się z R2 bezpośrednio po ten jeden plik.

**Pros**:
- Zero obciążenia serwera Next.js bajtami pliku (PDF z grafikami bywa duży); serwer tylko podpisuje, nie przesyła.
- Krótki TTL nie szkodzi użyteczności, bo link nigdy nie jest zapisywany ani pokazywany jako trwały — zawsze świeży przy kliknięciu, nawet miesiące później.
- Pakiet (`@aws-sdk/s3-request-presigner`) jest już zależnością projektu (został po spec 0047), zero nowego kosztu instalacji.

**Cons**:
- Druga, prywatna powierzchnia R2 do operowania (własne poświadczenia, własny sprawdzian jurysdykcji), nawet jeśli kubełek jest reużyty.

### Option 2: Route handler strumieniujący bajty przez serwer

Jedna trasa Next.js, która sama sprawdza autoryzację i przesyła plik z R2 do przeglądarki przez serwer, bez podpisanego URL.

**Pros**:
- Jeden mentalny model (jedna trasa, brak podpisanych URL do rozumienia).
- Brak ryzyka związanego z czasem życia linku.

**Cons**:
- Każde pobranie pliku (do 20 MB) przechodzi przez pamięć/CPU serwera Next.js, kosztem który rośnie z liczbą pobrań i rozmiarem pliku — właśnie ten koszt, którego inżynier wprost chciał uniknąć.
- Nie wykorzystuje tego, co R2/S3 już umie (bezpośrednie, podpisane udostępnianie), budując to na nowo w aplikacji.

### Option 3: Publiczny kubełek z nieodgadywalnym kluczem (bez realnej kontroli dostępu)

Plik trafia do dzisiejszego publicznego `R2_BUCKET_NAME`, pod losowym UUID jak zdjęcia produktowe; „prywatność” to tylko nieznajomość adresu.

**Pros**:
- Zero nowej infrastruktury, dokładnie dzisiejszy wzorzec `uploadProductSalesPdf`.

**Cons**:
- To nie jest kontrola dostępu, to zaciemnienie. Każdy, kto zobaczy URL (np. w logu serwera, w devtoolsach przeglądarki inwestora, przekazany dalej) ma trwały, nieograniczony w czasie dostęp — niezgodne z twardym wymogiem „nigdy dla konkurencyjnego producenta”.
- `lib/storage/AGENTS.md` już wprost nazywa publiczny kubełek nieodpowiednim dla prywatnych dokumentów od spec 0031 Follow-up; ta opcja ignorowałaby własną, już zapisaną decyzję projektu.

## Rationale

Option 1 wygrywa, bo rozwiązuje realne napięcie, które inżynier sam nazwał w rozmowie: chce kontroli dostępu bez obciążania serwera, i boi się, że krótki TTL linku zaszkodzi użyteczności. Oba obawy znikają, gdy link jest generowany na nowo przy każdym kliknięciu, nie zapisywany jako trwały URL — to standardowy wzorzec podpisanych URL-i S3/R2, nie kompromis. Option 2 broniłaby się prostotą, ale dokładnie powtarza koszt serwera, którego inżynier chciał uniknąć, a R2 i tak umie to zrobić bez pośrednika. Option 3 jest odrzucona bez wahania: to nie jest wybór inżynieryjny, to ignorowanie twardego wymogu bezpieczeństwa tej funkcji (nigdy dla konkurencyjnego producenta) i własnej, już zapisanej decyzji projektu o nieprzydatności publicznego kubełka do prywatnych dokumentów.

Druga, mniejsza decyzja: nazwa nowych zmiennych środowiskowych. Generyczne `PRIVATE_R2_*` (nie `QUOTE_PDF_PRIVATE_R2_*`) odzwierciedla to, że publiczny `R2_BUCKET_NAME` już dziś obsługuje wiele purpose (zdjęcia, rzuty, PDF-y produktowe) jednym kubełkiem rozróżnianym kolumną `purpose`; symetryczny, jeden prywatny kubełek robi to samo dla przyszłych prywatnych purpose (`company_verification`, pliki spraw ze spec 0048), bez kolejnej zmiennej środowiskowej za każdym razem. Koszt tej decyzji jest czysto nazewniczy, nie architektoniczny, więc nie zasługuje na osobną opcję wyżej.

Trzecia decyzja, czysto operacyjna: zweryfikować, czy dawny `AI_PRIVATE_R2_BUCKET_NAME` (spec 0047) wciąż istnieje w Cloudflare, zamiast z góry zakładać nowy. To jest manualny, jednorazowy krok (Build plan #1), nie decyzja projektowa — jeśli bucket przetrwał, reużycie go jest czystym zyskiem (zero nowej infrastruktury do zakładania); jeśli nie, koszt założenia nowego jest identyczny niezależnie od tego, czy sprawdzimy najpierw czy nie.

**Dopisek po cross checku**: niezależny przegląd tego spec na innym modelu znalazł dwie realne luki w pierwszym szkicu, obie naprawione w `index.md` bez zmiany wybranej opcji. Po pierwsze, Next.js 16 domyślnie odrzuca akcje serwerowe powyżej 1 MB na poziomie transportu (`experimental.serverActions.bodySizeLimit`, nigdzie dziś nie podniesione w `next.config.ts`) — bez podniesienia tego limitu „wgrywanie przez serwer, bez CORS" (Option 1) nie zadziałałoby dla pliku 20 MB; to jedna linia konfiguracji, nie powód do zmiany opcji, ale bez niej cała decyzja byłaby niewykonalna (AC-12). Po drugie, sprawdzenie `status = 'active'` przy wgrywaniu/zastępowaniu PDF-a musi być częścią tej samej atomowej operacji zapisu co w `submitProjectQuote`, nie osobnym, wcześniejszym odczytem — inaczej równoległa akceptacja wyceny zostawia okno na podmianę pliku na już zaakceptowanej ofercie (AC-13).

**Dopisek po pierwszym przebiegu buildu (AC-11, jeden krok zamiast dwóch)**: pierwsza wersja tego spec przewidywała dwuetapowy UI (wycena, potem osobny, opcjonalny krok wgrania PDF-a pokazywany dopiero po sukcesie), świadomie wzorowany na `uploadProductSalesPdf` po utworzeniu produktu. Po zbudowaniu tej wersji inżynier zobaczył ją na żywo i poprosił o połączenie obu w jeden krok: wybór pliku w tym samym formularzu co cena, jedno kliknięcie „Wyślij wycenę". Decyzja danych/API surface (prywatny kubełek, podpisany URL, `uploadProjectQuotePdf(quoteId, file)` wymagający istniejącej wyceny z powodu FK `document.project_quote_id`) zostaje bez zmian — to czysto decyzja UI, nie architektoniczna: `QuoteForm` po prostu woła oba już istniejące wywołania serwera jedno po drugim we własnym handlerze, zamiast pokazywać drugie wywołanie jako osobny, oddzielny krok wymagający powrotu producenta. Powód: mniej kliknięć, zero ryzyka, że producent zapomni wrócić i wgrać plik osobno. Koszt: nieudane wgranie PDF-a (zapisana wycena, ale błąd pliku) wymaga osobnej, czytelnej ścieżki błędu w tym samym ekranie, żeby nie wyglądało na cofnięcie udanej wyceny — rozwiązane przez pokazanie komunikatu błędu plus krok ponowienia (`ProjectQuotePdfUploadStep`, już istniejący, teraz też z opcjonalnym `initialFilename`). AC-11, Build plan #10, i odpowiednie Consequences zostały zaktualizowane w `index.md`; AC-1 do AC-10, AC-12, AC-13 i cała reszta decyzji (Option 1, model danych, bezpieczeństwo) bez zmian.
