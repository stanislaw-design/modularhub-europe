# 0024. Panel klienta: rationale

## Context

Od funkcji 7 (spec 0023) klient ma prawdziwe konto i może wysłać zapytanie, ale po wysłaniu nie ma żadnego miejsca, żeby je ponownie zobaczyć, i nie ma sposobu zapisania interesującego domu bez od razu wysyłania zapytania. Dom to zwykle duża, długo rozważana inwestycja, więc klienci wracają do przeglądanych opcji więcej niż raz, zanim się zdecydują. Dziś ta ścieżka po prostu się urywa: klient wysyła zapytanie i nie ma potem żadnego punktu odniesienia.

Nagłówek strony (`SiteHeader`) ma już wyłączony przycisk "Ulubione" z ikoną serca, czekający na tę funkcję (widoczny placeholder od wcześniejszego etapu), więc oczekiwanie na to miejsce jest już zaszyte w interfejsie, tylko nic za nim nie stoi.

Siły w grze: model danych klienta i zapytania już istnieje (spec 0018, rozszerzony przez 0023) i nie może się zmienić w sposób łamiący istniejące zapytania; sesja i autoryzacja po stronie aplikacji (rola `client`, id wyprowadzone z sesji) to już ustalony wzorzec z `submitInquiry`, ten sam wzorzec musi się powtórzyć tutaj; RODO i zgodność prawna (funkcja 5) wciąż nie są zaprojektowane, więc ta funkcja dokłada nowy sposób pokazywania (nie zbierania) już istniejących danych osobowych, nie tworzy nowej kategorii danych do ochrony. Konsekwencja niepodjęcia tej decyzji teraz: klient nie ma żadnego powodu wracać na platformę po wysłaniu pierwszego zapytania, a przycisk "Ulubione" w nagłówku zostaje trwale martwy.

Przed ustaleniem struktury strony zrobiony został szybki research (portale nieruchomości, konfiguratory dużych zakupów, platformy modułowe/prefab), na prośbę zamawiającego, żeby nie zakładać z góry, że "moje zapytania" i "ulubione" to jedyne potrzebne sekcje panelu klienta. Wyniki, patrz "Research: panele klienta na porównywalnych platformach" niżej, doprowadziły do rozszerzenia zakresu o lekki profil konta i porównanie side by side, przy świadomym odłożeniu zapisanych wyszukiwań z alertami (wymagają infrastruktury e mail, funkcja 17, jeszcze nie zbudowana).

## Research: panele klienta na porównywalnych platformach

Szybki przegląd trzech kategorii porównywalnych produktów, każda z innym akcentem, ale wspólnym rdzeniem (basis: web research przeprowadzony w tej rozmowie projektowej):

- **Portale nieruchomości** (Zillow, Rightmove, Otodom): rdzeń to zapisane/ulubione oferty plus zapisane wyszukiwania z alertami (e mail/SMS przy zmianie ceny lub nowej ofercie), zarządzanie tymi wyszukiwaniami (edycja, pauza, usunięcie), i udostępnianie shortlisty rodzinie/partnerowi. Portale z prawdziwym pośrednikiem dokładają wątek wiadomości z agentem, przechowywanie dokumentów, i oś kamieni milowych transakcji.
- **Konfiguratory dużych, niestandardowych zakupów** (Tesla, konfiguratory mebli): zapisane konfiguracje jako migawki ceny/specyfikacji, historia zamówień, ceny na żywo przy zmianie konfiguracji, śledzenie przed dostawą.
- **Platformy modułowe/prefab** (Dwellito, Impresa Modular): porównanie producentów/wariantów obok siebie, wizualizacja 3D, wycena na żywo; funkcje po zakupie (zarządzanie domem) są dziś oddzielone od ścieżki zakupowej.

Rzadko spotykane lub wyraźnie odłożone do drugiej fazy nawet na dojrzałych portalach: rekomendacje/podobne oferty jako osobna sekcja, rozbudowane przechowywanie dokumentów poza fazą transakcji, bezpośrednie wiadomości kupujący-sprzedający (nieruchomości zwykle idą przez pośrednika, nie czat P2P).

Wniosek zastosowany w tej decyzji: rdzeń (zapisane oferty plus status zapytań) jest wspólny wszędzie i to jest już potwierdzone w scope funkcji 24; porównanie side by side ma precedens wprost w kategorii najbliższej temu produktowi (platformy modułowe/prefab) i zostało dodane teraz; zapisane wyszukiwania z alertami mają wysoką wartość na portalach nieruchomości, ale wymagają infrastruktury e mail, której dziś nie ma (funkcja 17, planned) — świadomie odłożone, nie pominięte przez przeoczenie.

## Options considered

### Option 1: Trzy osobne podstrony pod wspólnym layoutem panelu

`/klient/panel/zapytania`, `/klient/panel/ulubione`, `/klient/panel/profil`, każda własną trasą Next.js, spięte wspólnym `layout.tsx` z poziomym paskiem zakładek.

**Pros**:
- Każda sekcja ma własny adres URL, do udostępnienia lub zakładki w przeglądarce.
- Każda podstrona ładuje tylko dane, których potrzebuje (osobne zapytania do bazy per podstrona), bez pobierania danych nieużywanej dziś sekcji.
- Prostsze komponenty serwerowe: każda strona to osobny async Server Component czytający jedną rzecz, zgodnie z dzisiejszym wzorcem (`/internal/zapytania`).

**Cons**:
- Trzy pliki trasy plus wspólny layout zamiast jednego; więcej plików do utrzymania niż jedna strona z sekcjami.
- Przełączanie między zakładkami to pełne przejście po stronie serwera (nawigacja Next.js), nie natychmiastowe jak zakładka JS po stronie klienta.

### Option 2: Jedna strona, trzy sekcje pod sobą (bez zakładek)

Wszystko na `/klient/panel`, jedna strona przewijana, sekcje jedna pod drugą.

**Pros**:
- Jeden plik trasy, jedno pobranie sesji.
- Klient widzi od razu wszystko, bez klikania.

**Cons**:
- Trzy zapytania do bazy (zapytania, ulubione, dane profilu) zawsze razem, nawet gdy klient chce zobaczyć tylko jedną rzecz — więcej niepotrzebnej pracy serwera przy każdej wizycie.
- Długa strona, gorsza nawigacja na telefonie (przewijanie przez sekcję, która akurat nie interesuje).

### Option 3: Jedna strona, przełącznik zakładek JS po stronie klienta

Wszystkie trzy sekcje wyrenderowane, ale tylko jedna widoczna naraz, przełączana bez przeładowania strony.

**Pros**:
- Płynne przełączanie bez przejścia serwerowego.

**Cons**:
- Wszystkie trzy zapytania do bazy nadal wykonują się na starcie (dane muszą być gotowe do przełączenia), ten sam koszt co Option 2, plus dodatkowy kod stanu po stronie klienta.
- Bez własnego adresu URL per sekcja (chyba że dołożyć parametr URL i tak odtwarzając Option 1 mniejszym kosztem).

## Rationale

Wybrano Option 1 (trzy osobne podstrony), zgodnie z wyraźnym wyborem zamawiającego po rundzie pytań oraz z tym, jak portale nieruchomości faktycznie to robią (basis: research wyżej, "moje konto" z osobnymi sekcjami, każda z własnym adresem). Kluczowy argument techniczny: każda podstrona pobiera z bazy tylko to, czego potrzebuje (zapytania klienta, ulubione klienta, albo tylko dane sesji dla profilu), zamiast zawsze pobierać wszystkie trzy naraz jak w Option 2/3 (basis: `AGENTS.md`, zasada asynchronicznych, jednozadaniowych funkcji dostępu do danych już stosowana w `lib/data/projects.ts` i `getAllInquiriesWithItems`). Koszt (więcej plików tras, pełne przejście serwerowe między zakładkami) jest niski przy tej skali ruchu i akceptowalny w zamian za prostszy, spójny z resztą klienta wzorzec Server Component na stronę.

Wspólny `layout.tsx` dla `/klient/panel/*` (pasek zakładek Zapytania/Ulubione/Profil) domyka spójność między trzema podstronami, tym samym wzorcem co `app/[locale]/klient/layout.tsx` już dziś spina `SiteHeader` z każdą stroną klienta.

## References

**Project sources** (verifiable, w tym repo):
- `AGENTS.md` (root), zasada: funkcje dostępu do danych są asynchroniczne od początku i UI state, który musi przetrwać zmianę trasy, idzie przez parametry URL (basis dla zachowania wyboru do porównania w URL, nie w komponencie).
- spec [0023](../0023-klient-na-realnym-zapleczu/index.md) (basis: wzorzec sesji/autoryzacji po stronie aplikacji z `submitInquiry`, bramka logowania z zachowanym powrotem, i sam model `client`/`inquiry`/`inquiry_item`, na którym stoi ta funkcja).
- spec [0018](../0018-prawdziwy-model-danych/index.md) (basis: konwencja triggera audytu Postgres na tabelach z danymi osobowymi/biznesowymi, zastosowana wprost do nowej tabeli `favorite`).
- `lib/observability/AGENTS.md` (basis: jedyny sankcjonowany sposób raportowania zdarzenia biznesowego, `trackEvent()`, zastosowany do nowego zdarzenia `product_favorited`).

**Practices & standards**:
- Bezpieczny wzorzec migracji bazy danych w działającym systemie: nowa tabela, żadna istniejąca kolumna nie zmienia typu ani wymagalności (basis: tabela `favorite` to czysty dodatek, bez migracji danych istniejących wierszy).

**Links** (web verified):
- Zillow, zapisane wyszukiwania i zapisane domy: [zillow.zendesk.com/hc/en-us/articles/213395508](https://zillow.zendesk.com/hc/en-us/articles/213395508-Saved-Searches-and-Saved-Homes)
- Checklist funkcji portalu nieruchomości: [mercuryminds.com/blog/real-estate-portal-features-the-complete-checklist-2026](https://www.mercuryminds.com/blog/real-estate-portal-features-the-complete-checklist-2026/)
- Panel klienta nieruchomości, funkcje: [knack.com/blog/real-estate-client-portal-what-it-is-features-and-how-to-implement-one](https://www.knack.com/blog/real-estate-client-portal-what-it-is-features-and-how-to-implement-one/)
- Tesla, obsługa konta: [tesla.com/support/account-support](https://www.tesla.com/support/account-support)
- Dwellito, rynek domów modułowych: [dwellito.com](https://www.dwellito.com/)
