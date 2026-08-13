# 0002. Dane mockowe i routing

## Summary

Ta część fundamentu definiuje kształt danych mockowych, które będą czytać wszystkie ekrany: projekty domów modułowych i to, w których krajach dany projekt jest dopuszczony. Ustala też typowane, asynchroniczne funkcje do ich czytania (zgodnie z regułą `AGENTS.md`) i tworzy puste segmenty tras dla ścieżki klienta i producenta, żeby każda kolejna specyfikacja ekranu tylko dodawała stronę.

## Decision

**Chosen option**: trzy encje mockowe (`Project`, `Country`, `EligibilityByCountry`) w typowanych plikach TypeScript pod `lib/data/`, czytane przez asynchroniczne funkcje dostępowe; puste segmenty `app/[locale]/klient/` i `app/[locale]/producent/` z minimalną wspólną powłoką każda.

### Model danych mockowych

| Encja | Klucz | Pola | Relacje |
|---|---|---|---|
| `Project` | `id` | `producerId`, `producerName`, `name`, `countryOfProduction`, `floorAreaM2`, `bedrooms`, `priceMin`, `priceMax`, `currency`, `coverImageUrl`, `description`, `wallBuildUp`, `insulation`, `heatTransferCoefficients`, `windowClass`, `ventilation`, `heatSource`, `fireResistance`, `windResistance` | 1:N do `EligibilityByCountry` |
| `Country` | `code` (`PL`/`DE`/`NL`) | `name` | 1:N do `EligibilityByCountry` |
| `EligibilityByCountry` | (`projectId`, `countryCode`) złożony | `status` (`approved`/`conditional`/`blocked`, te same wartości co token statusu marki), `reason` (tekst) | N:M spina `Project` i `Country` |

Zakres krajów w mocku: Polska (baza produkcji), Niemcy i Holandia (rynki docelowe wskazane wprost w `docs/brand-guidelines-v3.md`, sekcja 2).

### Funkcje dostępowe

| Layer | Choice | Reason |
|---|---|---|
| Lokalizacja plików | `lib/data/fixtures/*.ts` (dane), `lib/data/*.ts` (funkcje) | oddziela dane od logiki dostępu, poza drzewem `app/` żeby nie stało się przypadkiem trasą |
| Kształt funkcji | `getProjects(filters?: { countryCode?: string }): Promise<Project[]>`, `getProjectById(id): Promise<Project \| null>`, `getCountries(): Promise<Country[]>`, `getEligibility(projectId, countryCode): Promise<EligibilityByCountry \| null>` | asynchroniczne od początku zgodnie z `AGENTS.md`; sygnatura przetrwa zamianę na prawdziwe API bez zmian w ekranach, które je wywołują; `countryCode` na `getProjects` pozwala ekranowi 6 (wyniki z filtrem prawnym) pobrać od razu przefiltrowaną listę, zamiast wołać `getEligibility` osobno dla każdego projektu |
| Format danych | Typowane moduły TS (nie JSON) | TypeScript łapie błędy kształtu danych przy każdej zmianie, zgodnie z uzasadnieniem wyboru TypeScript w spec 0001 |

### Routing

| Layer | Choice | Reason |
|---|---|---|
| Segmenty | `app/[locale]/klient/layout.tsx`, `app/[locale]/producent/layout.tsx`, oba puste poza minimalną wspólną powłoką (Container plus typografia z [0002-biblioteka-komponentow.md](0002-biblioteka-komponentow.md), plus punkt orientacyjny `<main>` i link "przejdź do treści" na początku, zgodnie ze standardem WCAG 2.2 AA z sekcji 14 wytycznych marki) | potwierdza konwencję realnych segmentów ze spec 0001; tworzy je teraz, żeby żaden ekran nie musiał sam decydować o strukturze folderów; punkt orientacyjny i skip link kosztują nic teraz i są dużo trudniejsze do dopisania wstecz do trzynastu gotowych ekranów |
| Nawigacja w powłoce | Brak na tym etapie | treść nawigacji (co pokazuje nagłówek klienta vs producenta) należy do pierwszego ekranu w każdej ścieżce (4: strona startowa, 11: rejestracja producenta), nie do tego fundamentu |

## Rationale

Model danych powstał wprost z odpowiedzi w rozmowie projektowej: `EligibilityByCountry` jako złącze wiele do wielu odzwierciedla samą istotę platformy (ten sam projekt może być dopuszczony w jednym kraju, a warunkowy w drugim). Encja statusu/zamówienia użyta na ekranach 10 i 16 świadomie zostaje poza tym modelem, bo dziś nie ma jeszcze ustalonych stanów ani dokumentów na etap; dodanie jej teraz na wyrost ryzykowałoby zgadywanie kształtu, który i tak trzeba będzie zweryfikować przy tamtej specyfikacji.

## Consequences

**Positive**: każdy ekran czytający projekty i dopuszczalność krajową dostaje ten sam kształt danych i te same funkcje; wymiana na prawdziwe API w drugim etapie zmienia tylko wnętrze plików w `lib/data/`.
**Negative / tradeoffs**: encja zamówienia/statusu nie istnieje jeszcze, więc ekrany 10 i 16 nie mogą się od razu odwołać do wspólnego modelu, dopóki własna specyfikacja go nie ustali. Podobnie brak osobnej encji `Producer` (tylko zdenormalizowane `producerId`/`producerName` na `Project`) i cena siedząca na `Project`, nie per kraj docelowy, mimo że transport w cenie końcowej realnie zależy od kraju; oba zapisane pełniej w Consequences specyfikacji parasolowej ([index.md](index.md)).
**Neutral**: puste layouty `klient/` i `producent/` nie renderują jeszcze żadnej realnej nawigacji; pierwszy ekran w każdej ścieżce ją doda.

## Follow-up

- [ ] `/architect realizacja — oś statusów` (ekran 10) projektuje encję zamówienia/statusu; rozważ, czy powinna trafić do `lib/data/` obok tych dwóch encji, czy do osobnego modułu.
- [ ] Przy pierwszym ekranie w każdej ścieżce (4 dla klienta, 11 dla producenta) dodaj realną nawigację do odpowiedniego `layout.tsx`.
