---
name: find-sauna-producers
description: Znajduje polskich producentów saun (tylko producenci, nie montażyści ani dystrybutorzy) przez wyszukiwarkę, weryfikuje ich strony i wstępnie ocenia zdolność do dużej dostawy 50/100/200 saun na projekty. Wynik dopisuje do lokalnego pliku tmp/sauna-producers/producenci-saun.xlsx z deduplikacją po domenie. Nie czyta Facebooka, nie pisze do producentów, nie dotyka bazy ani kodu aplikacji.
allowed-tools:
  - Bash
  - WebSearch
  - WebFetch
  - Read
  - Write
---

# Find sauna producers — lead generation producentów saun (PL)

Cel: lista polskich **producentów** saun, którzy mogliby zrealizować zamówienie 50, 100 lub 200 saun w jednym projekcie. Źródło wyłącznie wyszukiwarka i strony firm. Facebook pomijamy (logowanie, regulamin).

Argument (opcjonalny): liczba nowych firm do znalezienia (domyślnie 20) lub fraza/region do zawężenia.

## Kroki

1. **Wczytaj stan.** Jeśli istnieje `tmp/sauna-producers/producenci-saun.xlsx`, odczytaj domeny już zapisane (kolumna Strona), żeby ich nie powtarzać. Jeśli brakuje `tmp/sauna-producers/node_modules/exceljs`, uruchom `npm install exceljs` w `tmp/sauna-producers/` (`npm init -y` jeśli brak package.json).
2. **Szukaj kandydatów** (WebSearch, kilka zapytań równolegle). Warianty: „producent saun ogrodowych", „sauny beczki producent", „sauna fińska producent Polska", „sauny modułowe producent", „sauny na wymiar producent", „domki ze saną producent", „sauny zewnętrzne cennik", „sauna producent [województwo]". Dodatkowo katalogi branżowe (Panorama Firm, Pkt.pl, Oferteo, Targi Drewno/Budma wystawcy). Odrzucaj: sklepy z cudzymi markami, montażystów, salony spa, wynajem, zagranicę, Facebook/Instagram jako „stronę".
3. **Zweryfikuj każdą firmę** (WebFetch strony głównej, o nas, oferty, realizacji; max ~3 podstrony). Zbierz: region, kontakt (email, telefon, formularz), typy saun, czy producent (własna produkcja/zakład, „produkujemy", „nasza hala") i skalę (liczba pracowników, powierzchnia hali, liczba realizacji, eksport, oferta B2B/hurt/hotele/deweloperzy).
4. **Oceń 0–100** i osobno gotowość na 50/100/200 szt. (0–100 każda). Sygnały plus: własny zakład, standaryzowane modele (powtarzalność), wiele realizacji komercyjnych (hotele, ośrodki), zespół >10 osób, eksport, oferta dla B2B. Sygnały minus: rzemieślnik jednoosobowy, tylko jednostkowe zamówienia na wymiar, brak informacji o zakładzie, mała oferta. Niczego nie zmyślaj: brak danych wpisz w „Ryzyka / braki danych" i obniż pewność oceny. Uzasadnienie 1–3 zdania z konkretami ze strony.
5. **Zapisz**: zbuduj JSON (tablica obiektów, klucze jak w `COLUMNS` w `upsert-xlsx.mjs`; `producent` = tak/nie/niepewne; `zrodlo` = zapytanie lub katalog) w pliku w scratchpadzie, potem uruchom z katalogu głównego repo:
   `node .claude/skills/find-sauna-producers/upsert-xlsx.mjs <plik.json>`
   Firmy oznaczone `producent: nie` nie zapisuj.
6. **Podsumuj** użytkownikowi po polsku: ile dodano/pominięto, top 5 wg oceny z jednym zdaniem, ścieżka do pliku.

## Zasady

- Tylko lokalny plik; bez Google Drive, bazy, maili, kontaktu z firmami.
- Dane kontaktowe tylko publiczne, ze strony firmy.
- Ocena jest wstępna, wymaga rozmowy z producentem; tak ją opisuj.
