# 0072. Przebudowa menu nawigacji (SiteHeader) i strona Kontakt

**Date**: 2026-10-19
**Status**: Accepted

## Summary

Wysuwane menu w nagłówku ma dziś cztery płaskie linki, z czego dwa dotyczą producentów, a oferta platformy (sauny, outdoor TV, kontenery, zamówienia hurtowe) nie jest w nim widoczna. Dzielimy menu na grupy (Katalog, Zamówienia, Platforma, Dla producentów), pokazujemy inne skróty zalogowanemu klientowi i producentowi, wyróżniamy aktywną pozycję i dodajemy prostą stronę Kontakt z adresem e mail zespołu, bez formularza. Układ nagłówka na komputerze zostaje dokładnie taki jak dziś (logo, przełączniki, przycisk i hamburger), zmienia się tylko zawartość wysuwanego panelu. Ta zmiana zastępuje listę linków z AC-3 specu 0030, reszta tamtego specu (hamburger na wąskich telefonach) zostaje w mocy.

Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako odwiedzający chcę w menu zobaczyć, jakie rodziny produktów są w katalogu, żeby przejść prosto do domów, saun, outdoor TV lub kontenerów.
- Jako inwestor z dużym zamówieniem chcę znaleźć w menu zapytanie hurtowe i listę zweryfikowanych producentów, żeby nie szukać ich na stronie głównej.
- Jako odwiedzający chcę mieć w menu kontakt do zespołu i FAQ, żeby ocenić, czy platforma jest wiarygodna.
- Jako producent chcę, żeby menu prowadziło do mojego panelu, a nie zachęcało mnie do rejestracji, którą już mam.
- Jako zalogowany klient chcę mieć w menu skróty do moich zapytań, ulubionych i weryfikacji firmy.

**Acceptance criteria** (the contract):
- **AC-1**: Układ nagłówka od `sm` w górę zostaje bez zmian: w jednej linii te same elementy co dziś (logo, przełącznik motywu, przełącznik języka, Ulubione dla zalogowanych, Zaloguj się dla anonimowych, przycisk CTA, hamburger). Nie dodajemy linków nawigacji do paska. Zmienia się wyłącznie zawartość panelu otwieranego hamburgerem.
- **AC-2**: Panel menu ma jedną nawigację z etykietą `Nawigacja` (`<nav>`), a w niej grupy, każda z własnym nagłówkiem `h2`: **Katalog**, **Zamówienia**, **Platforma**, **Dla producentów** (ostatnia tylko dla anonimowego i klienta, patrz AC-6). Przycisk CTA, link Zaloguj się i grupa ustawień (motyw, język) zostają jak dziś.
- **AC-3**: Grupa **Katalog** ma cztery linki, każdy z ikoną lucide (dekoracyjną, `aria-hidden`): Domy modułowe do `/{locale}/results?family=dom`, Sauny do `/{locale}/sauna`, Outdoor TV do `/{locale}/results?family=outdoor-tv`, Kontenery modułowe do `/{locale}/results?family=kontenery-modulowe`.
- **AC-4**: Grupa **Zamówienia** ma dwa linki: Zapytanie o duże zamówienie do `/{locale}/project-request` i Zweryfikowani producenci do `/{locale}/verified-manufacturers`. Grupa **Platforma** ma trzy: Jak to działa do `/{locale}#jak-to-dziala` (jak dziś), Najczęstsze pytania do `/{locale}#faq` i Kontakt do `/{locale}/contact`. Sekcja FAQ na stronie głównej dostaje `id="faq"` oraz `scroll-mt`, jak sekcja `jak-to-dziala`, żeby nagłówek jej nie przykrywał.
- **AC-5**: Dla anonimowego i zalogowanego klienta grupa **Dla producentów** zawiera jeden link, Dołącz jako producent, do `/{locale}/producer/registration` (etykieta bez dopisku B2B). Grupa jest wizualnie wyciszona i stoi na końcu listy.
- **AC-6**: Dla sesji z rolą `producer` zamiast Dołącz jako producent grupa nazywa się **Panel producenta** i ma trzy linki: Panel producenta (`/{locale}/producer/panel`), Moje produkty (`/{locale}/producer/panel/products`), Zapytania (`/{locale}/producer/panel/inquiries`). Dla roli `admin` grupy producenckiej nie ma wcale.
- **AC-7**: Dla sesji z rolą `client` pojawia się grupa **Panel klienta** z trzema linkami: Moje zapytania (`/{locale}/panel/inquiries`), Ulubione (`/{locale}/panel/favorites`), Weryfikacja firmy (`/{locale}/panel/verification`). Dla klienta Ulubione nie pojawia się drugi raz w grupie ustawień poniżej. Dla roli `admin` Ulubione zostaje tam, gdzie jest dziś.
- **AC-8**: Pozycja, której trasa odpowiada bieżącej stronie, ma wyróżniony kolor i `aria-current="page"`. Linki do `/results` są aktywne, gdy parametr `family` równa się wartości z linku (brak parametru liczy się jak `dom`, o ile tak działa filtr, patrz Build plan 4). Linki z kotwicą (`#jak-to-dziala`, `#faq`) nigdy nie są oznaczane jako aktywne.
- **AC-9**: Strona `/{locale}/contact` jest publiczna i ma jeden `h1`, krótkie wprowadzenie, blok z adresem e mail jako `mailto:` (wartość `SUPPORT_REPLY_TO_EMAIL`) oraz trzy krótkie sekcje „kiedy do kogo”: klient (pytania o ofertę lub zapytanie), producent (link do rejestracji), duże zamówienie (link do `/project-request`). Nie ma formularza i nic nie jest zapisywane. Gdy `SUPPORT_REPLY_TO_EMAIL` nie jest ustawiona, blok z e mailem znika, a reszta strony działa.
- **AC-10**: Strona Kontakt ma `generateMetadata`: tytuł, opis, `canonical` i `alternates.languages` ze wszystkimi lokalami plus `x-default` (ten sam wzorzec co `project-request/page.tsx`), jest indeksowalna.
- **AC-11**: Wszystkie nowe teksty menu i strony Kontakt są w `messages/pl.json`, `en.json`, `de.json`, `nl.json`. Klucze `SiteHeader.nav.projects` i `SiteHeader.nav.producerB2b` są usunięte lub zastąpione, test zgodności kluczy między językami przechodzi.
- **AC-12**: Panel działa przy szerokości 320 px we wszystkich czterech językach: brak przewinięcia poziomego, długie etykiety zawijają się, każdy link ma obszar dotyku co najmniej 44 px wysokości, a przy długiej liście panel przewija się w pionie. Zachowane: pułapka fokusu, widoczny `.focus-ring` na każdym linku, `aria-label` na przyciskach otwierania i zamykania (WCAG 2.2 AA, `components/klient/AGENTS.md`).
- **AC-13**: Odczyt bieżącego adresu z parametrami (`useSearchParams`) nie psuje statycznego renderowania stron klienta: `npm run build` przechodzi, a hook jest używany tylko w komponencie renderowanym po otwarciu panelu.

## Decision

**Chosen option**: Option 1: Menu w grupach, rozbudowane w miejscu, plus statyczna strona Kontakt.

Przebudowujemy zawartość panelu w `SiteHeader.tsx` na cztery grupy zależne od roli, nie ruszamy paska na komputerze, dodajemy trasę `/{locale}/contact` w stylu istniejącej strony `/privacy` (bez formularza).

**Implementation skills**: `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

Reasoning and options: see [rationale.md](rationale.md).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: brak zmian w bazie. Wszystkie pozycje menu to stała lista w kodzie, filtrowana rolą sesji.

**Struktura menu** (kolejność w panelu, po CTA i Zaloguj się, przed ustawieniami):

| Grupa | Kto widzi | Pozycje (klucz tłumaczenia pod `SiteHeader.nav`) |
|---|---|---|
| Katalog | wszyscy | `catalog.houses`, `catalog.saunas`, `catalog.outdoorTv`, `catalog.containers` (ikony `House`, `Flame`, `Tv`, `Container`, nazwy do potwierdzenia w paczce lucide) |
| Zamówienia | wszyscy | `orders.largeOrder`, `orders.verifiedManufacturers` |
| Platforma | wszyscy | `platform.howItWorks`, `platform.faq`, `platform.contact` |
| Panel klienta | tylko `client` | `clientPanel.inquiries`, `clientPanel.favorites`, `clientPanel.verification` |
| Dla producentów | anonimowy i `client` | `producers.join` |
| Panel producenta | tylko `producer` | `producerPanel.home`, `producerPanel.products`, `producerPanel.inquiries` |

Nagłówki grup: `nav.groups.catalog`, `orders`, `platform`, `clientPanel`, `producers`, `producerPanel`. Grupa ustawień (motyw, język, `sm:hidden`) zostaje z nagłówkiem `Konto`, bez zmian poza usunięciem Ulubionych dla klienta (AC-7). Admin: bez grupy producenckiej i bez Panelu klienta, ma grupy ogólne.

**Komponenty**:
- `SiteHeader.tsx`: lista pozycji budowana z roli sesji, wspólna klasa dla linku (obszar dotyku `min-h-11`, zawijanie tekstu), `aria-current` dla aktywnej.
- Nowy mały komponent kliencki dla zawartości listy (np. `SiteHeaderMenuNav.tsx`), renderowany wewnątrz `DialogPanel`, czyli tylko po otwarciu, który czyta `usePathname` i `useSearchParams` i liczy aktywną pozycję. Dzięki temu hook nie wpływa na prerender (AC-13).
- `Faq.tsx`: `id="faq"` i `scroll-mt-brand-6` na `<section>`.
- `app/[locale]/(customer)/contact/page.tsx`: komponent serwerowy z `Container`, `Heading`, `Stack`, `Text` z `components/ui`, wzorem `privacy/page.tsx`.

**Key invariants**:
- Role są liczone po sesji, nigdy po treści tłumaczenia. Aktywna pozycja jest liczona po ścieżce i parametrze `family`, nigdy po etykiecie.
- Żaden link nie wskazuje trasy, która nie istnieje. Nowa pozycja menu wymaga istniejącej trasy.
- Kolejność grup w panelu jest stała, role ją tylko filtrują.

**Security model**: menu to tylko linki, dostęp do paneli dalej wymuszają ich własne strażniki sesji (`requirePanelClientSession`, layout producenta, layout admina). Strona Kontakt jest publiczna, nie przyjmuje danych od użytkownika, więc nie wymaga limitów ani ochrony przed spamem. Brak danych osobowych poza adresem zespołu z konfiguracji.

**Configuration required**:
- `SUPPORT_REPLY_TO_EMAIL`: już istnieje (spec 0066), dev ma `info@modularhubeurope.com`. Brakuje jej na stagingu i produkcji (spec 0019, lista zmiennych do uzupełnienia). Bez niej strona Kontakt pokazuje się bez adresu, więc przed publicznym startem trzeba ją ustawić.

**Critical test scenarios**:
- Happy path anonimowy: otwarcie panelu pokazuje cztery grupy z linkami i hrefami z AC-3, AC-4, AC-5, verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**.
- Rola producent: widać trzy skróty panelu, nie ma Dołącz jako producent, verifies **AC-6**.
- Rola klient: grupa Panel klienta, Ulubione tylko raz w całym panelu, verifies **AC-7**.
- Rola admin: brak grup Dla producentów, Panel producenta i Panel klienta, verifies **AC-6**, **AC-7**.
- Aktywna pozycja: na `/pl/sauna` link Sauny ma `aria-current="page"`, na `/pl/results?family=outdoor-tv` aktywny jest Outdoor TV, a nie Domy, verifies **AC-8**.
- Pasek na komputerze: istniejące testy paska (CTA, Ulubione, Zaloguj się, przełączniki) przechodzą bez zmian, verifies **AC-1**.
- Kontakt: strona renderuje `h1` i `mailto`; z usuniętą zmienną nie ma bloku e mail i nie rzuca błędu, verifies **AC-9**.
- Parytet tłumaczeń: test spójności kluczy dla czterech języków, verifies **AC-11**.
- Build i ręczne sprawdzenie 320 px w czterech językach, verifies **AC-12**, **AC-13**.

## Build plan

Kolejność: małe pionowe plasterki, każdy kończy się czymś, co da się kliknąć i sprawdzić. Nie ma warstwy bazy, więc nie ma migracji. Strona Kontakt idzie pierwsza, bo menu ma na nią linkować.

1. Strona Kontakt: `app/[locale]/(customer)/contact/page.tsx` z `generateMetadata`, namespace `ContactPage` w czterech plikach `messages/*.json`, test komponentu (z zmienną i bez), satisfies **AC-9**, **AC-10**, **AC-11**
2. Kotwica FAQ: `id="faq"` i `scroll-mt-brand-6` w `Faq.tsx`, satisfies **AC-4**
3. Dane menu: stała lista grup i pozycji z rolą sesji i kluczami tłumaczeń, nowe klucze `SiteHeader.nav.*` w czterech językach, usunięcie `nav.projects` i `nav.producerB2b`, satisfies **AC-2**, **AC-5**, **AC-6**, **AC-7**, **AC-11**
4. Odczyt filtra: sprawdzić w `results/page.tsx` i `lib/results-filters.ts`, jaka rodzina jest domyślna przy braku `family`, i na tej podstawie zapisać regułę aktywnej pozycji dla Domów, satisfies **AC-8**
5. Render panelu: grupy z nagłówkami `h2` w jednym `<nav>`, ikony Katalogu (potwierdzić nazwy ikon w zainstalowanej paczce lucide), `min-h-11`, wyciszona grupa producencka, usunięcie Ulubionych dla klienta z grupy ustawień, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**, **AC-12**
6. Aktywna pozycja: komponent z `usePathname` i `useSearchParams` renderowany tylko po otwarciu panelu, `aria-current`, kolor aktywny, satisfies **AC-8**, **AC-13**
7. Testy: zaktualizować `SiteHeader.test.tsx` (AC-3 specu 0030 i nowe grupy, mock `useSearchParams`, role client, producer, admin), potwierdzić, że testy paska na komputerze przechodzą bez zmian, satisfies **AC-1**, **AC-6**, **AC-7**, **AC-8**
8. Weryfikacja: `npm run lint`, `npx vitest run`, `npm run build`, ręcznie panel przy 320 px i 1280 px w pl, en, de, nl (po restarcie serwera dev, bo `messages/*.json` jest w nim cache'owany), satisfies **AC-1**, **AC-12**, **AC-13**

## Consequences

**Positive**:
- Menu pokazuje realną ofertę (cztery rodziny, zamówienia hurtowe) i oddziela klienta od producenta.
- Platforma dostaje kontakt i FAQ w zasięgu jednego kliknięcia, co podnosi wiarygodność.
- Zalogowani dostają skróty do swoich paneli bez dokładania elementów do paska.
- Bez bazy, bez migracji, łatwy rollback jednym cofnięciem zmian.

**Negative / tradeoffs**:
- Na komputerze nawigacja dalej siedzi za hamburgerem, więc odkrywalność jest słabsza niż przy linkach w pasku. To świadoma decyzja o zachowaniu układu.
- Panel jest dłuższy (do 13 pozycji dla anonimowego z grupami), więc na niskich ekranach się przewija.
- Strona Kontakt bez formularza przenosi cały ruch na skrzynkę e mail, bez śladu w systemie i bez ochrony przed spamem po stronie platformy.
- `SUPPORT_REPLY_TO_EMAIL` musi być ustawiona na stagingu i produkcji, inaczej Kontakt jest pusty.
- Cztery nowe grupy tekstów do utrzymania w czterech językach.

**Neutral**:
- Zmienia AC-3 specu 0030 (lista linków). Reszta 0030 zostaje, w tym AC-1 (hamburger na 320 px).
- Brak stopki strony nadal oznacza, że Kontakt i FAQ są osiągalne tylko przez menu.

## Follow-up

- [ ] W specu 0030 dopisać przy AC-3 odwołanie do tego specu, żeby nikt nie szukał starej czterolinkowej listy.
- [ ] Ustawić `SUPPORT_REPLY_TO_EMAIL` na stagingu i produkcji (spec 0019).
- [ ] Stopka strony z kontaktem i informacjami prawnymi (opisana już w scope jako część funkcji o wiarygodności strony klienta), osobny spec.
- [ ] Dane firmy na stronie Kontakt (nazwa spółki, adres, NIP, telefon), gdy zostaną podane.
- [ ] Formularz kontaktowy, jeśli skrzynka e mail okaże się za wąska. Wymaga limitu zgłoszeń i ochrony przed spamem, których repo dziś nie ma.
- [ ] Osobna strona `/faq` dla SEO pytań, jeśli kotwica na stronie głównej nie wystarczy.
- [ ] Strona „O nas”, gdy będzie treść (usunięta z menu w specu 0030).
- [ ] Prawdziwa polityka prywatności w miejsce tymczasowej (`/privacy`), a potem link do niej w stopce.
- [ ] Rozważyć nawigację w pasku na komputerze, jeśli odkrywalność okaże się problemem w danych z PostHog.
