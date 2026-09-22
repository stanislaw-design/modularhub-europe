# 0048. Zarządzany przepływ doradczy: uzasadnienie

Zapis decyzji dla ludzi i dla `/architect` przy aktualizacji. `/develop` go nie czyta. Specyfikacja do budowy: [index.md](index.md).

## Context

> ⚠️ Premise note: Ten temat obejmuje kilka niezależnych decyzji: komunikator, cykl życia sprawy z briefem i zaproszeniami, wspólny format oferty i porównanie, wybór finalisty i wspólną rozmowę, panel doradcy. To za dużo na jedną budowę. Ta specyfikacja trzyma je razem, bo dzielą jeden model danych i jedną regułę prywatności, ale plan budowy jest pocięty na czternaście cienkich kroków, które można wdrażać i weryfikować osobno. Poza zakresem świadomie zostają: kontrakt i utworzenie zamówienia, transport i przewoźnicy, automatyczne zadania w tle, ping na żywo od dostawcy, tłumaczenie maszynowe. Każde z nich to osobna, późniejsza specyfikacja (patrz Follow-up w index.md). Drugie ryzyko: model, w którym platforma stoi pomiędzy klientem a producentem, zawsze grozi obejściem, gdy producent zdobędzie dane klienta. Specyfikacja ogranicza je momentem udostępnienia danych, ale go nie eliminuje.

Dziś zapytanie klienta o pojedyncze domy jest zapisywane w `inquiry`, widziane wprost przez producentów wybranych modeli (`app/[locale]/producer/panel/inquiries`), a producent odpowiada klientowi ofertą przez `submitOffer`, którą klient przyjmuje przez `respondToOffer`, co od razu tworzy `order` (spec 0033). Formularz zbiera imię, e mail, telefon i kraj. Nie ma adresu działki, wolnego tekstu, rozmowy, briefu, wspólnego formatu oferty, kontroli oferty ani porównania. ModularHub w ogóle nie uczestniczy w wymianie: jest tablicą ogłoszeń. Panel administratora (`app/[locale]/internal/inquiries`) to tylko podgląd zapytań i ofert, bez możliwości odpowiedzi.

Założenia biznesowe zostały ustalone z inżynierem: klient wysyła zapytanie do ModularHub, nie do producentów. Doradca zbiera potrzeby w komunikatorze, przygotowuje brief, klient go zatwierdza, brief idzie do producentów wybranych modeli oraz, za zgodą klienta, do dodatkowych. Producenci odpowiadają ofertą, doradca ją kontroluje, buduje porównanie, klient wybiera finalistę i przechodzi do wspólnej rozmowy. Wcześniejszy szkic procesu jest w `docs/research/2026-09-19-managed-advisory-flow.md`. Ta specyfikacja go weryfikuje i zawęża.

Siły w grze: zespół jest mały (jeden doradca na start), stos jest ustalony (Next.js 16, Neon przez HTTP, Vercel, Resend, R2), plan Vercel Pro jest świadomie odłożony, więc zadania w tle są ograniczone. Dane dotyczą klientów z UE, więc obowiązuje RODO, w szczególności zgoda na udostępnienie danych producentowi i retencja. Prywatność kanałów jest wymaganiem twardym: klient, producent i doradca widzą różne rzeczy. Nieprzyjęcie tej decyzji zostawia ModularHub bez kontroli nad klientem i bez wartości doradczej.

## Options considered

### Option 1: Zostawić bezpośredni przepływ i dodać doradcę jako obserwatora

Zapytanie nadal idzie do producentów, ale doradca dostaje kopię i może pisać w wątku. Najmniejsza zmiana kodu.

**Pros**:
- Najmniej pracy, brak nowej maszyny stanów.
- Szybka pierwsza odpowiedź, bo producent widzi zapytanie od razu.

**Cons**:
- Producent dostaje dane klienta zanim cokolwiek zostało uporządkowane. Platforma traci kontrolę nad relacją, co przeczy założeniu biznesowemu.
- Brak briefu i wspólnego formatu, więc oferty pozostają niepodobne do porównania.
- Nie spełnia wymagania „zapytanie trafia do nas, nie do producentów”.

### Option 2: Zarządzana sprawa doradcza na rozszerzonym `inquiry`, własny komunikator w Neon, polling

Zapytanie trafia tylko do ModularHub. Korzeniem sprawy jest rozszerzone `inquiry`, rozmowy to `channel` i `message` w Neon, brief i porównanie są niezmiennymi wersjami, producent odpowiada przez zaproszenie i ofertę we wspólnym formacie, dostęp jest wyliczany z rodzaju kanału i roli. Wiadomości docierają przez polling, z danymi gotowymi na późniejszy ping od dostawcy.

**Pros**:
- Spełnia cały zamysł biznesowy, prywatność wymuszona po stronie serwera.
- Reużywa `inquiry`, `offer`, panel klienta, panel producenta, panel administratora, Auth.js, Resend, R2, Zod, audyt.
- Zero nowych dostawców na start (poza osobnym bucketem R2).
- Karty i powiązanie z briefem i ofertami są własne, więc nie ma ograniczeń widgetu.

**Cons**:
- Najwięcej pracy po stronie budowy: około dziesięciu nowych tabel i cała logika uprawnień.
- Wiadomość pojawia się po do kilku sekundach, nie natychmiast.
- Wymaga dyscypliny w testach uprawnień.

### Option 3: Ten sam przepływ, ale komunikator jako hostowany czat SaaS (Stream, Sendbird, TalkJS)

Wiadomości, kanały i widżet czatu prowadzi dostawca, model sprawy, brief, oferty i porównanie zostają w Neon.

**Pros**:
- Gotowy interfejs, powiadomienia, załączniki, czas rzeczywisty.
- Mniej kodu czatu.

**Cons**:
- Prywatność kanałów trzeba odwzorować w drugim systemie i utrzymać spójną z bazą.
- Karty (odpowiedź zapisuje pole, podgląd briefu z zatwierdzeniem) wymagają niestandardowych typów wiadomości, więc większość pracy interfejsu zostaje.
- Dane klientów u obcego dostawcy, wieloregionowość według sprawdzenia tylko w planach dla firm.
- Koszt wejścia według sprawdzenia rzędu 400 do 500 dolarów miesięcznie (Stream około 499, Sendbird około 399), nieproporcjonalny do kilkudziesięciu spraw.

### Rozważane warianty samej warstwy dostarczania wiadomości (pod Option 2)

| Wariant | Ocena |
|---|---|
| Polling (wybrany) | Około pół dnia, działa z `neon-http`, wystarcza dla skali |
| Polling plus ping od Ably, Pusher albo Cloudflare | Później, około pół do jednego dnia, dane już gotowe |
| SSE z Route Handlera | Baza i tak odpytywana po stronie serwera, mały zysk względem pollingu |
| Własny WebSocket na Vercel | Raportowane jako publiczna beta, połączenia przypięte do jednej instancji, wymaga zewnętrznego magazynu do rozsyłania |
| Własny serwer WebSocket na Cloudflare Durable Objects | Pasuje technicznie, ale nowy cel wdrożeń poza pipeline (spec 0019), 2 do 4 dni plus utrzymanie |
| `LISTEN/NOTIFY` w Postgresie | Wymaga stałego połączenia na otwartą rozmowę, nie działa przez pulowany adres Neon ani sterownik HTTP (z wiedzy, niepotwierdzone w tym sprawdzeniu) |
| Narzędzie supportowe (Chatwoot, Crisp, Intercom) | Dobre jako skrzynka doradcy, złe jako kanał producenta i wspólny |
| Protokół otwarty (Matrix, Zulip) | Ciężkie utrzymanie serwera, przesada |
| Tylko e mail | Brak kart i statusów, słabe wymuszanie prywatności |

## Rationale

**Option 2, bo tylko ona spełnia założenie „zapytanie trafia do nas” bez kosztu obcego systemu.** Option 1 zostawia ModularHub tablicą ogłoszeń, co jest dokładnie tym, czego inżynier chce uniknąć (basis: założenie biznesowe z rozmowy projektowej 2026 09 21). Option 3 kupuje gotowy czat, ale karty i prywatność trzech kanałów i tak muszą być własne, więc oszczędność jest mała, a koszt stały i dane u obcego dostawcy są realne. Skala „kilkadziesiąt spraw jednocześnie, jeden doradca” nie usprawiedliwia miesięcznej opłaty rzędu setek dolarów (basis: sprawdzenie cen Stream i Sendbird w Stage (c), dane z drugiej ręki).

**Rozszerzone `inquiry`, nie nowa tabela**, bo `inquiry` trzyma już klucz idempotencji, powiązanie z klientem, panel klienta i, przez `offer`, cały łańcuch aż do `order`. Nowa tabela oznaczałaby dwie tabele o tym samym pojęciu i podwójne widoki. Nowa kolumna `stage` z wartością `legacy_direct` pozwala starym wierszom żyć bez zmian, co jest wzorcem strangler (basis: strangler pattern for live migrations, AGENTS.md o zasadzie migracji addytywnych w lib/db).

**Polling zamiast czasu rzeczywistego**, bo rozmowa doradcy z klientem jest wymianą wiadomości, nie czatem na żywo, a `neon-http` z funkcjami serverless na Vercel nie trzyma połączeń. Prawdziwy WebSocket wymagałby zewnętrznego rozsyłania niezależnie od tego, kto go pisze. Wybór nie zamyka drogi: dane kanałów i wiadomości są niezależne od transportu, więc sygnał „jest nowe” od dostawcy dołoży się w pół do jednego dnia (basis: dokumentacja Vercel o WebSocketach, ceny Cloudflare, patrz References).

**Kanały bez tabeli członków, dostęp wyliczany**, bo członkostwo wynika z trzech faktów, które już istnieją: właściciel sprawy, producent zaproszenia i rola admin. Tabela członków dodałaby wiersze, które mogłyby się rozjechać z prawdą. Jedna funkcja `requireCaseAccess` jest jedynym miejscem, które decyduje o dostępie, co zmniejsza ryzyko pominięcia sprawdzenia w jednej z wielu tras (basis: application layer authorization z jednym punktem decyzji).

**Rdzeń oferty mały, reszta zalecana**, bo inżynier chciał, żeby pola były rekomendacją, nie przymusem, a wymaganie dziewiętnastu pól odstraszy producentów. Cena za to jest jawna: porównanie będzie miało luki. Dlatego brak informacji jest osobnym, widocznym stanem, a doradca sprawdza oferty przed publikacją, zamiast zgadywać (basis: nieznany koszt pokazany jako nieznany, z notatki procesu).

### Decyzje przydzielone mnie (RECOMMEND) i odchylenia od odpowiedzi inżyniera

1. **Reguła e maila zamiast „po 5 minutach nieprzeczytania”.** Inżynier wybrał e mail po około 5 minutach nieprzeczytania. To wymaga zadania w tle, którego nie ma (Vercel Cron o takiej częstotliwości wymaga planu Pro, który jest odłożony, patrz pamięć projektu o CI/CD). Zamiast tego: jeden e mail na odbiorcę i kanał w oknie 10 minut, żaden, jeśli odbiorca był aktywny w ostatnich 90 sekundach (wykrywane przez `last_seen_at` z pollingu). Efekt jest podobny, bez zadania w tle. Druga opcja: zaplanowany workflow GitHub Actions co 5 minut, z jitterem i nowym punktem awarii. To odchylenie jest opisane w Consequences.
2. **E mail bez treści wiadomości**, tylko link i powód. Skrzynki i kopie e maili wychodzą poza kontrolę platformy, a wiadomości mogą zawierać dane osobowe i ceny.
3. **Prywatny bucket R2 z osobnymi kluczami i osobną tabelą `case_file`**, zamiast reuse `document`. Dotychczasowy bucket jest publiczny do odczytu (spec 0031), a jego dokumentacja mówi wprost, że nie nadaje się do dokumentów prywatnych. Link podpisywany na 5 minut po sprawdzeniu dostępu dodaje zależność `@aws-sdk/s3-request-presigner`, świadomie pominiętą dotąd w publicznym kliencie. Wariant B: pobranie przez Route Handler ze strumieniowaniem (bez nowej zależności, większe obciążenie funkcji).
4. **Moduł `lib/case-producer-queries.ts` z jawnymi listami kolumn jako jedyne źródło danych sprawy dla panelu producenta**, plus filtr `legacy_direct` na wszystkich starych zapytaniach producenta. Pierwsza wersja specyfikacji proponowała widok bazy, ale przegląd innym modelem wykazał, że widok nie jest bramką (brak RLS, aplikacja łączy się jako właściciel), a istniejące `getInquiriesForProducer` i `getInquiryDetailForProducer` już dziś wybierają imię, e mail i telefon z `inquiry` bez filtra etapu. Bez poprawki producent wybranego modelu widziałby nową sprawę z danymi od razu po wysłaniu.
5. **Wyliczane przy odczycie, bez zadań w tle:** oznaczenie „po terminie”, znacznik „na wcześniejszej wersji briefu”, tabela porównania z pól ofert. Mniej stanów do utrzymania kosztem odczytu.
6. **Brief bez danych osobowych klienta**, wymuszone w akcji, żeby błąd doradcy nie wyciekł imienia do producenta.
7. **Zgody jako osobna, niezmienna tabela**, nie tylko wiadomość w czacie, bo wiadomość może być usunięta na prośbę klienta, a dowód zgody musi zostać.
8. **`order` nie powstaje.** Wybór finalisty nie jest umową. Utworzenie zamówienia przechodzi do specyfikacji o kontrakcie, dlatego `respondToOffer` ze spec 0033 działa tylko dla starych zapytań.
9. **Retencja 24 miesiące** jako propozycja do potwierdzenia z prawnikiem. Automatyczna anonimizacja jest odłożona, bo pierwsze sprawy dojrzeją za około dwa lata, a usunięcie na prośbę działa od razu.

## References

**Project sources** (weryfikowalne w repo):
- `AGENTS.md` (Tracer Bullet, `proxy.ts`, reguły dla `lib/observability`, angielskie adresy)
- `lib/db/AGENTS.md` (`neon-http`, `db.batch`, brak `db.transaction`, addytywne migracje)
- `lib/storage/AGENTS.md` i `lib/storage/ai-private-r2-client.ts` (publiczny bucket, wzorzec prywatnego klienta bez presignera)
- spec 0005, 0018, 0019, 0023, 0024, 0031, 0033, 0037 i 0038 (model danych, oferty, istniejący przepływ, B2B)
- `docs/research/2026-09-19-managed-advisory-flow.md` (szkic procesu, punkt wyjścia)
- `lib/inquiry-actions.ts`, `lib/offer-actions.ts` (obecny stan przepływu)
- pamięć projektu: odłożony plan Vercel Pro

**Practices & standards**:
- strangler pattern dla migracji na żywym systemie
- klucze idempotencji dla operacji zapisu
- autoryzacja w warstwie aplikacji z jednym punktem decyzji
- RODO: zgoda jako osobny, udokumentowany akt, minimalizacja danych, ograniczenie przechowywania
- niezmienne wersje (append only) dla zgód i ofert

**Links** (sprawdzone przez tanią podsieć badawczą 2026 09 21, część z drugiej ręki):
- Vercel, WebSockets na funkcjach (raportowane jako publiczna beta, połączenie przypięte do instancji): https://vercel.com/docs/functions/websockets
- Ably, rozliczanie WebSocketów na Vercel wg aktywnego CPU (strona dostawcy, nie oficjalna Vercel): https://ably.com/vercel/websockets-on-vercel
- Cloudflare Workers, ceny (Durable Objects, plan od 5 dolarów miesięcznie): https://developers.cloudflare.com/workers/platform/pricing/
- Porównanie bibliotek czasu rzeczywistego, limity darmowych planów Ably i Pusher (źródło zewnętrzne, do weryfikacji przed decyzją): https://www.pkgpulse.com/guides/best-realtime-libraries-2026
- Stream Chat, ceny wejściowe (blog dostawcy): https://getstream.io/blog/what-i-learned-researching-chat-api-pricing/
- TalkJS kontra Stream (strona dostawcy): https://talkjs.com/compare/talkjs-vs-stream/
- Niepotwierdzone w tym sprawdzeniu i opisane w specyfikacji jako do weryfikacji: dokładny limit czasu funkcji Fluid compute per plan, zachowanie `LISTEN/NOTIFY` na pulowanym adresie Neon, wsparcie WebSocket sterownika Neon, ceny TalkJS, regiony danych dostawców czatu.
