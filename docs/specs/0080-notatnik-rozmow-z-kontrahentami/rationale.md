# 0080. Notatnik rozmów z kontrahentami: uzasadnienie decyzji

Specyfikacja do budowy: [index.md](index.md).

## Context

> ⚠️ Premise note: gotowy CRM albo arkusz pokryłby większość tej potrzeby bez pisania kodu, a koszt własnego narzędzia to jego utrzymanie. Własne narzędzie jest tu uzasadnione trzema rzeczami, których gotowy produkt nie da tanio: linkami do rekordów platformy, planowanym botem pod waszą kontrolą i brakiem kolejnego konta do pilnowania dla dwóch osób. Jeśli po miesiącu okaże się, że używacie tylko listy kontaktów i terminów, arkusz wystarczyłby, a ten spec byłby za duży.

ModularHub Europe prowadzi rozmowy z kilkunastoma producentami i dostawcami jednocześnie: wyceny, importy katalogów, warunki współpracy, a do tego sprawy jednorazowe (łóżka od Kristola, zapytania spoza platformy). Dziś ich stan żyje w głowie, w mailach i w rozmowach telefonicznych. Stanisław i Artur (szef) muszą zawsze wiedzieć, co wysłano, na co czekamy i co trzeba zrobić, bo bez tego follow upy przepadają, a drugi człowiek nie wie, na jakim etapie jest rozmowa.

Nie każdy kontrahent jest producentem z konta na platformie, a jedna firma ma zwykle kilka równoległych tematów, więc nie da się opisać wszystkiego jednym, sztywnym lejkiem etapów. Platforma ma już własne przepływy dla zapytań, ofert, dużych zamówień i spraw doradczych (źródło prawdy), których notatnik nie może dublować. Panel `/internal` istnieje, ma bramkę roli `admin`, bazę Neon z Drizzle, prywatny kubełek R2, nadawcę maili i cron.

Zakres danych osobowych: telefony i maile osób kontaktowych w firmach (dane biznesowe objęte RODO). Dane zostają w UE (Neon Frankfurt, R2 w jurysdykcji UE). Docelowo drugim wejściem ma być bot, który zamienia wiadomość lub głosówkę na zapis, więc model nie może być zbudowany pod ręczne wpisywanie w formularzu.

## Options considered

### Option 1: Własna sekcja w panelu admina (firma, osoba, sprawa, wpis, zadanie)

Nowa sekcja `/internal/conversations` z siedmioma tabelami, statusem wyliczanym z zadań, linkami do rekordów platformy i dziennym mailem.

**Pros**:
- Linki do platformy i wspólne konto administratora bez dodatkowych narzędzi.
- Model gotowy pod bota (autor, źródło wpisu, funkcje domenowe niezależne od sesji).
- Pełna kontrola nad danymi (UE) i brak kosztu licencji.

**Cons**:
- Własny kod do utrzymania i testowania.
- Wszystkie funkcje trzeba zbudować: wyszukiwanie, filtry, załączniki.

### Option 2: Gotowy CRM, Notion lub arkusz

Użycie istniejącego narzędzia, np. darmowego planu CRM, bazy w Notion albo arkusza Google.

**Pros**:
- Działa od razu, bez kodu.
- Rozbudowane widoki i integracje ze skrzynką mailową.

**Cons**:
- Brak linków do rekordów platformy i brak wspólnych użytkowników z panelem.
- Bot musiałby zapisywać przez cudze API; dane osobowe poza naszym stosem.
- Narzędzia mają limity darmowych planów i rozjeżdżają się z tym, co dzieje się w platformie.

### Option 3: Najpierw bot, lekki magazyn danych

Zacząć od bota WhatsApp zapisującego do prostego magazynu (arkusz lub jedna tabela), a ekran dodać później.

**Pros**:
- Najszybsze wprowadzanie danych, bo to ono jest największym kosztem w takich narzędziach.

**Cons**:
- Model danych nie jest jeszcze znany, więc bot zapisywałby w strukturze, którą trzeba będzie migrować.
- WhatsApp Business API wymaga weryfikacji Meta i szablonów wiadomości, dużo ceremonii na starcie.
- Bez widoku "Na dziś" nie ma jak sprawdzić, czy zapis działa.

### Option 4: Własna sekcja z jednym lejkiem etapów na firmę

Jak Option 1, ale z klasycznym lejkiem sprzedażowym: firma ma jeden etap (zapytanie, wycena, negocjacje, import, publikacja).

**Pros**:
- Prostszy model (jedno pole etapu) i znany widok tablicy.

**Cons**:
- Nie mieści spraw równoległych ani jednorazowych (łóżka, umowa, import katalogu naraz).
- Etap szybko staje się nieprawdziwy, bo nie wiadomo, której sprawy dotyczy.

## Rationale

Wybieram Option 1. Siłą tej potrzeby jest rozmaitość spraw i to, że część kontrahentów nie ma konta na platformie, więc model musi opierać się na sprawie i zadaniu, nie na etapie firmy (odrzucone Option 4). Gotowe narzędzie (Option 2) nie da linków do platformy ani swobody pod bota i dołoży kolejne konto do pilnowania. Bota (Option 3) opłaca się budować dopiero na modelu, który sprawdził się w ręcznym użyciu.

Kluczowe wybory wynikały z rozmowy z inżynierem i z kodu:
- Status sprawy jest wyliczany, nie zapisywany, bo zapisana wartość rozjeżdżałaby się z zadaniami i trzeba by ją synchronizować (zasada: nie przechowywać wartości pochodnych bez zmierzonego problemu wydajnościowego). Koszt: sprawa bez żadnego otwartego zadania wygląda na "otwartą", a nie na "czeka".
- Zadanie ma osobę odpowiedzialną będącą administratorem albo stroną zewnętrzną, więc "na co czekamy" i "co my musimy" to jeden widok z filtrem, bez drugiego mechanizmu.
- Szybki wpis jest w zakresie, bo bez niego notatnik będzie wypełniany niechętnie, a jest to dokładny odpowiednik tego, co później zrobi bot.
- Załączniki idą do prywatnego kubełka, bo zawierają wyceny i ceny, a publiczny kubełek jest czytelny dla każdego, kto zna adres. Pobranie przez route handler z podpisanym adresem to ten sam wzór co `project_quote_pdf` (spec 0063).
- Szablony spraw są stałymi w kodzie, a nie tabelą, bo dla dwóch osób ekran edycji szablonów to więcej kodu niż same szablony. Spełnia to wymóg "nowy szablon bez zmiany schematu bazy".
- Tabele leżą poza `audit_log` (decyzja inżyniera): to notatnik dwóch zaufanych osób, a trigger audytu obejmuje dane klientów i płatności, które tu nie występują. Odpowiedzialność dają pola autora.
- Uwaga eksperta: zasada ogólna mówi, że miękkie usuwanie bywa złym pomysłem. Tu miękkie usuwanie zostaje tylko tam, gdzie człowiek faktycznie coś usuwa (wpisy, osoby kontaktowe, załączniki). Firma ma `archived_at` zamiast usuwania i zachowuje połączenie z producentem, sprawy się zamyka, a zadania anuluje, więc unikalność producenta nie zależy od flagi usunięcia.

Wymagania zgodności: RODO dla danych kontaktowych jest nazwane w Context, a Security model w `index.md` jest wypełniony. Brak wpisów w `audit_log` jest świadomym wyjątkiem od zasady "dziennik audytu dla dostępu i danych wrażliwych", bo dane są biznesowymi danymi kontaktowymi o niskiej wrażliwości, a mutacje dotyczą tylko notatnika. Konsekwencja jest opisana w Consequences.

Wybór dziennego maila zamiast samego widoku "Na dziś" wynika z oczekiwania, że po wejściu bota przypomnienia i tak przejmie on, więc koszt mechanizmu jest tymczasowy. Wszyscy aktywni administratorzy są adresatami, bez nowej zmiennej, dzięki czemu dołączenie trzeciej osoby nie wymaga konfiguracji.
