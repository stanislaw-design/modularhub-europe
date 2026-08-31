# 0020. Strona szczegolow projektu (client)

**Date**: 2026-08-29
**Status**: In Progress

## Summary

Dzis kliknieciecie w kart projektu w wynikach nie prowadzi nigdzie (karty celowo nie sa klikalne, bo trasa pojedynczego projektu nie istnieje). Ten spec projektuje nowa strone `/klient/projekt/[id]`, ktora pokazuje pelne dane jednego projektu (galeria, dane techniczne, warunki komercyjne, zgodnosc prawna, producent) i jedno jasne wezwanie do wyslania zapytania. Zaprojektowana z realnymi danymi od dwóch pierwszych dostawców (Budman House, Cocomodule), zeby ujawnic, ze producenci daja bardzo rózny zestaw danych, wiec strona musi umiec sensownie pokazac projekt nawet z brakujacymi polami.

## Context

Zobacz `rationale.md`.

## Requirements

**Historyjki uzytkownika**:
- Jako klient przegladajacy wyniki, chce otworzyc jeden projekt i zobaczyc jego pelne dane techniczne i komercyjne, zeby zdecydowac, czy wyslac zapytanie do tego producenta.
- Jako klient, który znalazl projekt, który mu odpowiada, chce miec jedno jasne miejsce do wyslania zapytania, zeby nie szukac kolejnego kroku.
- Jako klient, który zna swój kraj dostawy, chce zobaczyc, czy ten projekt jest tam legalnie dostepny, zeby nie tracic czasu na projekty, których nie moge kupic.
- Jako osóba trafiajaca z wyszukiwarki, chce, zeby strona projektu dobrze wygladala w wynikach wyszukiwania i podgladach linku, zeby latwo bylo znalezc i podzielic sie realna oferta.

**Kryteria akceptacji** (kontrakt, kazde niezaleznie sprawdzalne):
- **AC-1**: Strona `/klient/projekt/[id]` renderuje sekcje w tej kolejnosci: hero (galeria + nazwa + cena + CTA) &rarr; kluczowe dane skrótowo &rarr; opis &rarr; technologia/konstrukcja &rarr; warunki komercyjne &rarr; zgodnosc prawna (jesli znany kraj) &rarr; producent &rarr; CTA koncowe.
- **AC-2**: Karta wyników (`ResultCard`) i karta popularnych domow na stronie glownej (`PopularHomeCard`) linkuja do tej strony dla projektów z katalogu przykladowego (id bez prefiksu `local-`).
- **AC-3**: Strona oferuje trzy akcje: wyslij zapytanie do producenta (link do `/zapytanie` z tym projektem), dodaj do shortlisty, sprawdz dzialke pod ten projekt (link do `/dzialka` z tym projektem).
- **AC-4**: Sekcja, dla której producent nie dostarczyl danych (certyfikaty, gwarancja, próg zgloszenia uproszczonego, galeria, cena) nie renderuje sie w ogóle &mdash; zaden pusty placeholder.
- **AC-5**: Gdy `priceOnRequest` jest `true`, zakres ceny nie jest pokazywany; w jego miejscu widoczne jest tylko CTA zapytania.
- **AC-6**: Wejscie na `/klient/projekt/[id]` z nieistniejacym w katalogu przykladowym id zwraca standardowa strone 404 Next.js (`notFound()`).
- **AC-7**: Panel zgodnosci prawnej renderuje sie tylko wtedy, gdy URL niesie parametr kraju ORAZ istnieje wiersz `EligibilityByCountry` dla tej pary projekt+kraj; w przeciwnym razie panel jest pominiety.
- **AC-8**: Projekt z id majacym prefiks `local-` (lokalny podglad producenta z katalogu, spec 0016) nie jest linkowany z `ResultCard` ani `PopularHomeCard` &mdash; te karty zostaja nieklikalne dla podgladu lokalnego, tak jak dzis.
- **AC-9**: Kazdy projekt ma unikalne metadata (title, description), obraz Open Graph, canonical URL i dane strukturalne JSON-LD (Product/Offer) odzwierciedlajace nazwe, cene (albo informacje "wycena indywidualna") i producenta.

## Options considered

Zobacz `rationale.md`.

## Decision

**Wybrana opcja**: Opcja 1: rozszerz istniejacy typ `Project` w miejscu

Strona czerpie dane z jednego, wspólnego typu `Project` (uzywanego juz dzis przez `ResultCard`, `PopularHomeCard`, `BindingOfferView`), rozszerzonego o cztery nowe, opcjonalne pola ujawnione przez realne dane od Budman i Cocomodule.

## Rationale

Zobacz `rationale.md`.

## Feature design

**Szkic modelu danych** (rozszerzenie `Project` w `lib/data/types.ts`, wszystkie nowe pola opcjonalne, brak = sekcja ukryta):

| Pole | Typ | Wymagane | Uwaga |
|---|---|---|---|
| `priceOnRequest` | `boolean` | tak, domyslnie `false` | gdy `true`, `priceMin`/`priceMax` moga byc pominiete w renderze (pola same w sobie zostaja `number`, po prostu nie sa pokazywane) |
| `certifications` | `string[]` | nie (opcjonalne, pomijalne) | np. `["ISO 9001", "CE"]`; puste lub brak &rarr; sekcja "Certyfikaty" znika |
| `simplifiedPermitEligible` | `boolean` | nie (opcjonalne) | ustawiane jawnie w danych, nie liczone automatycznie z metrazu &mdash; realny silnik zgodnosci to osobna, przyszla funkcja (produkcja epic #10) |
| `galleryImageUrls` | `string[]` | nie (opcjonalne, pomijalne) | `coverImageUrl` zostaje pierwszym/glownym zdjeciem; puste &rarr; brak dodatkowej galerii, hero pokazuje samo `coverImageUrl` |

Relacje wykorzystywane przez strone (bez zmian, juz istnieja): `Project.producerId` &rarr; `Producer.id` (1:1, do sekcji producenta); `EligibilityByCountry` (`projectId` + `countryCode` &rarr; status), czytane gdy URL niesie `?country=XX`, ta sama konwencja co dzis w `/dzialka`.

**Przejscia stanu**: brak (strona statyczna dla danego projektu, bez maszyny stanu).

**Powierzchnia dostepu do danych** (Server Component w App Router, nie REST API &mdash; zgodnie z regula AGENTS.md, ze funkcje dostepu do danych sa asynchroniczne):

| Funkcja | Gdzie | Kluczowe wejscie | Wyjscie | Autoryzacja | Kluczowe bledy |
|---|---|---|---|---|---|
| `getProjectById` | `lib/data/projects.ts` (juz istnieje) | `id: string` | `Project \| null` | brak (publiczne) | `null` &rarr; `notFound()`, satisfies AC-6 |
| `getEligibilityByCountry` | `lib/data/projects.ts` (juz istnieje) | `countryCode: CountryCode` | `EligibilityByCountry[]` | brak (publiczne) | brak wiersza dla projektu &rarr; panel pominiety, satisfies AC-7 |

Zadna z tych funkcji nie wymaga zmiany sygnatury; `getProjectById` juz dzis przeszukuje tylko zaszyte dane przykladowe (`projects` fixture), co jest zamierzone &mdash; patrz AC-8 i Key invariants nizej.

**Kluczowe niezmienniki**:
- Sekcja renderuje sie tylko, gdy jej pole zródlowe jest obecne i niepuste (AC-4). Zaden komponent sekcji nie ma stanu "brak danych".
- `priceOnRequest = true` wyklucza render zakresu ceny w kazdym miejscu na stronie (hero i warunki komercyjne), nie tylko w jednym.
- `getProjectById` pozostaje ograniczone do katalogu przykladowego; id z prefiksem `local-` (podglad producenta z `localStorage`, spec 0016) nigdy nie jest linkowane do tej strony z `ResultCard`/`PopularHomeCard` (AC-8) &mdash; nie dodajemy tu sciezki client side po `local-`.
- Panel zgodnosci prawnej wymaga jednoczesnie parametru kraju w URL i istniejacego wiersza `EligibilityByCountry`; brak któregokolwiek &rarr; panel pominiety (AC-7).

**Model bezpieczenstwa**: strona publiczna, bez logowania (zgodne z dzisiejszym etapem Prototyp, brak systemu kont). Zadne dane osobowe nie sa zbierane ani pokazywane na tej stronie (formularz zapytania z danymi klienta zyje w `/zapytanie`, poza zakresem tego spec). Brak dodatkowego zakresu zgodnosci regulacyjnej ponad to, co juz obowiazuje w projekcie.

**Wymagana konfiguracja**: brak nowych zmiennych srodowiskowych ani danych dostepowych &mdash; strona czyta wylacznie istniejace dane przykladowe.

**Kluczowe scenariusze testowe** (kazdy odpowiada kryterium w Requirements):
- Happy path: wejscie z `/wyniki` w karte projektu z pelnymi danymi otwiera `/klient/projekt/[id]` z wszystkimi sekcjami w prawidlowej kolejnosci, satisfies **AC-1**, **AC-2**.
- Brak danych: projekt bez `certifications`/`galleryImageUrls`/`simplifiedPermitEligible` renderuje strone bez tych sekcji, bez pustych placeholderów, satisfies **AC-4**.
- Cena na zapytanie: projekt z `priceOnRequest: true` nie pokazuje zakresu ceny w zadnym miejscu strony, satisfies **AC-5**.
- Not found: `/klient/projekt/nieistniejace-id` zwraca 404, satisfies **AC-6**.
- Zgodnosc prawna: ten sam projekt z `?country=PL` (majacy wiersz eligibility) pokazuje panel, bez parametru kraju &mdash; nie pokazuje, satisfies **AC-7**.
- Lokalny podglad: karta projektu producenta (`local-...`) w wynikach zostaje nieklikalna, satisfies **AC-8**.
- SEO: strona dla dwóch róznych projektów generuje rózne title/description/OG image/JSON-LD, satisfies **AC-9**.

## Build plan

Kolejnosc wedlug podejscia budowy tego etapu, Facade (najpierw pelny, klikalny interfejs na danych przykladowych) &mdash; brak wlasnego wiersza `Approach` w scope, wiec stosujemy domyslne podejscie projektu z AGENTS.md. Dane przykladowe (`getProjectById`) juz istnieja, wiec najpierw rozszerzamy ich ksztalt, potem budujemy interfejs na tym ksztalcie.

1. Rozszerz typ `Project` w `lib/data/types.ts` o `priceOnRequest`, `certifications`, `simplifiedPermitEligible`, `galleryImageUrls`; zaktualizuj dane przykladowe w `lib/data/fixtures/projects.ts` tak, by co najmniej jeden projekt mial kazde nowe pole wypelnione, a co najmniej jeden je pomijal (do testu AC-4), satisfies **AC-4**, **AC-5**.
2. Zbuduj nowe, prezentacyjne komponenty w `components/klient/`: galeria zdjec, tabela specyfikacji technicznej/konstrukcji, lista certyfikatów &mdash; kazdy sam w sobie nie renderujacy sie przy braku danych (AC-4), satisfies **AC-1**, **AC-4**.
3. Zbuduj strone `app/[locale]/klient/projekt/[id]/page.tsx` (Server Component), skladajaca nowe komponenty plus istniejace wzorce (blok ceny z `ResultCard`, odznaka statusu prawnego, `ProducerCard`/`ProducerShowcase`) w potwierdzonej kolejnosci sekcji, wolajac `getProjectById` i `getEligibilityByCountry`; `notFound()` gdy projekt nie istnieje, satisfies **AC-1**, **AC-3**, **AC-6**, **AC-7**.
4. Podepnij trzy akcje na stronie (zapytanie, shortlista, sprawdz dzialke) do istniejacych tras z parametrem projektu, satisfies **AC-3**.
5. Zmien `ResultCard` i `PopularHomeCard` tak, by linkowaly do `/klient/projekt/[id]` dla projektów z katalogu przykladowego, a zostaly nieklikalne dla id z prefiksem `local-`, satisfies **AC-2**, **AC-8**.
6. Dodaj `generateMetadata` (title/description/OG image/canonical) i JSON-LD (Product/Offer) per projekt, satisfies **AC-9**.
7. Testy: Vitest + Testing Library dla nowych komponentów i strony (co-located, per `components/klient/AGENTS.md`), Playwright e2e dla sciezki wyniki &rarr; strona projektu &rarr; zapytanie, satisfies wszystkie AC.

## Consequences

**Pozytywne**:
- Pierwsza realna, klikalna strona oferty na potrzeby strony marketingowej &mdash; zamyka luke jawnie zostawiona otwarta przez specy 0004, 0014, 0015.
- Model `Project` staje sie realistyczny wobec tego, co faktycznie maja producenci (nierówna kompletnosc danych), co bezposrednio informuje przyszly ksztalt pól w kreatorze katalogu producenta (spec 0016 i nastepcy).
- Ustanawia pierwszy wzorzec SEO (metadata, JSON-LD, OG) w projekcie, wielokrotnego uzytku dla przyszlych stron publicznych.

**Negatywne / kompromisy**:
- Waluta zostaje EUR-only na razie (swiadomy dlug) &mdash; ceny Budman i Cocomodule w PLN wymagaja recznej konwersji do danych przykladowych, bez wlasnego pola waluty w modelu; prawdziwa obsluga wielu walut zostaje odlozona.
- `simplifiedPermitEligible` jest jawnie wpisywanym polem, nie liczonym automatycznie &mdash; nie zastepuje przyszlego realnego silnika zgodnosci (produkcja epic #10); ryzyko rozjazdu, jesli ktos wpisze je niepoprawnie recznie.
- Kreator katalogu producenta (spec 0016) nie zbiera dzis `certifications`, `galleryImageUrls` ani `simplifiedPermitEligible` &mdash; projekty dodane przez producentów przez ten kreator nigdy nie pokaza tych sekcji na wlasnej stronie szczególów, dopóki formularz nie zostanie rozszerzony osobno.
- Pelne SEO budowane teraz, przed przyszla funkcja #16 (SEO podstawowe stron publicznych) w epice Produkcja, która miala ustalic to jednolicie dla wszystkich stron publicznych naraz &mdash; patrz uwaga w `rationale.md`.

**Neutralne**:
- Rozszerzenie `Project` to zmiana wstecznie zgodna (nowe pola opcjonalne) &mdash; istniejace uzycia typu (`ResultCard`, `PopularHomeCard`, `BindingOfferView`) dzialaja bez zmian.

## Follow-up

- [ ] Specy 0004 (AC-8), 0014 (AC-6), 0015 (AC-4) zawieraja zapisy, ze karty wyników sa celowo nieklikalne, bo trasa pojedynczego projektu nie istnieje. Po zbudowaniu tej strony te trzy zapisy sa nieaktualne dla projektów spoza `local-` i wymagaja aktualizacji (np. przez `/architect` update albo `/sync`).
- [ ] Rozwaz rozszerzenie kreatora katalogu producenta (spec 0016) o `certifications`, `galleryImageUrls`, `simplifiedPermitEligible`, zeby projekty producentów tez mogly pokazywac te sekcje na wlasnej stronie szczególów.
- [ ] Gdy funkcja #16 (SEO podstawowe stron publicznych, epika Produkcja) zostanie zaprojektowana, powinna potraktowac metadata/JSON-LD z tej strony jako wzorzec do rozszerzenia (sitemapa, reszta stron publicznych), a nie równolegla decyzje do pogodzenia pózniej.
- [ ] Waluta natywna (PLN vs EUR) pozostaje otwarta &mdash; gdy pojawi sie kolejny producent spoza strefy EUR albo Polska przestanie byc jedynym pilotem, ten dlug trzeba bedzie splacic osobnym spec.
- [ ] Brak dzisiaj wiersza w `docs/scope/` dla tej funkcji &mdash; do wpisania po potwierdzeniu tego spec.

## Rationale

Pelne uzasadnienie, rozwazane opcje i kontekst: patrz `rationale.md`.
