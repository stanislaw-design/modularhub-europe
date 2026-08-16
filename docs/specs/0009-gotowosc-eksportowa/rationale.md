# 0009. Gotowość eksportowa: uzasadnienie

## Context

Spec [0008](../0008-pierwszy-projekt/index.md) zbudowała kreator pierwszego projektu producenta i celowo zostawiła po nim zaślepkę pod `/pl/producent/gotowosc-eksportowa`, z jawnym follow-upem, żeby funkcja 13 wypełniła ją właściwą treścią. Scope funkcji 13 wymaga mapy/listy krajów ze statusem (gotowe / brakuje kilku rzeczy / niedopuszczalne), listy konkretnych braków przy statusie pośrednim, i widocznego zastrzeżenia, że to nie jest opinia prawna.

Dwie rzeczy ograniczają, jak realistyczny może być ten ekran. Po pierwsze, szkic projektu producenta (`ProjectDraft`) nigdy nie staje się prawdziwym `Project` z trwałym `id` — to świadoma decyzja spec 0008 (Consequences: „Dane wpisane w kreatorze nigdy nie stają się prawdziwym Project używanym po stronie klienta"). Nie ma więc stabilnego klucza, po którym można by dociągnąć istniejące dane `EligibilityByCountry`, które i tak są kluczowane `projectId` sześciu konkretnych demo projektów klienta. Po drugie, prawdziwy silnik zgodności prawnej per kraj jest jawnie odłożoną decyzją w `docs/scope/scope.md` (Deferred, „full weight"), więc żadna wersja tego ekranu na tym etapie nie może być realną oceną — musi pozostać jawnie oznaczonym mockiem, tak jak każdy inny „udawany krok" w tym prototypie (płatność, wgrywanie plików, ocena działki klienta).

Dodatkowa siła: kontrakt URL między kreatorem a tym ekranem, ustalony w spec 0008, przenosi dziś wyłącznie `nazwa` projektu. Nic więcej (NIP, zarejestrowane kraje dostawy, wpisane pola techniczne) nie dociera do tego ekranu, chyba że kontrakt zostanie świadomie rozszerzony.

Konsekwencja niepodjęcia decyzji: bez jasnego wyboru strategii mocka, budowa tego ekranu albo wymyśliłaby prowizoryczny mechanizm oceny (którego nikt nie prosił i który i tak nie byłby prawdziwy), albo wpisałaby się w zakres przyszłej funkcji 14 (domykanie luk), zamiast zostać czystym, informacyjnym ekranem.

## Options considered

Patrz [index.md](index.md#options-considered) dla pełnego porównania trzech opcji (stały kanoniczny mock, deterministyczne profile z hashu nazwy zawężone do krajów rejestracji, i reużycie istniejących wierszy `EligibilityByCountry`).

## Rationale

Opcja 1 (stały kanoniczny mock) jest wybrana, bo najdosłowniej realizuje „Done when" funkcji 13 (basis: `docs/scope/scope.md`, wiersz funkcji 13) bez dodawania mechanizmu, którego scope nie wymaga. Etap projektu to Facade: mockowe dane w innych już zbudowanych ekranach (fixture `eligibility.ts`, `fulfillment.ts`, `plot-analysis.ts`) są zawsze statyczne, nigdy nie próbują symulować prawdziwej logiki biznesowej, którą i tak zastąpi przyszły silnik zgodności. Rozszerzanie kontraktu URL o zarejestrowane kraje dostawy (opcja 2) dotyka trzech już zbudowanych plików (`ProjectWizard`, strony rejestracji i kreatora) dla korzyści, której obecne „Done when" nie wymaga — to świadomie zostawione jako Follow-up, nie wbudowane teraz.

Opcja 3 (reużycie wierszy `EligibilityByCountry` demo projektów klienta) odpada z powodu niedopasowania kształtu danych: `reason` tam jest pojedynczym zdaniem, a scope wymaga listy konkretnych, osobnych braków przy statusie pośrednim. Dowiązanie mocka producenta do niepowiązanych demo projektów klienta (`prj-modulor-family-90` itd.) byłoby też mylące dla przyszłego czytelnika `fixtures/eligibility.ts`, który zobaczyłby użycie w dwóch zupełnie różnych kontekstach flow.

Nowy typ `ExportReadinessCountryStatus`, osobny od `EligibilityByCountry`, wynika z tej samej siły: dwa typy wyglądają podobnie (te same trzy statusy), ale mają różną kardynalność klucza (per `projectId` kontra jeden wiersz na kraj, niezależnie od projektu) i nie powinny udawać jednego modelu tylko dlatego, że dziś przypadkiem współdzielą nazwy pól.
