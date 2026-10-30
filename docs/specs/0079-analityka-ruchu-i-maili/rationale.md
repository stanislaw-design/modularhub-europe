# 0079. Analityka ruchu i maili: uzasadnienie

## Context

> ⚠️ Premise note: Kafelek "Wyświetlenia stron (30 dni)" na dashboardzie `/internal` sugeruje, że pomiar ruchu działa, ale zapytanie HogQL szuka zdarzeń `$pageview`, a w projekcie jest tylko `posthog-node` (serwer) i nikt ich nie wysyła. Pomiar ruchu więc nie istnieje, nie trzeba go "dopracować", trzeba go zbudować. Drugie założenie do zdjęcia: że otwarcia maili są wiarygodną miarą i że można je mierzyć bez zgody. Otwarcia są zawyżone (Apple Mail Privacy Protection, skanery linków), a wytyczne EDPB 2/2023 obejmują zgodą także piksele śledzące w mailach i linki śledzące. Dlatego na dziś ich nie mierzymy.

Co mamy dziś: spec 0021 dał PostHog (EU Cloud) wyłącznie po stronie serwera dla zdarzeń biznesowych, wszystko przez `lib/observability/`, z regułą ESLint zakazującą importu SDK gdzie indziej. Panel admina (spec 0055) czyta PostHog przez HogQL i Sentry. Wszystkie maile przechodzą przez jedno miejsce, `sendNotificationEmail()` w `lib/notifications/send.ts`, które dziś liczy tylko "wysłano" i "nie wyszło", nigdy "dostarczono".

Siły, które kształtują wybór:
- Rynek UE: zapis w urządzeniu użytkownika lub dostęp do niego wymaga zgody (ePrivacy art. 5 ust. 3, w Polsce art. 399 Prawa komunikacji elektronicznej), poza wyjątkiem ścisłej konieczności. Prawo UE nie ma wyjątku dla analityki. Francuski CNIL ma wąski wyjątek dla pomiaru oglądalności, ale nie znaleziono oficjalnego stanowiska UODO ani UKE o takim wyjątku w Polsce.
- Brak dziś jakiegokolwiek banera zgody w aplikacji.
- Rachunek za Vercel pod presją (spec 0078, największe pozycje to Fast Origin Transfer i Fluid CPU), `proxy.ts` z szerokim matcherem, `cacheComponents: true`.
- Producenci to zawodowcy, częściej z blokerami reklam.
- Resend włącza śledzenie otwarć i kliknięć dla całej domeny nadawczej, nie dla pojedynczego maila.
- Mały zespół: im mniej własnej infrastruktury, tym lepiej.

Brak decyzji oznacza dalszą ślepotę: nie wiadomo, czy ruch rośnie, które produkty ciągną, ani czy zapytania do producentów w ogóle do nich docierają.

## Options considered

### Decyzja A: gdzie żyją dane o ruchu

**Opcja A1: PostHog jako źródło, panel czyta HogQL (wybrana dla ruchu).** posthog-js liczy sesje, czas i gości. Mało kodu, panel już umie czytać HogQL.
- Pros: najmniej kodu, sesje i czas liczone gotowo, bez zapisów do naszej bazy
- Cons: dane poza naszą bazą, zależność od limitów i cen PostHog, połączenie z producentem tylko przez właściwości zdarzeń

**Opcja A2: własne tabele w Neon.** Własny beacon zapisuje każde wejście.
- Pros: pełna kontrola, łatwe złączenia z producentami
- Cons: sami liczymy sesje i czas, każdy zapis to funkcja i zapis do bazy (koszt, spec 0078), dużo kodu

**Opcja A3: hybryda.** PostHog dla ruchu, Neon dla maili (wybrana).
- Pros: każdy rodzaj danych tam, gdzie jest najtańszy w utrzymaniu
- Cons: dwa źródła w jednym panelu, więc dwa tryby awarii (stąd AC-11)

### Decyzja B: zgoda na analitykę

**Opcja B1: baner, bez zgody nic nie mierzymy (wybrana).** Analityka w ogóle się nie ładuje przed zgodą.
- Pros: najbezpieczniej prawnie i najprościej technicznie, nie opiera się na niepewnej interpretacji
- Cons: liczby wyraźnie niższe niż prawdziwy ruch

**Opcja B2: baner, a przed zgodą anonimowy pomiar bez zapisu w przeglądarce.** Pierwotnie wybrana, odrzucona po sprawdzeniu przepisów.
- Pros: liczby bliższe prawdzie
- Cons: wytyczne EDPB obejmują także dostęp do urządzenia przez skrypty, nie tylko zapis, a w Polsce nie ma oficjalnego stanowiska dopuszczającego taki tryb; dwa tryby, więcej pracy

**Opcja B3: bez banera, tylko tryb bez ciasteczek.** Najprostsza dla użytkownika, ale najbardziej ryzykowna prawnie, odrzucona.

### Decyzja C: maile do producentów

**Opcja C1: tylko dziennik wysyłek i dane z webhooka Resend, bez pikselki i bez śledzonych linków.** Etap pośredni (etap 2 planu).
- Pros: nic nie dotyka urządzenia odbiorcy, nie wymaga zgody, mało kodu, odpowiada na pytanie "czy zapytania docierają"
- Cons: brak open rate i kliknięć

**Opcja C2: własna pikselka i podpisane przekierowanie, tylko u użytkowników producenta, którzy dali osobną dobrowolną zgodę (wybrana, etap 3).** Zgoda zbierana przy zakładaniu konta, zmienialna w ustawieniach, zapisywana per użytkownik.
- Pros: daje open rate i kliknięcia na podstawie zgody wymaganej przez EDPB; UTM per mail; kontrola per typ maila
- Cons: wyniki dotyczą tylko zgodzonych (próbka), więcej kodu (pole w rejestracji, przełącznik, tabela zgód, trasy), skanery podbijają kliknięcia (filtrujemy), wywołania funkcji. Zgoda wymuszona jako warunek konta byłaby nieważna, więc pole musi być opcjonalne.

**Opcja C3: Resend na drugiej domenie nadawczej tylko dla producentów.** Pros: mało kodu. Cons: ta sama kwestia zgody, druga domena (limit planu), DNS, osobna reputacja wysyłki.

**Opcja C4: Resend na całej domenie.** Pikselka i przepisane linki trafiają też do maili klientów i do linku logowania. Odrzucona.

### Decyzja D: przekierowanie zdarzeń przez naszą domenę

**Opcja D1: `rewrites` na `/ingest` (wybrana).** Pros: mniej danych ucinanych przez blokery, bez funkcji. Cons: dodatkowe żądania w limicie Vercel, wymóg wyłączenia z `proxy.ts` i `skipTrailingSlashRedirect`.

**Opcja D2: bezpośrednio do PostHog.** Pros: zero ruchu na Vercelu. Cons: blokery utną część danych, szczególnie u producentów.

## Rationale

Dla ruchu wybrano PostHog, bo ma już gotowe sesje, czas na stronie i gości, panel i tak czyta go przez HogQL, a własny beacon zapisywałby do Neon przy każdej wizycie, co uderza w koszty pod presją specu 0078. Maile są wyjątkiem: potrzebujemy złączenia po `producer_id` i `email_type`, a Resend nie pozwala łączyć zdarzeń z naszymi rekordami bez własnego identyfikatora. Tag `message_id` rozwiązuje to bez dotykania urządzenia odbiorcy.

Zgodę rozwiązano najbardziej ostrożnie, bo właściciel zdecydował, że na dziś nic nie mierzymy bez zgody. Wcześniejszy pomysł anonimowego pomiaru przed zgodą upadł po sprawdzeniu przepisów: nie ma dla niego oficjalnego oparcia w Polsce, a wytyczne EDPB rozszerzają zgodę poza ciasteczka. Ceną są niższe liczby ruchu, a zyskiem prosta i obronna zgodność.

Maile mają dwa poziomy. Dostarczalność z webhooka nie dotyka urządzenia odbiorcy, więc działa dla wszystkich (etap 2). Pikselka otwarć i śledzone kliknięcia wymagają zgody według wytycznych EDPB, a właściciel wskazał, że zgoda będzie zbierana przy zakładaniu konta producenta. Kod pokazał, że dziś formularz rejestracji nie ma żadnej zgody, więc ją budujemy: osobne, niezaznaczone, nieobowiązkowe pole (zgoda wymuszona jako warunek konta byłaby nieważna) i zapis per użytkownik, bo ślad zostawia się na urządzeniu osoby, która czyta mail, a producent może mieć kilka takich osób (spec 0057). Obecni producenci i dołączeni członkowie zaczynają bez zgody i mogą ją dać w ustawieniach. Konsekwencją jest to, że open rate dotyczy zgodzonych, więc panel pokazuje też udział maili śledzonych.

Dla przekierowania `/ingest` liczy się to, że `rewrites` na zewnętrzny adres działa w warstwie routingu Vercel, bez funkcji, więc nie dotyka najdroższych dziś pozycji rachunku. Prawdziwe ryzyko to `proxy.ts`, dlatego jest to osobne kryterium (AC-4) z testem.

Bez źródeł zewnętrznych w specyfikacji, zgodnie z wyborem właściciela (poziom `none`). Podstawa prawna jest opisana w Context nazwami przepisów i wytycznych, a rozmowa z prawnikiem pozostaje bramką przed produkcją.
