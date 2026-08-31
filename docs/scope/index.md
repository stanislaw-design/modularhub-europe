# Scope: ModularHub Europe

Platforma prowadząca transgraniczny zakup domu modułowego w Europie: łączy klienta kupującego dom i producenta, który go wytwarza, w jedną kontrolowaną ścieżkę od wyceny do odbioru.

Zakres jest podzielony na dwie epiki, po jednej na etap budowy.

## At a glance

| Epika | Zakres | Status |
|---|---|---|
| [Prototyp (Facade)](prototyp.md) | Klikalny interfejs klienta i producenta na danych przykładowych, na realnym brandingu | 11 done, 5 in progress, 1 planned, 1 dropped (18 funkcji) |
| [Produkcja](produkcja.md) | Prawdziwe zaplecze (konta, baza danych, płatności, pliki, silnik zgodności, transport) i utwardzenie produkcyjne (RODO, bezpieczeństwo, wydajność, SEO, CI/CD) | 0 done, 1 in progress, 18 planned |

## Legend

**Status**: `planned` do `in progress` do `done`, plus `existing` (sprzed workflow) i `dropped` (wypadło z zakresu, zachowane dla historii). Pełna definicja cyklu życia funkcji jest w Legend każdej epiki.

**Kolejność budowy**: najpierw dokończenie epiki Prototyp (fundament UI i wzorce, na których stoi Produkcja), potem epika Produkcja w swojej własnej kolejności (Foundations, potem sloty, potem utwardzenie przed startem), zapisanej w [produkcja.md](produkcja.md).
