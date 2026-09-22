# Katalog pól importu domu z PDF

**Wersja początkowa**: `house-import-v1`  
**Zakres**: `family = dom`

## Zasada źródła prawdy

Implementacja tworzy jeden eksportowany rejestr TypeScript `HOUSE_AI_FIELD_CATALOG`. Z niego wynikają schemat wyjścia modelu, walidacja Zod, etykiety przeglądu, normalizacja, tolerancje konfliktów i mapowanie funkcji zastosowania. Test kontraktowy porównuje rejestr z aktualnymi schematami `ProjectDraft`, `DomTechnicalSpecs`, wariantów, układu pomieszczeń i FAQ. Niezgodność blokuje CI.

Ten dokument definiuje początkową zawartość rejestru. Ścieżki z `[]` są polami powtarzalnych encji połączonych przez `entity_key`. Zagnieżdżona encja zależna ma też `parent_entity_key`, który jawnie wskazuje `entity_key` wariantu nadrzędnego. `extracted` oznacza wartość podaną wprost. `inferred` oznacza wniosek z jawnych przesłanek. `generated` jest dozwolone wyłącznie tam, gdzie katalog mówi to wprost. `translated` powstaje wyłącznie z zaakceptowanej wartości kanonicznej. `normalizacja systemowa` nie jest pochodzeniem odpowiedzi modelu. Oznacza deterministyczną wartość ustawianą przez serwer po walidacji kandydata.

## Tożsamość encji i relacja z rodzicem

| Grupa ścieżek | `entity_key` | `parent_entity_key` | Reguła |
|---|---|---|---|
| `rooms[]` | wymagane | null | pomieszczenie nie jest zależne od wariantu |
| `faq[]` | wymagane | null | wpis FAQ nie jest zależny od wariantu |
| `variants[]` | wymagane | null | klucz wariantu jest rodzicem dla jego rekordów zależnych |
| `variants[].costItems[]` | wymagane | wymagane | wskazuje dokładnie `entity_key` wariantu z tej samej sesji |
| `variants[].timeline[]` | wymagane | wymagane | wskazuje dokładnie `entity_key` wariantu z tej samej sesji |
| `translations.{locale}.rooms[]` | jak w polskiej bazie | null | oba klucze są kopiowane z decyzji źródłowej |
| `translations.{locale}.faq[]` | jak w polskiej bazie | null | oba klucze są kopiowane z decyzji źródłowej |
| `translations.{locale}.variants[]` | jak w polskiej bazie | null | `entity_key` wskazuje ten sam wariant we wszystkich językach |

Klucze są elementem koperty rekordu, nie treścią pola i nie wartością generowaną przez model językowy. Normalizator nadaje je przed zapisem kandydatów. Kandydat, snapshot, decyzja i żądanie tłumaczenia przechowują ten sam komplet kluczy. Funkcja zastosowania tworzy mapę `entity_key` wariantu na UUID i rozwiązuje rekord zależny wyłącznie przez `parent_entity_key`. Kolejność, nazwa wariantu i podobieństwo tekstu nie są dozwolonym źródłem relacji.

## Pola sterowane przez system

| Ścieżka | Źródło | Reguła |
|---|---|---|
| `product.family` | stała serwera | zawsze `dom`, model jej nie wybiera |
| identyfikatory produktu, list i tłumaczeń | Postgres podczas zastosowania | UUID, nigdy wartość modelu |
| `sortOrder` | kolejność kandydata w dokumencie, potem decyzja producenta | kolejne liczby od 0 |
| `variants[].isDefault` | reguła serwera | true dla jedynego zaakceptowanego wariantu; przy wielu wybiera producent |
| język kanoniczny | kontrakt aplikacji | `pl` |
| języki docelowe | sesja | `en`, `de`, `nl` |

## Dane podstawowe

| `field_path` | Cel | Typ i jednostka | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `product.name` | `product.name` | tekst | extracted | Unicode NFC, pojedyncze odstępy, równość po normalizacji |
| `product.description` | `product.description` | tekst | extracted, generated | zachowanie akapitów, generated maksymalnie medium |
| `product.floorAreaM2` | `product.floor_area_m2` | liczba, m² | extracted, inferred | liczba dziesiętna, tolerancja 0,1 m² |
| `product.bedrooms` | `product.bedrooms` | liczba całkowita | extracted, inferred | minimum 0, równość całkowita |
| `product.countryOfProduction` | `product.country_of_production` | kod ISO 3166 1 alpha 2 | extracted, inferred | uppercase, dokładna równość |
| `product.category` | `product.category` | `caloroczny`, `rekreacyjny-caloroczny`, `mobilny`, `wynajem-hotel` | extracted, inferred | mapa kontrolowanych synonimów, dokładna równość enumu |
| `product.currency` | `product.currency` | `EUR` | normalizacja systemowa | stała waluta docelowa produktu; waluta źródłowa ceny pozostaje w metadanych kandydata |

Nazwa nie jest generowana. Jeżeli dokument nie podaje nazwy modelu, pole pozostaje puste. Opis może być wygenerowany wyłącznie z zaakceptowanych faktów, bez dodawania parametrów, certyfikatów i obietnic handlowych.

## Dane techniczne domu

| `field_path` | Cel w `technical_specs` | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `technical.wallBuildUp` | `wallBuildUp` | tekst | extracted, inferred | warstwy w kolejności dokumentu, równość znormalizowanego tekstu |
| `technical.insulation` | `insulation` | tekst | extracted, inferred | jednostki zachowane, równość tekstu |
| `technical.energyClass` | `heatTransferCoefficients` | `A+`, `A`, `B`, `C`, `D`, `nieznana` | extracted | kontrolowana mapa nazw, dokładna równość |
| `technical.windowClass` | `windowClass` | tekst | extracted | Unicode NFC, równość tekstu |
| `technical.ventilation` | `ventilation` | `grawitacyjna`, `mechaniczna-nawiewno-wywiewna`, `rekuperacja`, `brak` | extracted, inferred | kontrolowana mapa synonimów, dokładna równość |
| `technical.heatSource` | `heatSource` | enum z `HEAT_SOURCES` | extracted, inferred | kontrolowana mapa synonimów, dokładna równość |
| `technical.fireResistance` | `fireResistance` | tekst | extracted | zachowanie klasy, równość tekstu |
| `technical.windResistance` | `windResistance` | tekst | extracted | zachowanie klasy i jednostki, równość tekstu |

Wartość `nieznana` nie jest tworzona jako kandydat. Brak klasy energetycznej pozostawia pole puste w szkicu.

## Logistyka, działka i gwarancje

| `field_path` | Cel | Typ i jednostka | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `logistics.structuralWarrantyYears` | `product.structural_warranty_years` | liczba całkowita, lata | extracted | minimum 0, równość całkowita |
| `logistics.installationWarrantyYears` | `product.installation_warranty_years` | liczba całkowita, lata | extracted | minimum 0, równość całkowita |
| `logistics.serviceScopeDescription` | `product.service_scope_description` | tekst | extracted | równość znormalizowanego tekstu |
| `logistics.transportDimensions` | `product.transport_dimensions` | tekst | extracted, inferred | wszystkie wymiary do metrów, tolerancja 0,01 m |
| `logistics.craneRequirements` | `product.crane_requirements` | tekst | extracted | równość znormalizowanego tekstu |
| `logistics.minPlotWidthM` | `product.min_plot_width_m` | liczba, m | extracted, inferred | tolerancja 0,01 m |
| `compliance.simplifiedPermitEligible` | `product.simplified_permit_eligible` | boolean | extracted | tylko jawna deklaracja dokumentu, nigdy dedukcja prawna |

Gwarancje, odpowiedzialność serwisowa i zgodność prawna nie mogą być generowane ani dedukowane z ogólnych sformułowań marketingowych.

## Układ pomieszczeń

| `field_path` | Cel | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `rooms[].name` | `product.room_layout[].name` | tekst | extracted | równość tekstu |
| `rooms[].areaM2` | `product.room_layout[].areaM2` | liczba, m² | extracted, inferred | tolerancja 0,1 m² |
| `rooms[].function` | `product.room_layout[].function` | tekst | extracted, inferred | kontrolowane synonimy plus tekst źródłowy |
| `rooms[].isMezzanine` | `product.room_layout[].isMezzanine` | boolean | extracted, inferred | dokładna równość |

Wiersze są grupowane przez `entity_key`. Identyfikator docelowy powstaje w transakcji zastosowania. Sumy powierzchni pomieszczeń nie mogą automatycznie zastępować `product.floorAreaM2`; rozbieżność jest dodatkową obserwacją i może obniżyć pewność.

## Warianty i cennik

| `field_path` | Cel | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `variants[].completionStandard` | `product_variant.completion_standard` | `surowy-zamkniety`, `deweloperski`, `pod-klucz` | extracted, inferred | kontrolowana mapa synonimów, dokładna równość |
| `variants[].variantLabel` | `product_variant.variant_label` | tekst | extracted | równość tekstu |
| `variants[].priceMinCents` | `product_variant.price_min_cents` | integer, eurocenty | extracted plus deterministyczna normalizacja | najniższa lub jedyna jawna cena netto przeliczona po utrwalonym kursie EBC, tolerancja 1 eurocenta |
| `variants[].priceMaxCents` | `product_variant.price_max_cents` | integer, eurocenty | extracted plus deterministyczna normalizacja | wyłącznie jawna maksymalna cena netto przeliczona tym samym snapshotem kursu; brak maksimum daje null |
| `variants[].scopeSummary` | `product_variant.scope_summary` | tekst | extracted | równość tekstu |

Cena bez jawnej waluty nie jest konwertowana i tworzy problem `PRICE_CURRENCY_AMBIGUOUS`. Kwota oraz kod ISO 4217 waluty źródłowej pozostają w `raw_value`. `normalized_value` zawiera cenę netto w eurocentach, a `normalization_metadata` zawiera dostawcę `ECB`, serię `EXR.D.{SOURCE}.EUR.SP00.A`, kwotę i walutę źródłową, walutę docelową `EUR`, kurs, datę kursu, czas pobrania i regułę `HALF_UP_2`. Kurs oznacza liczbę jednostek waluty źródłowej za 1 EUR, więc normalizator dzieli kwotę źródłową przez kurs. Kurs starszy niż siedem dni albo brak waluty w dziennych kursach EBC tworzy `FX_RATE_UNAVAILABLE`. Kwota brutto i VAT nie są importowane, ponieważ zależą od kraju i warunków dostawy. Kwota brutto nie może być użyta jako `priceMaxCents`. Dla jednej ceny netto `priceMinCents` otrzymuje wartość przeliczoną, a `priceMaxCents` pozostaje null. System nie generuje cen ani zakresu handlowego.

Dla ceny `raw_value` ma kontrakt `{ amount: string, currency: string, taxBasis: "net" }`, gdzie `amount` jest liczbą dziesiętną bez separatorów tysięcy. `normalized_value` jest całkowitą liczbą eurocentów. `normalization_metadata` ma kontrakt `{ kind: "fx", provider: "ECB", series: string, sourceAmount: string, sourceCurrency: string, targetCurrency: "EUR", rate: string, rateDate: "YYYY-MM-DD", retrievedAt: string, rounding: "HALF_UP_2" }`. Wartości dziesiętne pozostają ciągami znaków, żeby implementacja nie użyła binarnych liczb zmiennoprzecinkowych.

## Pozycje kosztowe wariantu

| `field_path` | Cel | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `variants[].costItems[].label` | `cost_line_item.label` | tekst | extracted | równość tekstu |
| `variants[].costItems[].status` | `cost_line_item.status` | `w-cenie`, `obowiazkowa-doplata`, `opcja`, `po-stronie-klienta`, `do-wyceny` | extracted, inferred | mapa jawnych sformułowań, dokładna równość |
| `variants[].costItems[].responsibleParty` | `cost_line_item.responsible_party` | tekst | extracted | równość tekstu |

Dedukcja statusu jest dozwolona tylko z jednoznacznych zwrotów, na przykład „w cenie” albo „po stronie inwestora”, i zawsze ma maksymalnie medium. Brak jednoznaczności pozostawia `do-wyceny` wyłącznie wtedy, gdy dokument używa takiego znaczenia. System nie używa `do-wyceny` jako domyślnej wartości braku danych.

Każda pozycja kosztowa ma własne `entity_key` oraz wymagane `parent_entity_key` wariantu. Wszystkie pola jednej pozycji zachowują tę samą parę kluczy.

## Harmonogram wariantu

| `field_path` | Cel | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `variants[].timeline[].stageKey` | `product_timeline_stage.stage_key` | `formalnosci`, `produkcja`, `transport`, `montaz`, `wykonczenie` | extracted, inferred | kontrolowana mapa etapów |
| `variants[].timeline[].durationMinDays` | `duration_min_days` | integer, dni | extracted, inferred | tygodnie razy 7, miesiąc wyłącznie gdy dokument podaje liczbę dni, tolerancja 1 dzień |
| `variants[].timeline[].durationMaxDays` | `duration_max_days` | integer, dni | extracted, inferred | jak wyżej, maksimum nie mniejsze od minimum |
| `variants[].timeline[].startsFromLabel` | `starts_from_label` | tekst | extracted | równość tekstu |
| `variants[].timeline[].responsibleParty` | `responsible_party` | tekst | extracted | równość tekstu |

Nie przeliczamy nieprecyzyjnego „miesiąca” na trzydzieści dni. Taka wartość pozostaje obserwacją dodatkową do ręcznego rozstrzygnięcia.

Każdy etap ma własne `entity_key` oraz wymagane `parent_entity_key` wariantu. Wszystkie pola jednego etapu zachowują tę samą parę kluczy.

## FAQ

| `field_path` | Cel | Typ | Dozwolone pochodzenie | Normalizacja i konflikt |
|---|---|---|---|---|
| `faq[].question` | `product.faq[].question` | tekst | extracted, generated | generated tylko na podstawie zaakceptowanych faktów |
| `faq[].answer` | `product.faq[].answer` | tekst | extracted, generated | odpowiedź nie może rozszerzać faktów ani obietnic |

Pytanie i odpowiedź mają wspólny `entity_key`. FAQ wygenerowane ma maksymalnie medium i wymaga jawnej decyzji producenta.

## Tłumaczenia

| `field_path` | Cel | Źródło |
|---|---|---|
| `translations.{locale}.name` | `product_translation.name` | zaakceptowane `product.name` |
| `translations.{locale}.description` | `product_translation.description` | zaakceptowane `product.description` |
| `translations.{locale}.rooms[].name` | `product_translation.room_layout[].name` | zaakceptowane `rooms[].name`, powiązanie po `entity_key` |
| `translations.{locale}.faq[].question` | `product_translation.faq[].question` | zaakceptowane `faq[].question` |
| `translations.{locale}.faq[].answer` | `product_translation.faq[].answer` | zaakceptowane `faq[].answer` |
| `translations.{locale}.variants[].scopeSummary` | `product_variant_translation.scope_summary` | zaakceptowane `variants[].scopeSummary` |

`locale` przyjmuje `en`, `de`, `nl`. Tłumaczenie kopiuje `entity_key` i `parent_entity_key` z zaakceptowanej decyzji polskiej. `product_variant_translation` jest rozwiązywane przez mapę UUID wariantów utworzoną z `entity_key`, nigdy przez kolejność wariantów. Gdy dokument źródłowy ma już dany język, dokładny kandydat źródłowy może zostać zaproponowany zamiast ponownego tłumaczenia, ale nadal musi wskazywać zaakceptowaną polską wartość jako bazę spójności. Zmiana bazy unieważnia tłumaczenie.

## Pola wyłączone z pierwszej wersji

| Obszar | Powód |
|---|---|
| zdjęcia, wizualizacje, rzuty i pliki galerii | brak ekstrakcji mediów w AC-5 |
| certyfikaty | system nie może tworzyć ani prawnie weryfikować certyfikatów |
| status publikacji | import zawsze kończy się na szkicu |
| dane producenta i profil mocy produkcyjnych | nie są danymi projektu z oferty |
| kwalifikacja prawna poza jawnym `simplifiedPermitEligible` | wymaga osobnego silnika zgodności |

## Informacje spoza katalogu

Każdy fakt, którego nie da się bezpiecznie przypisać do powyższej ścieżki, trafia do `ai_additional_observation`. Nie wolno tworzyć dynamicznego `field_path` prowadzącego do produktu. Producent może odczytać, potwierdzić albo odrzucić obserwację, ale jej przeniesienie do nowego pola wymaga najpierw rozszerzenia katalogu i schematu produktu.
