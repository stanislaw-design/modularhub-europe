# 0077 Część B: grupy producentów

## Summary

Przy zakładaniu projektu własnego admin wybiera odbiorców z grup, nie klika po jednym producencie. Są dwa rodzaje grup: gotowe, liczone automatycznie z rodziny produktu (domy, sauny, kontenery, outdoor TV), oraz własne listy zapisane w panelu z nazwą, które admin sam tworzy i poprawia. Wybór grup rozwija się do listy producentów w chwili założenia projektu i potem się nie zmienia.

## Requirements

**User stories**:
- Jako administrator, chcę wybrać "wszyscy producenci saun" jednym kliknięciem, żeby nie szukać ich po jednym.
- Jako administrator, chcę zapisać własną grupę (np. "Sprawdzeni, dostawa do DE"), żeby kolejne projekty miały gotową listę i proces przyspieszał z czasem.
- Jako administrator, chcę, żeby zmiana grupy nie zmieniała zapytań, które już poszły.

**Acceptance criteria**:
- **AC-23**: Ekran `/internal/producer-groups` (rola `admin`, pozycja w menu panelu admina) pokazuje dwie listy: gotowe grupy (tylko do odczytu) i własne grupy. Admin tworzy własną grupę (nazwa 2 do 60 znaków, opis opcjonalny do 300), zmienia jej nazwę i opis oraz ją usuwa. Nazwa jest unikalna bez względu na wielkość liter i spacje na brzegach. Usunięcie wymaga potwierdzenia i usuwa także jej członków (kaskada), ale nie rusza żadnego istniejącego projektu (AC-26).
- **AC-24**: W szczególe własnej grupy admin dodaje producentów przez wyszukiwanie po nazwie i usuwa ich z grupy. Producent usunięty lub z zablokowanym członkiem jest widoczny z oznaczeniem i nie jest brany pod uwagę przy rozwinięciu (AC-7 części A). Producent może być w wielu grupach.
- **AC-25**: Gotowe grupy to jedna grupa na rodzinę produktu z `productFamilyEnum`. Członkowie to producenci mający co najmniej jeden opublikowany produkt w tej rodzinie, liczeni na żywo przy każdym wyświetleniu i rozwinięciu, bez zapisu w bazie. Ekran pokazuje liczbę członków każdej gotowej grupy i ich listę po rozwinięciu.
- **AC-26**: Formularz projektu własnego (część A, AC-7) pozwala zaznaczyć dowolną liczbę gotowych i własnych grup oraz dodać pojedynczych producentów, i pokazuje przed zapisem liczbę unikalnych producentów po rozwinięciu. W chwili zapisu wybór staje się wierszami `include` w `project_request_producer_override`. Późniejsza zmiana lub usunięcie grupy, albo nowy producent w rodzinie, nie zmienia istniejących projektów.
- **AC-27**: Wszystkie zapisy grup i członków idą przez `withAdminActor`, a tabele `producer_group` i `producer_group_member` mają wyzwalacz audytu (spec 0064) z autorem. Akcje sprawdzają rolę `admin` w kodzie, nie tylko w interfejsie. Funkcja audytu ma wąską listę pól dla `producer_group`, żeby nazwa grupy nie była haszowana jak pole `name` w innych tabelach.
- **AC-28**: Producent nie widzi nigdzie nazw grup ani tego, w której grupie jest (grupy są wewnętrzną sprawą ModularHub). Nazwy grup nie trafiają do maili ani do tablicy.

## Decision

Patrz [index.md](index.md#decision).

## Feature design

**Data model sketch**: tabele `producer_group` i `producer_group_member` w [index.md](index.md#cross-part-contract). Gotowe grupy nie mają tabeli.

**API surface**:

| Akcja lub funkcja | Kto | Wejście | Wynik | Główne błędy |
|---|---|---|---|---|
| `createProducerGroup` | admin | nazwa, opis | id | nazwa zajęta, walidacja |
| `updateProducerGroup` | admin | id, nazwa, opis | ok | nazwa zajęta, brak grupy |
| `deleteProducerGroup` | admin | id | ok | brak grupy |
| `addProducerToGroup` / `removeProducerFromGroup` | admin | groupId, producerId | ok | brak producenta, już w grupie |
| `getReadyProducerGroups()` | admin (odczyt) | brak | grupy rodzinowe z liczbą i listą | brak |
| `expandRecipients(groupIds, producerIds)` | wewnętrzna | identyfikatory grup (własnych i gotowych) i producentów | unikalna lista producentów do użycia i lista pominiętych | brak |

**Key invariants**: nazwa grupy unikalna po `lower(btrim(name))`; para (grupa, producent) unikalna; rozwinięcie jest funkcją czystą stanu bazy w danej chwili, a jej wynik zapisuje się do wyjątków i dalej nie zależy od grup.

**Security model**: tylko rola `admin`, odczyt i zapis. Dane producentów w grupach to dane firmowe, bez danych osobowych klientów. Brak widoczności dla producentów (AC-28).

**Critical test scenarios**:
- Happy path: admin tworzy grupę "Test", dodaje dwóch producentów, zakłada projekt z tą grupą i gotową grupą saun, producenci obecni w obu dostają jeden mail, verifies **AC-23**, **AC-24**, **AC-26**.
- Zdjęcie stanu: po założeniu projektu admin usuwa producenta z grupy i usuwa grupę, a projekt nadal widzą ci sami producenci, verifies **AC-26**.
- Gotowa grupa: producent z opublikowaną sauną jest w "Sauny", producent z samym szkicem nie, verifies **AC-25**.
- Nazwa: "Sprawdzeni" i " sprawdzeni " to ta sama nazwa, druga jest odrzucona, verifies **AC-23**.
- Uprawnienia i audyt: producent nie wejdzie na ekran ani nie wywoła akcji, zmiany mają autora w `audit_log`, verifies **AC-27**.
- Producent nie widzi nazw grup w żadnym widoku ani mailu, verifies **AC-28**.

## Build plan

1. Migracja B: tabele `producer_group`, `producer_group_member`, indeks unikalny po znormalizowanej nazwie, wyzwalacze audytu, satisfies **AC-23**, **AC-27**
2. Zapytania i `expandRecipients` (grupy własne, gotowe po rodzinie, deduplikacja, pomijanie zablokowanych i usuniętych), test jednostkowy, satisfies **AC-24**, **AC-25**, **AC-26**
3. Akcje zarządzania grupami (z `withAdminActor` i sprawdzeniem roli), satisfies **AC-23**, **AC-24**, **AC-27**
4. Ekran `/internal/producer-groups` (lista, szczegół, wyszukiwanie producenta), pozycja w menu admina, satisfies **AC-23** do **AC-25**
5. Wybór grup i producentów w formularzu projektu własnego z podglądem liczby unikalnych producentów, rozwinięcie do wyjątków `include`, satisfies **AC-26**
6. Testy komponentów i E2E, w tym test, że producent nie widzi grup, satisfies **AC-28**

## Consequences

**Positive**:
- Zakładanie kolejnych projektów jest szybsze z każdym zapisanym zestawem.
- Gotowe grupy nie wymagają utrzymania, bo liczą się same.

**Negative / tradeoffs**:
- Zdjęcie stanu znaczy, że nowy producent dodany do grupy po założeniu projektu nie zobaczy go. Admin musi dodać go wyjątkiem ręcznie.
- Gotowa grupa po rodzinie to szeroki zasięg (każdy z opublikowanym produktem), bez filtra jakości. Węższy wybór to własna grupa.

**Neutral**:
- Jeden ekran więcej w panelu admina i dwie tabele o niskim wolumenie.

## Follow-up

- [ ] Gotowe grupy po kraju dostawy albo po statusie weryfikacji, jeśli rodzina okaże się za szeroka.
- [ ] Zapamiętywanie ostatnio użytych grup w formularzu, jeśli admin będzie zakładał wiele podobnych projektów.
