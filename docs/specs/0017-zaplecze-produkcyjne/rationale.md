# 0017. Wybór zaplecza produkcyjnego, uzasadnienie

## Context

Dzisiejszy prototyp korzysta wyłącznie z danych mockowych i `localStorage` (spec 0001), świadomie bez bazy danych, logowania, płatności i przechowywania plików. Epika Produkcja zamienia to na prawdziwe zaplecze dla dwóch typów kont (klient, producent, docelowo także administrator w funkcji 14), obsługujące dane osobowe, pliki (rzuty, zdjęcia, dokumenty firmowe) i docelowo płatności (funkcja 8).

Pilotaż startuje wyłącznie w Polsce, ale w całości podlega RODO (Regulation (EU) 2016/679), co czyni miejsce przechowywania danych osobowych realnym czynnikiem tej decyzji, nie tylko techniczną ciekawostką. Zespół jest mały, projekt nie ma sztywnego budżetu ani terminu napędzającego tę fazę, a podejście budowy całej epiki to Tracer Bullet: jeden prawdziwy wątek przez wszystkie warstwy, zanim dojdą kolejne funkcje. Bez tej decyzji żadna z pozostałych osiemnastu funkcji epiki Produkcja nie ma na czym stanąć; ona sama jest funkcją 1 tej epiki.

Dodatkowe sygnały już obecne w środowisku pracy: serwer MCP Neon jest już podłączony (dając od razu żywy dostęp do bazy), a skill Supabase jest zainstalowany, ale nieużywany. Żaden z nich nie jest tu traktowany jako gotowa decyzja, tylko jako dostępna opcja do rozważenia na równi z innymi.

## Options considered

### Option 1: Zestaw niezależnych, sprawdzonych narzędzi (Neon, Drizzle, Auth.js w wersji 5, Cloudflare R2) na Vercel

Cztery wyspecjalizowane narzędzia, każde najlepsze w swojej kategorii, połączone samodzielnie: Neon do bazy danych, Drizzle jako warstwa dostępu, Auth.js w wersji 5 do logowania z sesjami zapisanymi w bazie, Cloudflare R2 do plików, wszystko na obecnym hostingu Vercel.

**Pros**:
- Każda warstwa jest niezależna, można wymienić jedną bez ruszania pozostałych.
- Dane osobowe i pliki trzymane w regionach UE od startu.
- Zero opłat za pobieranie danych z R2, istotne przy marketplace pełnym zdjęć i rzutów oglądanych wielokrotnie.
- Neon już podłączony jako serwer MCP w tym środowisku, żywy dostęp od pierwszego dnia.

**Cons**:
- Cztery osobne konfiguracje i cztery panele zamiast jednego, więcej ruchomych części do utrzymania przez mały zespół.
- Auth.js w wersji 5 wymaga własnego schematu bazy danych na konta i sesje, więcej pracy na starcie niż rozwiązanie z gotowym interfejsem logowania.

### Option 2: Supabase jako jedna zintegrowana platforma (baza danych plus autoryzacja plus pliki) na Vercel

Jedna platforma pokrywa bazę danych, logowanie i przechowywanie plików naraz, z wbudowanymi politykami dostępu na poziomie wiersza (row level security).

**Pros**:
- Jedna integracja zamiast trzech osobnych, mniej konfiguracji na starcie.
- Wbudowane reguły dostępu na poziomie wiersza ułatwiają rozdzielenie danych klienta i producenta bezpośrednio w bazie.
- Oferuje regiony UE.

**Cons**:
- Pod spodem to zwykły Postgres, więc wymiana samego magazynu plików na R2 później jest technicznie możliwa (interfejs zgodny z S3), ale autoryzacja i konfiguracja Storage są dziś spięte z resztą platformy, więc taka wymiana to dodatkowa praca, nie przełączenie jednego ustawienia.
- Niższy darmowy limit przechowywania plików niż dedykowane R2, kosztowniej przy dużym ruchu zdjęć i rzutów typowym dla marketplace domów modułowych, choć przy skali samego pilotażu różnica jest niewielka.

### Option 3: Zestaw natywny dla Vercel (Neon przez integrację Vercel, Clerk, Vercel Blob)

Trzyma się w całości w ekosystemie Vercel: ta sama baza Neon, ale zarządzana przez integrację Vercel, Clerk jako zarządzane SaaS do logowania, Vercel Blob do plików.

**Pros**:
- Najmniejsza liczba osobnych kont i paneli do skonfigurowania, wszystko blisko jednego miejsca.
- Clerk daje gotowy interfejs logowania z pudełka, najszybszy start spośród trzech opcji.

**Cons**:
- Clerk oferuje rezydencję danych w UE na płatnych planach, ale wymaga świadomego wyboru tego planu i umowy, zamiast regionu ustawianego wprost przy zakładaniu własnej bazy i kubełka; mniej bezpośrednia kontrola niż przy samodzielnie hostowanym Auth.js i R2.
- Koszt rośnie z liczbą aktywnych użytkowników (Clerk) i z ruchem pobierania plików (Vercel Blob), drożej przy skali niż Option 1.

## Rationale

Region UE dla danych osobowych był jawnym wyborem zamawiającego ("skonfiguruj wszystko na region UE od startu"), nie moim założeniem, więc każda warstwa dotykająca danych osobowych lub plików musi mieć jasną, kontrolowaną lokalizację w UE; to wyklucza Option 3 jako najsłabszą tu odpowiedź i osłabia częściowo Option 2 (Supabase deklaruje regiony UE, ale wiąże trzy decyzje naraz).

Auth.js w wersji 5 wygrał z Clerk (koszt rosnący z liczbą użytkowników, rezydencja UE tylko na płatnym planie) głównie dlatego, że ten przepływ dotyka danych osobowych już teraz i płatności w niedalekiej przyszłości (funkcja 8), a pełna kontrola nad miejscem przechowywania sesji waży tu więcej niż szybkość wdrożenia. Przewaga nad Better Auth jest słabsza, niż pierwotnie ujęto: Better Auth ma stabilne wydanie 1.x z gotowym adapterem Drizzle oraz wbudowanymi wtyczkami do ról i organizacji, dokładnie tym, czego funkcja 14 (panel administracyjny, rola administratora) będzie potrzebować ręcznie przy Auth.js. Wybór Auth.js jest tu świadomym postawieniem na szerszą, dłużej istniejącą społeczność, ale status stabilności wersji 5 wymaga sprawdzenia tuż przed implementacją (patrz Follow-up w index.md); jeśli wciąż jest w wersji beta, warto rozważyć powrót do Better Auth.

Neon wygrał z Supabase i PlanetScale, bo jest już podłączony jako serwer MCP w tym środowisku (żywy dostęp bez dodatkowej konfiguracji), oferuje branch bazy danych na branch kodu przydatny przy przyszłej funkcji CI/CD (funkcja 3), i pozostaje samą bazą danych bez wiązania kolejnych decyzji.

Cloudflare R2 wygrał z Vercel Blob i Supabase Storage na ekonomice: ModularHub Europe to marketplace ze zdjęciami domów i rzutami oglądanymi wielokrotnie przez wielu odwiedzających, więc zerowa opłata za pobieranie danych ma tu realne znaczenie kosztowe, którego nie ma przy niskim ruchu.

Drizzle ORM wygrał z Prisma zgodnie z ogólną zasadą: ORM do prostych operacji, SQL do złożoności. Mniejszy rozmiar paczki i brak kroku generowania kodu pasują do środowiska serverless Vercela. Ślad audytowy dostępu do danych osobowych wymagany przez RODO nie zależy od wyboru ORM (najlepiej realizuje go osobna, dopisywalna tabela lub wyzwalacz bazy danych, niezależnie od Drizzle czy Prisma) i zostaje zaprojektowany przy funkcji 2 (model danych), nie tutaj. Tradeoff po stronie Drizzle: `drizzle-kit`, jego narzędzie migracji, jest mniej dojrzałe niż Prisma Migrate przy migracjach niszczących dane na produkcji, co wymaga większej ostrożności ręcznej.

Hosting zostaje na Vercel Pro, bo inżynier świadomie wybrał kontynuację (spec 0001 już go opłaca i skonfigurował), a żadne z narzędzi wybranych w tej decyzji nie wymaga zmiany hostingu. Pytanie o pełną rezydencję danych w UE po stronie samych funkcji obliczeniowych, nie tylko bazy danych i plików, zostaje świadomie odłożone (patrz Follow-up w index.md) do momentu, gdyby stało się twardym wymogiem prawnym, a nie tylko dobrą praktyką.

## References

**Project sources** (verifiable, in this repo):
- spec 0001, sekcja Deferred: świadomie odłożyła bazę danych, autoryzację, płatności, przechowywanie plików i silnik zgodności do osobnych sesji `/architect` w drugim etapie
- `AGENTS.md`, podejście budowy Tracer Bullet dla epiki Produkcja
- Serwer MCP Neon już podłączony w tym środowisku pracy

**Practices & standards**:
- RODO, Regulation (EU) 2016/679, art. 4 i 6, podstawa prawna przetwarzania danych osobowych i minimalizacja ryzyka poprzez kontrolę lokalizacji danych
- ORM do prostych operacji, SQL do złożoności (zasada stosowana przy wyborze Drizzle nad Prisma)
- Przechowywanie plików w dedykowanym magazynie obiektów, nigdy w bazie danych (zasada stosowana przy wyborze R2)
- Uwierzytelnianie oparte o sprawdzoną bibliotekę lub usługę, nigdy pisane od zera (zasada stosowana przy wyborze Auth.js)

**Links** (web verified, official documentation and pricing pages only):
- RODO, Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Neon, cennik: https://neon.com/pricing
- Supabase, cennik: https://supabase.com/pricing
- Clerk, cennik: https://clerk.com/pricing
- Cloudflare R2, cennik: https://developers.cloudflare.com/r2/pricing/
- Drizzle ORM, dokumentacja: https://orm.drizzle.team/docs/overview
- Vercel Blob, dokumentacja: https://vercel.com/docs/vercel-blob
- Vercel, zgodność i bezpieczeństwo: https://vercel.com/docs/security/compliance

Kilka źródeł znalezionych podczas researchu (blogi porównawcze, agregatory) nie trafiło na tę listę, bo nie są oficjalną dokumentacją ani stroną cennika; ich twierdzenia (na przykład status Vercel względem unijno-amerykańskich ram ochrony danych) nie zostały tu uznane za potwierdzone i celowo nie pojawiają się jako fakt w tym dokumencie.
