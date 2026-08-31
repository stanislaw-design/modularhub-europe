# 0017. Wybór zaplecza produkcyjnego

**Date**: 2026-08-28
**Status**: Accepted

## Summary

Ta decyzja wybiera prawdziwe zaplecze produkcyjne ModularHub Europe: bazę danych, sposób logowania, miejsce przechowywania plików i hosting, w miejsce dzisiejszych danych mockowych. Wybrano Neon jako bazę Postgres (relacyjna baza danych) w regionie Unii Europejskiej, Auth.js w wersji 5 do logowania klientów i producentów, Cloudflare R2 do plików oraz Drizzle ORM (warstwa dostępu do bazy danych) jako sposób rozmowy z bazą, wszystko dalej hostowane na Vercel. Wybór stawia na kilka niezależnych od siebie, sprawdzonych narzędzi zamiast jednej zamkniętej platformy, żeby dane osobowe klientów i producentów od startu trzymać w Unii Europejskiej, zgodnie z RODO. Ta decyzja jest fundamentem, na którym stoją wszystkie kolejne funkcje epiki Produkcja.

## Decision

**Chosen option**: Option 1: Zestaw niezależnych, sprawdzonych narzędzi (Neon, Auth.js w wersji 5, Cloudflare R2, Drizzle) na obecnym hostingu Vercel

Zaplecze produkcyjne stanie na czterech niezależnych, wyspecjalizowanych narzędziach: Neon jako serwerowa baza Postgres w regionie Frankfurt (Unia Europejska), Auth.js w wersji 5 hostowany samodzielnie z sesjami zapisanymi w bazie danych (nie w tokenie), Cloudflare R2 jako magazyn plików z kubełkiem w Unii Europejskiej, oraz Drizzle ORM jako warstwa dostępu do bazy danych. Hosting zostaje na obecnym Vercel Pro, bez zmian względem spec 0001.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Język | TypeScript | już ustalone w spec 0001, bez zmian |
| Framework | Next.js 16, App Router | już ustalone w spec 0001, bez zmian |
| Baza danych | Neon, serwerowa baza Postgres, region Frankfurt (UE) | już podłączona jako serwer MCP w tym środowisku, natywna integracja z Vercel, osobny branch bazy na każdy branch kodu, dane osobowe zostają w UE od startu |
| Warstwa dostępu do danych | Drizzle ORM | lekki, bez kroku generowania kodu, dobrze działa na środowiskach serverless Vercela, pełna kontrola nad zapytaniami SQL potrzebna przy audytach RODO |
| Autoryzacja | Auth.js (NextAuth) w wersji 5, sesje zapisane w bazie danych dla logowania przez dostawcę (OAuth) lub link magiczny | hostowany samodzielnie, dane sesji i kont zostają we własnej bazie; status stabilności wersji 5 wymaga sprawdzenia tuż przed budową (patrz Follow-up), a logowanie hasłem wymaga osobnej decyzji o sesjach JWT (patrz Follow-up) |
| Przechowywanie plików | Cloudflare R2, kubełek w regionie UE | zero opłat za pobieranie danych, ważne przy zdjęciach i rzutach oglądanych wielokrotnie, zgodny ze standardem S3 |
| Hosting | Vercel Pro, bez zmian | już opłacony i działający zgodnie ze spec 0001, natywna integracja z Neon, brak kosztu migracji |
| Obserwowalność | Odłożone do osobnej decyzji (funkcja 4 epiki Produkcja) | poza zakresem tej decyzji |

## Consequences

**Positive**:
- Dane osobowe klientów i producentów są przechowywane w Unii Europejskiej od pierwszego dnia (baza danych, pliki), co upraszcza rozmowę o RODO.
- Każda warstwa jest niezależna od pozostałych, żadnego zamknięcia w jednej platformie, więc każdą można wymienić osobno, gdy zajdzie potrzeba.
- Neon i Cloudflare R2 mają darmowe poziomy startowe, koszt miesięczny zaplecza jest bliski zeru na start pilotażu.
- Osobny branch bazy danych na branch kodu w Neon dobrze przygotowuje grunt pod funkcję CI/CD i środowiska (funkcja 3 epiki Produkcja).

**Negative / tradeoffs**:
- Cztery osobne narzędzia zamiast jednej platformy oznaczają cztery osobne konfiguracje i cztery miejsca, gdzie coś może się zepsuć, zamiast jednego.
- Auth.js w wersji 5 wymaga własnego schematu bazy danych na konta i sesje oraz ręcznej konfiguracji, więcej pracy na starcie niż gotowe rozwiązanie komercyjne z interfejsem logowania z pudełka.
- Cloudflare R2 wymaga własnej integracji (podpisane adresy dostępu, reguły uprawnień), mniej "wtyczkowe" niż rozwiązanie natywne dla Vercel.
- Hosting zostaje na Vercel, firmie amerykańskiej. Jeśli w przyszłości pojawi się twardy wymóg prawny pełnej rezydencji danych w UE także po stronie funkcji obliczeniowych, nie tylko bazy danych i plików, trzeba będzie osobno zaprojektować migrację hostingu.
- Region UE dla bazy danych i plików nie załatwia RODO w całości. Neon, Cloudflare i Vercel są podmiotami z siedzibą w USA, więc nadal potrzebne są umowy powierzenia danych (DPA) z każdym z nich, lista podwykonawców przetwarzania i sprawdzenie zabezpieczeń transferu danych; to zadanie samo w sobie, nie efekt uboczny wyboru regionu.
- Audytowalność dostępu do danych osobowych (kto, kiedy, do jakiego rekordu) nie jest tu jeszcze zaprojektowana; jest wymogiem RODO i musi zostać rozwiązana najpóźniej przy projektowaniu modelu danych (funkcja 2 epiki Produkcja), nie jest opcjonalna. Osobno, prawo do usunięcia danych (bycia zapomnianym) koliduje z historią wersji Neon (branch/PITR) i osieroconymi plikami w R2 po skasowaniu rekordu w bazie; to też wymaga jawnego zaprojektowania, nie samo się rozwiąże.
- Sesje zapisane w bazie danych oznaczają jedno zapytanie do Neon przy każdym żądaniu zalogowanego użytkownika; przy darmowym poziomie Neon, który usypia bazę przy braku ruchu, pierwsze żądanie po uśpieniu będzie zauważalnie wolniejsze.
- Drizzle Kit (narzędzie migracji Drizzle) jest mniej dojrzałe niż Prisma Migrate przy migracjach niszczących dane (np. zmiana typu kolumny na produkcji); wymaga większej ostrożności ręcznej przy takich migracjach.

**Neutral**:
- Zespół uczy się czterech nowych narzędzi naraz (Neon, Drizzle, Auth.js, R2), każde z własną dokumentacją i konwencją; zainstalowane Agent Skille to łagodzą.
- Zmienne środowiskowe i sekrety (adres bazy danych, sekret Auth.js, dane dostępowe R2) muszą trafić do lokalnego pliku `.env.local` teraz, a do zarządzania sekretami środowisk produkcyjnych i staging przy funkcji 3 (CI/CD) później.

## Follow-up

- [ ] **Blokujące przed napisaniem kodu logowania**: sprawdź aktualny status stabilności Auth.js w wersji 5 (w chwili pisania tego spec bywał oznaczany jako beta). Jeśli nadal beta, świadomie zaakceptuj to ryzyko dla przepływu dotykającego danych osobowych i przyszłych płatności, albo wróć do Better Auth mimo jego krótszej historii produkcyjnej.
- [ ] **Blokujące przed napisaniem kodu logowania**: ustal metody logowania (OAuth/link magiczny kontra hasło) razem z funkcją 6. Credentials provider w Auth.js wymusza sesje JWT, co koliduje z decyzją o sesjach w bazie danych zapisaną w tym spec. Jeśli hasło jest potrzebne, świadomie wybierz JWT dla tej ścieżki logowania albo ogranicz się do OAuth/linku magicznego wszędzie.
- [ ] **Blokujące przed napisaniem kodu logowania**: skaner bezpieczeństwa `npx skills` oznaczył zainstalowany skill `authjs-skills` (`gocallum/nextjs16-agent-skills`) jako "Critical Risk" przy instalacji. Po ręcznym przeczytaniu całej treści (zwykła dokumentacja Markdown z przykładami kodu, bez skryptów wykonywalnych) ryzyko wygląda na fałszywy alarm skanera, ale ktoś z zespołu musi to potwierdzić, zanim skill zacznie prowadzić prawdziwy kod logowania.
- [ ] Ustaw region funkcji Vercel na `fra1` (Frankfurt) w konfiguracji projektu. Bez tego dane osobowe są przetwarzane w domyślnym regionie USA, mimo że baza danych i pliki siedzą w UE, co podważa całe uzasadnienie tej decyzji.
- [ ] `proxy.ts` (przekierowania locale) działa dziś na Edge Runtime. Ochrona tras przez Auth.js z adapterem Drizzle/Neon nie działa na Edge, więc potrzebny będzie rozdzielony config (osobny, edge safe `auth.config.ts` bez adaptera bazy) albo przypięcie `proxy.ts` do Node runtime, zanim logowanie trafi do middleware.
- [ ] Załóż projekt bazy Neon w regionie Frankfurt (UE) i wygeneruj `DATABASE_URL` do `.env.local`; serwer MCP Neon jest już podłączony w tym środowisku, ale realny projekt bazy jeszcze nie istnieje.
- [ ] Załóż kubełek Cloudflare R2 z jurysdykcją EU (nie tylko location hint, jurysdykcja jest ustawiana raz przy tworzeniu kubełka i nie da się jej potem zmienić), z domeną własną do serwowania plików zamiast `r2.dev` (limitowany, nie produkcyjny), i dodaj ten host do `images.remotePatterns` w `next.config.ts` zgodnie z regułą już zapisaną w `AGENTS.md`.
- [ ] Wygeneruj `AUTH_SECRET` dla Auth.js przed pierwszym uruchomieniem, zgodnie z konwencją zainstalowanego skilla `authjs-skills`.
- [ ] Podpisz umowy powierzenia danych (DPA) z Neon, Cloudflare i Vercel i opublikuj listę podwykonawców przetwarzania; region UE dla bazy danych i plików to jeden element zgodności z RODO, nie cała odpowiedź.
- [ ] Zaprojektuj usuwanie danych osobowych (prawo do bycia zapomnianym) uwzględniając historię branchy/PITR w Neon i osierocone pliki w R2 po skasowaniu rekordu w bazie; razem z funkcją 2 (model danych) i funkcją 5 (RODO i zgodność prawna).
- [ ] Funkcja 6 epiki Produkcja ("Rdzeń pętli na prawdziwym zapleczu") zaprojektuje właściwy model danych kont i sesji oraz pierwszą migrację Drizzle; ta decyzja wybiera tylko narzędzia, nie schemat danych.
- [ ] Ustal plan kopii zapasowych i przywracania (backup/restore) obejmujący wszystkie cztery usługi (Neon, R2, Auth.js/baza sesji, Vercel), oraz alerty kosztowe na każdej z nich, zanim pojawi się prawdziwy ruch produkcyjny. Cztery niezależne dostawcy oznaczają cztery miejsca, które mały zespół musi umieć samodzielnie odzyskać po awarii.
- [ ] Rozważ doinstalowanie skilla `neon-postgres-branches` (ten sam dostawca co `neon-postgres`, skupiony na strategii branchowania bazy) przy projektowaniu funkcji 3 (CI/CD i środowiska), gdzie branch bazy na branch kodu staje się częścią codziennej pracy.
- [ ] Zaktualizuj regułę w `AGENTS.md` ("No database, no login, no real payments in this stage") po zbudowaniu funkcji 6, bo ta reguła opisuje etap Prototyp i przestanie być prawdziwa (zadanie dla `/sync`, nie do zrobienia teraz).

## Rationale

Pełne uzasadnienie, porównanie wszystkich rozważanych zestawów i źródła: patrz [rationale.md](rationale.md).
