# Scope: ModularHub Europe

Platforma prowadząca transgraniczny zakup domu modułowego w Europie: łączy klienta kupującego dom i producenta, który go wytwarza, w jedną kontrolowaną ścieżkę od wyceny do odbioru.

Zakres jest podzielony na dwie epiki, po jednej na etap budowy.

## At a glance

| Epika | Zakres | Status |
|---|---|---|
| [Prototyp (Facade)](prototyp.md) | Klikalny interfejs klienta i producenta na danych przykładowych, na realnym brandingu | 11 done, 5 in progress, 1 planned, 1 dropped (18 funkcji) |
| [Produkcja](produkcja.md) | Prawdziwe zaplecze (konta, baza danych, płatności, pliki, silnik zgodności, transport, rodziny produktów) i utwardzenie produkcyjne (RODO, bezpieczeństwo, wydajność, SEO, CI/CD) | 4 done, 6 in progress, 16 planned (26 funkcji) |

## Legend

**Status**: `planned` do `in progress` do `done`, plus `existing` (sprzed workflow) i `dropped` (wypadło z zakresu, zachowane dla historii). Pełna definicja cyklu życia funkcji jest w Legend każdej epiki.

**Kolejność budowy**: najpierw dokończenie epiki Prototyp (fundament UI i wzorce, na których stoi Produkcja), potem epika Produkcja w swojej własnej kolejności (Foundations, potem sloty, potem utwardzenie przed startem), zapisanej w [produkcja.md](produkcja.md). Wewnątrz Produkcji priorytet jest dziś (2026-09-02) na stronie klienta: po fundamentach idzie najpierw dane producenta na realnym zapleczu zasiane ręcznie plus dopracowanie klienta (Slice 1–2), a dopiero potem dawna kolejność automatyzacji strony producenta (oferty, płatności, pliki, zgodność, transport, realizacja, powiadomienia, panel admina, weryfikacja firmy), bo pierwsze oferty i tak robi ręcznie zamawiający, a to klienta oglądają dziś inwestorzy.
