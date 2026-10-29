---
name: find-jacuzzi-producers
description: Znajduje polskich producentów jacuzzi (wanny SPA, jacuzzi ogrodowe, balie z hydromasażem; tylko producenci, nie dystrybutorzy ani montażyści) przez wyszukiwarkę, weryfikuje ich strony i wstępnie ocenia zdolność do dużej dostawy 50/100/200 sztuk na projekty. Wynik dopisuje do lokalnego pliku tmp/sauna-producers/producenci-jacuzzi.xlsx z deduplikacją po domenie. Nie czyta Facebooka, nie pisze do producentów, nie dotyka bazy ani kodu aplikacji.
allowed-tools:
  - Bash
  - WebSearch
  - WebFetch
  - Read
  - Write
---

# Find jacuzzi producers — lead generation producentów jacuzzi (PL)

Bliźniak skilla `find-sauna-producers`, ten sam przepływ i skrypt zapisu, inny produkt. Cel: lista polskich **producentów** jacuzzi, którzy mogliby zrealizować zamówienie 50, 100 lub 200 sztuk w jednym projekcie. Źródło wyłącznie wyszukiwarka i strony firm (Facebook pomijamy).

Argument (opcjonalny): liczba nowych firm (domyślnie 20) lub fraza/region.

## Kroki

1. **Wczytaj stan.** Jeśli istnieje `tmp/sauna-producers/producenci-jacuzzi.xlsx`, odczytaj domeny z kolumny Strona i ich nie powtarzaj. Jeśli brakuje `tmp/sauna-producers/node_modules/exceljs`, uruchom `npm install exceljs` w `tmp/sauna-producers/`.
2. **Szukaj kandydatów** (WebSearch, kilka zapytań równolegle): „producent jacuzzi ogrodowych", „wanny SPA producent Polska", „jacuzzi całoroczne producent", „balia z hydromasażem producent", „jacuzzi akrylowe producent", „jacuzzi dla hoteli producent", „producent jacuzzi [województwo]"; katalogi: Panorama Firm, Pkt.pl, Oferteo, wystawcy targów (Aquanale, Budma, Targi Ogrodnicze). Odrzucaj: sklepy z cudzymi markami (Intex, Lay-Z-Spa itd.), importerów, montażystów, wynajem, zagranicę, Facebook/Instagram jako „stronę". Producentów saun z jacuzzi w ofercie uwzględniaj tylko jeśli faktycznie produkują jacuzzi.
3. **Zweryfikuj każdą firmę** (WebFetch: główna, o nas, oferta, realizacje; max ~3 podstrony). Zbierz: region, kontakt, typy produktów (akryl/rotomolding/drewno, mobilne/wbudowane, liczba osób, hydromasaż), czy producent (własny zakład, formowanie, linia produkcyjna) i skalę (pracownicy, hala, liczba modeli, eksport, certyfikaty, oferta B2B/hotele/glamping/deweloperzy).
4. **Oceń 0–100** i osobno gotowość na 50/100/200 szt. Plusy: własna produkcja i formy, powtarzalne modele, eksport, zespół >10 osób, realizacje hotelowe/glampingowe, oferta B2B. Minusy: montaż z importowanych elementów, produkcja ręczna jednostkowa, jedna osoba, brak informacji o zakładzie. Niczego nie zmyślaj: braki wpisz w „Ryzyka / braki danych".
5. **Zapisz**: JSON (klucze jak `COLUMNS` w `upsert-xlsx.mjs` skilla sauna; `typy_saun` = typy produktów; `producent` = tak/nie/niepewne) w scratchpadzie, potem z katalogu głównego repo:
   `node .claude/skills/find-sauna-producers/upsert-xlsx.mjs <plik.json> producenci-jacuzzi.xlsx`
   Firm z `producent: nie` nie zapisuj.
6. **Podsumuj** po polsku: ile dodano/pominięto, top 5 z jednym zdaniem, ścieżka do pliku, uczciwie ile nie udało się zweryfikować.

## Zasady

- Tylko lokalny plik; bez Google Drive, bazy, maili, kontaktu z firmami.
- Dane kontaktowe tylko publiczne, ze strony firmy.
- Ocena jest wstępna, wymaga rozmowy z producentem; tak ją opisuj.
