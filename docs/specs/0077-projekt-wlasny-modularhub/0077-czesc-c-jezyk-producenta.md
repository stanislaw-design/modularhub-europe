# 0077 Część C: język komunikacji producenta

## Summary

Konto producenta dostaje pole "język komunikacji" (pl, en, de lub nl). Wszystkie maile o dużych zamówieniach do producenta wychodzą w tym języku, także te nowe z części A i istniejące zapytania klientów. Dziś te maile są na sztywno po polsku. Domyślnie wszyscy istniejący producenci zostają przy polskim, zmienia to sam producent w ustawieniach albo admin.

## Requirements

**User stories**:
- Jako producent z Niemiec lub Holandii, chcę dostawać zapytania i informacje o wyniku w moim języku, żeby nie tłumaczyć maili.
- Jako administrator, chcę ustawić język producentowi, który sam tego nie zrobi.

**Acceptance criteria**:
- **AC-29**: Tabela `producer` ma kolumnę `communication_locale` (pl, en, de, nl), domyślnie `pl`, z ograniczeniem CHECK. Producent zmienia ją na ekranie ustawień firmy w swoim panelu (spec 0074), a admin na karcie producenta w panelu admina (zapis przez `withAdminActor`). Wartość spoza czterech języków jest odrzucana.
- **AC-30**: Każdy mail o dużych zamówieniach do producenta używa tego języka: nowe zapytanie klienta, nowy projekt własny, przypomnienia o terminie (3 dni i 1 dzień), zamknięcie zapytania, neutralna informacja "nie wybrano", mail końcowy projektu własnego. Jeden pomocnik (`getProducerCommunicationLocale`) odczytuje język i jest używany przez wszystkie te funkcje w `lib/notifications/large-order-producer.ts` i w przypomnieniach. Gdy wartość jest nieprawidłowa lub brakuje producenta, używany jest `pl`. Linki w mailach prowadzą do `/{język}/...` (dziś na sztywno `/pl/...`), a daty są formatowane według tego języka (dziś `pl-PL`). Mail jest renderowany raz na język, więc odbiorców grupuje się według języka: język jest pobierany razem z listą odbiorców, nie osobnym zapytaniem na każdego producenta.
- **AC-31**: Maile do zespołu ModularHub zostają po polsku, a maile do klienta według `contact_locale` zapytania, bez zmian.
- **AC-32**: Każdy szablon maila do producenta ma prawdziwe tłumaczenia w czterech językach (nie kopię polskiego). Test zgodności z `lib/i18n/large-order-messages.test.ts` jest rozszerzony na przestrzenie nazw maili producenta i na nowe klucze z części A. Test wywołuje każdą funkcję maila dla czterech języków i sprawdza, że temat i treść są niepuste, a temat różni się między językami (porównanie samej treści jest kruche dla tekstów złożonych głównie z liczb i nazw własnych).
- **AC-33**: Migracja dodaje kolumnę z wartością domyślną, więc nie wymaga okna wdrożenia, a wszyscy istniejący producenci mają `pl`. Zmiana języka nie zmienia języka interfejsu panelu producenta (ten wynika z adresu strony).

## Decision

Patrz [index.md](index.md#decision).

## Feature design

**Data model sketch**: kolumna `producer.communication_locale` w [index.md](index.md#cross-part-contract).

**API surface**:

| Akcja lub funkcja | Kto | Wejście | Wynik | Główne błędy |
|---|---|---|---|---|
| `setProducerCommunicationLocale` | producent (własne konto) | język | ok | wartość spoza listy |
| `setProducerCommunicationLocaleAsAdmin` | admin | producerId, język | ok | brak producenta |
| `getProducerCommunicationLocale(producerId)` | wewnętrzna | producerId | język lub `pl` | brak |

**Key invariants**: język jest zawsze jednym z czterech, funkcje maili nigdy nie ustawiają języka same; wszystkie maile producenta przechodzą przez pomocnik.

**Security model**: producent zmienia tylko swoje pole (przez `producer_member`), admin dowolnego. Pole nie jest daną osobową.

**Critical test scenarios**:
- Happy path: producent ustawia `de`, dostaje mail o nowym projekcie po niemiecku, verifies **AC-29**, **AC-30**.
- Domyślnie: istniejący producent bez zmiany dostaje `pl`, verifies **AC-33**.
- Zgodność: test przestrzeni nazw dla pl, en, de, nl, verifies **AC-32**.
- Uprawnienia: producent A nie ustawi języka producenta B, verifies **AC-29**.
- Zespół: mail do zespołu nadal po polsku, verifies **AC-31**.

## Build plan

1. [x] Migracja C: kolumna `communication_locale`, CHECK, satisfies **AC-29**, **AC-33**
2. [x] Pomocnik `getProducerCommunicationLocale` i przełączenie wszystkich maili producenta dużych zamówień oraz przypomnień ze sztywnego `pl` na język z konta, satisfies **AC-30**, **AC-31**
3. [x] Brakujące tłumaczenia szablonów (en, de, nl) i rozszerzenie testu zgodności, satisfies **AC-32**
4. [x] Pole w ustawieniach firmy producenta i na karcie producenta w adminie, satisfies **AC-29**
5. [x] Testy komponentów, akcji i maili w czterech językach, satisfies **AC-29** do **AC-33**

## Consequences

**Positive**:
- Producenci z rynków DE i NL dostają zrozumiałe maile.
- Jeden pomocnik zamiast sztywnego języka w wielu funkcjach.

**Negative / tradeoffs**:
- Zakres rośnie, bo zmiana dotyczy też istniejących zapytań klientów, nie tylko projektów własnych.
- Jakość tłumaczeń maili trzeba sprawdzić (test pilnuje tylko, że nie są puste i różnią się od polskiego).

**Neutral**:
- Język komunikacji i język interfejsu panelu producenta to dwie niezależne rzeczy.

## Follow-up

- [ ] Język komunikacji ustawiany już przy rejestracji producenta (dziś pierwsza wartość to `pl`).
- [ ] Przegląd tłumaczeń maili przez osobę znającą niemiecki i holenderski przed pierwszym projektem z producentem z tych rynków.
