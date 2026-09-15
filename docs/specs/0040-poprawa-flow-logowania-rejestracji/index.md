# 0040. Poprawa flow logowania i rejestracji

**Date**: 2026-09-15
**Status**: In Progress

## Summary

Ten spec ujednolica dzisiejsze dwa osobne ekrany rejestracji (klient, producent) w jeden wspólny wizard pod jednym adresem, poprawia kilka drobnych rzeczy na ekranie logowania, i dokłada dwa nowe pola do formularzy: rozróżnienie inwestor / klient prywatny (z warunkowym NIP) dla klienta, oraz skalę produkcji dla producenta, przy okazji usuwając z rejestracji producenta pole "Technologia". Efekt: jedno wejście na "Załóż konto", zamiast dziś dwóch osobnych, niepowiązanych ścieżek.

## Requirements

**User stories**:
- Jako odwiedzający stronę bez konta, chcę widzieć wyraźne "Załóż konto" zamiast niejasnego "Zacznij", żeby wiedzieć, że mogę tam założyć dowolne konto (nie tylko producenta).
- Jako odwiedzający ekran logowania bez konta, chcę od razu widzieć link do rejestracji, żeby nie utknąć na formularzu, który mnie nie wpuści.
- Jako nowy użytkownik, chcę w jednym miejscu wybrać, czy zakładam konto klienta czy producenta, żeby nie musieć wiedzieć z góry, pod jakim adresem szukać właściwego formularza.
- Jako inwestor (planujący zamówienie powyżej 10 domów), chcę od razu przy rejestracji podać NIP i nazwę firmy, żeby nie robić tego drugi raz później w panelu.
- Jako zwykły klient prywatny, chcę rejestrować się bez podawania NIP, bo mnie nie dotyczy.
- Jako producent, chcę przy rejestracji zaznaczyć orientacyjną skalę produkcji, bez konieczności podawania dziś wymaganej technologii, której jeszcze mogę nie chcieć deklarować na starcie.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Przycisk CTA w nagłówku dla niezalogowanego odwiedzającego pokazuje tekst "Załóż konto" (zamiast "Zacznij") i prowadzi do `/registration`, tak w wersji na szerokim ekranie jak i w wysuwanym menu mobilnym.
- **AC-2**: Strona logowania zawsze (nie tylko w stanie błędu "nieznany e mail") pokazuje link "Załóż konto", wyśrodkowany poziomo względem przycisku "Wyślij link" pod nim, prowadzący do `/registration`.
- **AC-3**: Przycisk "Wyślij link" na stronie logowania ma dokładnie tę samą szerokość co pole e mail nad nim (dziś przycisk jest węższy, dopasowany do treści).
- **AC-4**: Wejście na `/registration` bez parametru `role` pokazuje krok 1: wybór "Klient" albo "Producent". Wybór ustawia URL na `/registration?role=client` albo `/registration?role=producer` i od razu pokazuje właściwy formularz kroku 2, zachowując `callbackUrl`, jeśli był obecny w URL kroku 1. Gdy `callbackUrl` nie jest podany, domyślny cel po zalogowaniu zależy od roli: `/${locale}` dla klienta (jak dziś), `/${locale}/producer/panel/project` dla producenta (jak dziś na dzisiejszej osobnej stronie, spec 0032 AC-9) — te dwa różne domyślne cele nie mogą się zgubić przy łączeniu stron w jedną.
- **AC-5**: Krok 2 (dowolna rola) pokazuje link "zmień rolę", wracający do `/registration` (krok 1, bez parametru `role`, `callbackUrl` zachowany).
- **AC-6**: Krok 2 dla klienta pokazuje na samej górze formularza checkbox "Jestem inwestorem" z krótkim opisem ("planujesz zamówienie od 10 domów wzwyż"). Pola NIP i nazwa firmy są zawsze widoczne; checkbox zaznaczony czyni je wymaganymi, odznaczony (domyślnie, "klient prywatny") czyni je opcjonalnymi.
- **AC-7**: Rejestracja klienta, w której oba pola NIP i nazwa firmy są wypełnione (niezależnie od stanu checkboxa), zapisuje je do `client.nip`/`client.company_name` i ustawia `client.b2b_verification_status` na `'pending'` przy potwierdzeniu (pierwszym udanym logowaniu) — dokładnie ten sam mechanizm co dzisiejszy `submitClientB2bDetails` (spec 0037). Gdy któreś z pól jest puste, `b2b_verification_status` zostaje `'not_submitted'`.
- **AC-8**: Krok 2 dla producenta zbiera nazwę firmy, e mail, telefon, NIP, kraj (jak dziś) i nowe pole "Skala produkcji" (dwie opcje: do 10 domów rocznie / powyżej 10 domów rocznie), wymagane. Formularz przestaje zbierać pole "Technologia".
- **AC-9**: Panel producenta (`app/[locale]/producer/panel/page.tsx`), który dziś zawsze zakłada ustawioną technologię, pokazuje łagodny pusty stan (nie pusty/błędny tekst) dla konta bez ustawionej technologii.
- **AC-10**: Stara trasa `/producer/registration` nadal działa: zamiast renderować formularz, przekierowuje (`redirect()`) na `/registration?role=producer`, zachowując `callbackUrl`, jeśli był podany. Żadne dzisiejsze miejsce, które do niej linkuje (nawigacja "Producenci B2B" w `SiteHeader`, kafel producenta w `BulkOrdersShowcase`, CTA na `/producer` marketingowej, przekierowanie `producent/rejestracja` w `proxy.ts`, oba istniejące testy asertujące ten adres) nie wymaga zmiany, bo przekierowanie prowadzi je automatycznie do nowego wizarda.
- **AC-11**: Dotychczasowe zachowanie logowania i rejestracji (magic link, ochrona `/klient/zapytanie`, `requestLogin` dla nieznanego e maila, wszystkie inwarianty spec 0023) zostaje niezmienione; ten spec zmienia tylko UX wejścia i dwa formularze kroku 2, nie sam mechanizm logowania.

## Decision

**Chosen option**: Option 1: Jedna wspólna trasa `/registration`, krok w parametrze URL `role`

Rejestracja klienta i producenta żyje pod jednym adresem `/registration`; krok (`role`) i `callbackUrl` idą przez parametry URL, zgodnie z istniejącą regułą projektu o stanie UI w URL.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`)

## Rationale

Reasoning i rozważane opcje: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Tabela | Zmiana | Typ | Wymagane | Uwaga |
|---|---|---|---|---|
| `producer` | `technology` | istniejący enum | było `NOT NULL`, staje się **nullable** | formularz rejestracji przestaje je zbierać (AC-8); istniejące konta nietknięte, nowe konta mają `NULL` do czasu, aż powstanie ekran edycji profilu producenta (patrz Follow up) |
| `producer` | `production_scale` (nowa kolumna) | nowy enum `producer_production_scale` (`do-10`, `powyzej-10`) | nullable w bazie (istniejące konta), ale formularz rejestracji zawsze go wysyła dla nowych kont | czysto informacyjne pole, bez wpływu na żadną inną regułę czy walidację (AC-8) |
| `client` | brak nowej kolumny | — | — | checkbox "Inwestor" używa istniejących `nip`/`company_name`/`b2b_verification_status` (spec 0037), nie dostaje własnej reprezentacji w bazie |
| `pending_registration.payload` (typ TS `PendingRegistrationPayload`) | dodaje opcjonalne `companyName` (klient inwestor) i `productionScale` (producent) | — | — | `technology` usuwane z kształtu (formularz go już nie wysyła) |

Żadna nowa tabela. Migracja jest w pełni addytywna i bezpieczna (luzowanie `NOT NULL` na `technology`, nowa nullable kolumna `production_scale`): jedno wdrożenie, bez okna serwisowego, w pełni odwracalna cofnięciem jednego commita.

**Key invariants**:
- Checkbox "Inwestor" na kroku 2 klienta NIE dostaje własnej kolumny ani flagi w `pending_registration.payload`. Jedyny zapisywany sygnał to same wartości `nip`/`companyName`, jeśli oba są wypełnione; `auth.ts`'s `createUser` ustawia `b2b_verification_status` na `'pending'` dokładnie wtedy, gdy oba pola są niepuste po przycięciu, dokładnie tak samo jak dzisiejsze `submitClientB2bDetails` (spec 0037) — jeden, spójny mechanizm zamiast dwóch.
- Checkbox steruje wyłącznie **wymaganiem** pól NIP/nazwa firmy w walidacji formularza (Zod `superRefine`: zaznaczony → oba pola `min(1)`; odznaczony → oba opcjonalne), nie ich widocznością. Pola są zawsze widoczne i edytowalne, niezależnie od stanu checkboxa (AC-6): rozważano chowanie pól przy odznaczeniu, ale odrzucono na rzecz prostszego, przewidywalnego zachowania bez znikających/pojawiających się elementów formularza.
- `producer.production_scale` nie wpływa na żadną inną regułę, walidację ani ścieżkę w aplikacji (wprost z prośby zamawiającego: "nie ma to wpływu na pozostałe elementy") — czysto informacyjne pole na start.
- Krok 1 (`/registration` bez `role`) zawsze pokazuje oba wybory (Klient, Producent) niezależnie od kontekstu (np. `callbackUrl` wskazującego na stronę klienta); żadnego kontekstowego ukrywania jednej z opcji.
- Mechanizm logowania samego w sobie (magic link, `pending_registration`, tworzenie `users`/`client`/`producer` dopiero przy pierwszym potwierdzeniu) zostaje dokładnie taki, jak ustalił spec 0023; ten spec zmienia tylko to, co się dzieje PRZED wysłaniem formularza (UX, pola) i mapowanie `payload` na `client`/`producer` w `auth.ts`.

**API surface**:

| Trasa / akcja | Typ | Kluczowa zmiana | Auth | Kluczowe błędy |
|---|---|---|---|---|
| `/registration` (istniejąca strona, `app/[locale]/(customer)/registration/page.tsx`) | Strona | Czyta `role` z URL: brak → krok 1 (wybór roli, nowy komponent); `client`/`producer` → odpowiedni formularz kroku 2; domyślny `callbackUrl` zależny od roli (patrz AC-4) | brak (publiczne) | nieprawidłowa wartość `role` → łagodny fallback do kroku 1 |
| `app/[locale]/producer/registration/page.tsx` | zmiana | zamiast renderować formularz, `redirect()` na `/registration?role=producer` (zachowuje `callbackUrl`) — świadomie zostaje jako cienki alias, nie znika (patrz Rationale) | brak (publiczne) | — |
| `registerClient` (akcja serwerowa) | zmiana | dodaje opcjonalne `nip`/`companyName`, wymagane tylko gdy checkbox "Inwestor" zaznaczony (przekazywany jako pole formularza) | brak (publiczne) | jak dziś (zajęty e mail) + NIP/nazwa firmy wymagane gdy inwestor zaznaczony |
| `registerProducer` (akcja serwerowa) | zmiana | usuwa `technology` z walidacji/payloadu, dodaje wymagane `productionScale` | brak (publiczne) | jak dziś (zajęty e mail/NIP) + nieprawidłowa/brakująca skala produkcji |
| `auth.ts`'s `createUser` | zmiana | insert `client` dodaje `nip`/`companyName`/`b2bVerificationStatus` (warunkowo `pending`); insert `producer` usuwa `payload.technology` z warunku obecności i z wartości wstawianej, dodaje `productionScale` | wewnętrzne (Auth.js) | jak dziś |

**Security model**: Bez zmian względem spec 0023: rejestracja i wysłanie linku logowania pozostają publiczne; żadna z nowych wartości (checkbox inwestora, skala produkcji) nie zmienia roli ani uprawnień konta w momencie rejestracji. Zatwierdzenie statusu B2B (`b2b_verification_status` z `'pending'` na `'approved'`) pozostaje wyłącznie ręczną decyzją administratora, dokładnie jak dziś (spec 0037); ten spec tylko przenosi moment, w którym dane trafiają do `'pending'`, wcześniej w cyklu życia konta.

**Configuration required**: Brak nowych zmiennych środowiskowych.

**Critical test scenarios**:
- Happy path klient/inwestor: odwiedzający klika "Załóż konto" w nagłówku → ląduje na `/registration` (krok 1) → wybiera "Klient" → zaznacza "Jestem inwestorem", wypełnia NIP i nazwę firmy → wysyła → potwierdza linkiem magicznym → `client.nip`/`company_name` ustawione, `b2b_verification_status = 'pending'`. Weryfikuje **AC-1**, **AC-4**, **AC-6**, **AC-7**.
- Happy path klient prywatny: jak wyżej, ale bez zaznaczenia checkboxa i bez wypełniania NIP/nazwy firmy → rejestracja przechodzi, `client.nip`/`company_name` puste, `b2b_verification_status = 'not_submitted'`. Weryfikuje **AC-6**, **AC-7**.
- Happy path producent: krok 1 → "Producent" → formularz bez pola Technologia, z wybraną skalą produkcji → potwierdzenie → `producer.technology IS NULL`, `producer.production_scale` ustawione. Weryfikuje **AC-8**.
- Edge case: panel producenta dla nowo zarejestrowanego konta (technology `NULL`) pokazuje łagodny pusty stan zamiast pustego/błędnego tekstu. Weryfikuje **AC-9**.
- Nawigacja: z kroku 2 link "zmień rolę" wraca do kroku 1 z zachowanym `callbackUrl`; wszystkie dzisiejsze linki do `/producer/registration` (nawigacja, `BulkOrdersShowcase`, `proxy.ts`) prowadzą teraz na `/registration?role=producer`. Weryfikuje **AC-5**, **AC-10**.
- UI logowania: strona `/login` w stanie domyślnym (bez błędu) pokazuje wyśrodkowany link "Załóż konto" pod przyciskiem "Wyślij link", a przycisk ma szerokość pola e mail. Weryfikuje **AC-2**, **AC-3**.

## Build plan

Kolejność zgodna z Tracer Bullet (podejście epiki Produkcja, `docs/scope/produkcja.md`): najpierw model danych, potem logika, potem UI, na końcu domknięcie linków i pusty stan panelu.

1. Migracja: `producer.technology` staje się nullable, nowa nullable kolumna `producer.production_scale` (enum `producer_production_scale`, wartości `do-10`/`powyzej-10`), satisfies **AC-8**
2. Zaktualizuj `PendingRegistrationPayload` (`lib/auth-shared.ts`): dodaj opcjonalne `companyName`, `productionScale`; usuń `technology`, satisfies **AC-6**, **AC-8**
3. Zaktualizuj `registerClient` (`lib/auth-registration.ts`): przyjmij pole checkboxa "Inwestor" z formularza (`formData.get("isInvestor")`, wartość `"on"` albo `null`, nie zwykły string), `nip`/`companyName` jako opcjonalne pola Zod (`z.string().trim().optional()`), wymagane warunkowo przez `superRefine` tylko gdy checkbox zaznaczony, zapisz oba do payloadu gdy podane, satisfies **AC-6**, **AC-7**
4. Zaktualizuj `registerProducer` (`lib/auth-registration.ts`): usuń walidację `technology`, dodaj wymagane `productionScale` (enum), satisfies **AC-8**
5. Zaktualizuj `auth.ts`'s `createUser`: insert `client` z `nip`/`companyName`/warunkowym `b2bVerificationStatus: 'pending'`; insert `producer` z dzisiejszym warunkiem obecności bez zmian (`payload.nip && payload.countryCode`, `technology` usunięte z warunku, `productionScale` NIE dodane do warunku, bo `registerProducer` już je waliduje jako wymagane przed zapisem do `pending_registration`), z `productionScale` przekazywane do insertu; magic link, `pending_registration` i reszta mechanizmu logowania zostają nietknięte, satisfies **AC-7**, **AC-8**, **AC-11**
6. Zbuduj nowy komponent wyboru roli (krok 1) i przepisz `app/[locale]/(customer)/registration/page.tsx` na czytanie `role` z URL: brak → krok 1, `client`/`producer` → właściwy formularz kroku 2 z linkiem "zmień rolę"; domyślny `callbackUrl` per rola (patrz AC-4: `/${locale}` dla klienta, `/${locale}/producer/panel/project` dla producenta), satisfies **AC-4**, **AC-5**
7. Dodaj checkbox "Jestem inwestorem" (z opisem) i pola NIP/nazwa firmy do `ClientRegistrationForm`, zawsze widoczne, wymagane tylko przy zaznaczonym checkboxie, satisfies **AC-6**
8. Usuń pole "Technologia" z `ProducerRegistrationForm`, dodaj pole wyboru skali produkcji; przenieś render formularza producenta na wspólną stronę `/registration` pod `surface="v5"` (dziś formularz nie używa tego wariantu, bo żyje pod innym nagłówkiem/chromem niż klienta; dopasuj go, żeby nie odstawał wizualnie po przeniesieniu pod `SiteHeader`); przepisz `app/[locale]/producer/registration/page.tsx` na sam `redirect()` do `/registration?role=producer` (zachowaj `callbackUrl`), nie usuwaj pliku, satisfies **AC-8**, **AC-10**
9. Popraw `LoginForm`: link "Załóż konto" widoczny zawsze (nie tylko przy nieznanym e mailu), wyśrodkowany pod przyciskiem; przycisk "Wyślij link" na szerokość pola e mail; oba linki rejestracji w stanie "nieznany e mail" wskazują wprost `/registration?role=client`/`/registration?role=producer` (unikaj zbędnego przeskoku przez przekierowanie z zadania 8), satisfies **AC-1**, **AC-2**, **AC-3**
10. Zaktualizuj nagłówek (`SiteHeader`): CTA "Zacznij" → "Załóż konto", cel `/producer` → `/registration`. Pozycja nawigacji "Producenci B2B" może zostać bez zmian (dalej `/producer/registration`, teraz cienkie przekierowanie z zadania 8) albo wskazywać nowy adres wprost — kosmetyczne, nie wymagane przez AC-10, satisfies **AC-1**
11. Dodaj łagodny pusty stan dla `profile.technology === null` w `app/[locale]/producer/panel/page.tsx`, satisfies **AC-9**
12. Zaktualizuj tłumaczenia (`messages/{pl,en,nl,de}.json`): nowe klucze dla checkboxa inwestora, opisu, pola skali produkcji, kroku wyboru roli, linku "Załóż konto"/"zmień rolę"; usuń nieużywany klucz etykiety technologii z formularza producenta, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-8**

## Consequences

**Positive**:
- Jeden, spójny punkt wejścia do zakładania konta zamiast dwóch rozjeżdżających się stron; nagłówek i ekran logowania przestają mylić odwiedzającego kierując go donikąd albo wyłącznie do producenta.
- Inwestor może zadeklarować status B2B od razu przy rejestracji, bez dodatkowej wizyty w panelu klienta później.
- Zero nowych tabel, minimalna, w pełni bezpieczna migracja (luzowanie ograniczenia, nowa nullable kolumna).

**Negative / tradeoffs**:
- Pole "Technologia" znika z jedynego miejsca, gdzie było dotąd zbierane; nowo zarejestrowani producenci mają je puste bez żadnej ścieżki do jego uzupełnienia, dopóki nie powstanie ekran edycji profilu producenta (patrz Follow up). To świadomie zaakceptowana luka, nie przeoczenie.
- Checkbox "Inwestor" steruje tylko wymaganiem pól, nie ich widocznością: klient prywatny zawsze widzi pola NIP/nazwa firmy na ekranie, nawet ich nie potrzebując. Prostsze i bardziej przewidywalne niż chowanie pól, kosztem odrobiny wizualnego szumu dla klienta prywatnego.
- `producer.production_scale` nie jest jeszcze nigdzie odczytywane ani wykorzystywane poza samym zapisem; wartość na start jest czysto deklaratywna.

**Neutral**:
- `app/[locale]/producer/registration/page.tsx` zostaje jako cienki alias (`redirect()`), nie znika: żaden dzisiejszy link do niego (nawigacja, `BulkOrdersShowcase`, marketing producenta, `proxy.ts`, istniejące testy) nie wymaga zmiany, co znacząco zmniejsza promień rażenia tej zmiany.
- Reguła w AGENTS.md o realnych segmentach folderów zamiast grup tras (`(customer)`) pozostaje niezmieniona przez ten spec; rejestracja producenta po prostu przenosi się pod istniejącą stronę `(customer)/registration`, tak samo jak dziś rejestracja klienta.

## Follow-up

- [ ] Zaprojektuj ekran edycji profilu producenta (technologia, i inne pola dziś zbierane tylko przy rejestracji), żeby konta bez technologii miały gdzie ją uzupełnić; dziś panel producenta tylko wyświetla dane, nic nie edytuje.
- [ ] Rozważ, czy `producer.production_scale` powinno kiedyś zasilać filtrowanie/dopasowanie producentów (np. do dużych zamówień B2B, spec 0037/0038), skoro na razie jest czysto informacyjne.
- [ ] Zweryfikuj z osobami korzystającymi z produktu, czy zawsze widoczne (nie chowane) pola NIP/nazwa firmy dla klienta prywatnego nie mylą użytkowników w praktyce; jeśli tak, rozważ chowanie ich przy odznaczonym checkboxie w kolejnej iteracji.
