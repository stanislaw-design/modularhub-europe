# 0083. Strona /commercial-displays i formularz zapytania o ekrany komercyjne

**Date**: 2026-11-10
**Status**: Accepted

## Summary

Strona sprzedażowa `/[locale]/commercial-displays` przedstawia ekrany komercyjne partnera MirageVision (wyświetlacze IP66 22 do 86 cali, pakiety digital signage, ściany LED) dla hoteli, gastronomii, basenów i osiedli. Wszystkie przyciski "Zapytaj o wycenę" prowadzą do formularza na tej stronie, który zapisuje zgłoszenie zainteresowania i powiadamia zespół. Zgłoszenie nie zakłada konta ani sprawy doradczej: to prosty zapis do kontaktu handlowego, bez cen (wycena jest indywidualna).

## Requirements

**User stories**:
- Jako firma szukająca ekranów na zewnątrz chcę zobaczyć, co jest dostępne i do czego się nadaje, a potem zostawić zapytanie bez zakładania konta.
- Jako zespół ModularHub chcę dostać mail z pełnymi danymi zgłoszenia i móc odpowiedzieć klientowi jednym kliknięciem.

**Acceptance criteria**:
- **AC-1**: `/[locale]/commercial-displays` renderuje się w czterech językach (pl, en, de, nl), ma jeden `h1`, kanoniczny adres z `hreflang` i wpis w sitemapie. Nie pokazuje żadnych cen.
- **AC-2**: Przyciski "Zapytaj o wycenę" prowadzą do sekcji `#zapytanie` z formularzem na tej samej stronie. Strona nie używa linku `mailto:`.
- **AC-3**: Formularz zbiera: imię i nazwisko, e mail, kraj (jeden z sześciu rynków), zastosowanie, czego dotyczy zapytanie (co najmniej jedna z czterech opcji) i opis projektu (10 do 2000 znaków) jako pola wymagane oraz firmę, telefon i liczbę ekranów (1 do 500) jako opcjonalne. Błędy pokazuje przy polach, a po wysłaniu ekran potwierdzenia z adresem klienta.
- **AC-4**: Akcja serwerowa `submitCommercialDisplayInquiry` waliduje te same reguły schematem Zod (`lib/commercial-display-inquiry-specs.ts`), niezależnie od walidacji w przeglądarce, i zapisuje wiersz w tabeli `commercial_display_inquiry` ze statusem `new`, znormalizowanym e mailem (małe litery) i językiem strony.
- **AC-5**: Ukryte pole `website` jest pułapką na boty. Gdy jest wypełnione, akcja odpowiada jak przy sukcesie, ale niczego nie zapisuje ani nie wysyła.
- **AC-6**: Z jednego adresu e mail mogą przyjść najwyżej 3 zgłoszenia na dobę. Kolejne dostają kod błędu `rate_limit`, a formularz pokazuje przetłumaczony komunikat i zachowuje wpisane dane.
- **AC-7**: Po zapisie zespół dostaje mail po polsku na `OPERATIONS_NOTIFY_EMAIL` (zapas: `ADVISOR_NOTIFY_EMAIL`) ze wszystkimi danymi zgłoszenia, a odpowiedź (`replyTo`) trafia do klienta. Błąd wysyłki nie cofa zapisu i nie zamienia sukcesu w błąd dla klienta; trafia do Sentry. Bez adresu zespołu mail jest pomijany.
- **AC-8**: Film produktowy ma napisy w czterech językach (WebVTT), a domyślnie włączona jest ścieżka zgodna z językiem strony. Plik wideo jest w formatach MP4 i WebM.
- **AC-9**: Migracja `0071` tylko dodaje tabelę `commercial_display_inquiry` (z CHECK-ami na wartości listowe) i indeks `(contact_email, created_at)`. Nie zmienia istniejących tabel.

## Decisions

- Osobna, prosta tabela zamiast sprawy doradczej (spec 0048) albo zapytania wielu domów (spec 0070): te przepływy są ciężkie (konto gościa, kanały, przetarg producentów) i dotyczą domów. Tu wystarczy zapis kontaktu handlowego.
- Wartości listowe są tekstem z CHECK-ami, nie enumami Postgresa, żeby dodanie opcji nie wymagało migracji typu.
- Mail do zespołu ma pełne dane klienta (inaczej niż alerty dużych zamówień), bo zgłoszenie nie ma jeszcze ekranu w panelu admina.

## Deferred

- Ekran zgłoszeń w panelu admina (zmiana statusu `new` / `contacted` / `closed`, notatki).
- Mail z potwierdzeniem do klienta w jego języku.
- Mocniejsza ochrona przed spamem (CAPTCHA), jeśli pułapka i limit okażą się za słabe.
- Powiązanie zgłoszenia z kontem klienta, gdy e mail zgadza się z kontem.
- Katalog produktów komercyjnych w bazie (dziś treść jest na stronie statyczna).
