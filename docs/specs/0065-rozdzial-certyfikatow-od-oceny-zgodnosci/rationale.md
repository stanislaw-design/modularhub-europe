# 0065. Rozdział certyfikatów producenta od oceny zgodności projektu: rationale

**Date**: 2026-10-03

## Context

> ⚠️ Premise note: w platformie "Zgodność z Bbl" jest pokazywana jak certyfikat, z tą samą odznaką co prawdziwy dokument. Bbl (Besluit bouwwerken leefomgeving, holenderskie przepisy budowlane) jest zbiorem wymagań, a nie certyfikatem. W praktyce pojawiają się dwa różne instrumenty: typegoedkeuring dla konceptu domu (powiązany z Erkende Kwaliteitsverklaring, EKV, którą producent może posiadać jako dokument) oraz ocena projektu przez niezależnego kwaliteitsborgera w ramach Wet kwaliteitsborging voor het bouwen (Wkb). Zakres obowiązku kwaliteitsborgera zależy od kategorii budynku, i to trzeba potwierdzić z prawnikiem. Niezależnie od tego katalog nie może z góry gwarantować zgodności konkretnego projektu. Właściwa rama to więc dwa osobne pojęcia: certyfikat firmy i ocena projektu, a nie jeden wpis zgodności.

**Co jest dziś w systemie.** `producer_capacity_profile.certifications` to płaski jsonb `string[]` (`lib/db/schema.ts`, walidowany w `lib/producer-capacity-profile-specs.ts`). Dla Budman House zasiano ręcznie wpis "Zgodność z Bbl (holenderskie przepisy budowlane)" (spec 0038, zadanie 11). `applyCertifications()` (`lib/data/projects.ts`) kopiuje tę listę na każdy projekt producenta. `ProjectCertifications.tsx` i `VerifiedManufacturerProjectCard.tsx` pokazują ją identycznie jak prawdziwy certyfikat, z odznaką potwierdzenia. Wpis nie mówi, czy to dokument wydany przez stronę trzecią, czy deklaracja producenta, i nie ma zastrzeżenia.

**Co jest już w systemie i działa.** Ekran zgodności prawnej (Compliance Engine, `lib/data/fixtures/eligibility.ts`) ocenia każdy projekt osobno dla każdego kraju: status `approved`, `conditional` albo `blocked`, powód, i globalne zastrzeżenie w UI ("wstępna, orientacyjna weryfikacja, nie stanowi porady prawnej"). To jest wzorzec, którego brakuje wpisowi Bbl. Wada: fixture kluczuje projekty fikcyjnymi identyfikatorami (np. `prj-budman-familia-90`), a realne produkty w bazie mają UUID. Ekran zgodności nie czyta więc dziś danych z bazy.

**Stan prawny i danych Budmana.** Budman ma `volumeVerificationStatus = approved` (zdolność wolumenowa, zasiana ręcznie w spec 0038), a `producer.verificationStatus = not_submitted` (nigdy nie przeszedł weryfikacji firmy). Te dwie odznaki są niezależne w bazie, a UI tego nie komunikuje. Spec 0038 wprost zapisał, że dane zdolności Budmana wymagają potwierdzenia z jego zespołem.

**Zakres wybrany przez inżyniera.** Inżynier wybrał przeprojektowanie całego systemu odznak zaufania, a nie tylko poprawkę etykiety. Ocena zgodności ma żyć w bazie, z reużyciem wzorca eligibility. Odznaki firmy i zdolności mają zostać niezależne z trzema jasnymi etykietami. Certyfikat firmy ma stan potwierdzenia ustawiany przez administratora. Dowód w postaci pliku nie wchodzi w ten etap, bo to zakres funkcji 19.

**Czego nie robimy.** Nie projektujemy procesu uploadu i weryfikacji dokumentów firmy (funkcja 19). Nie przenosimy całego Compliance Engine do bazy (funkcja 14). Nie dodajemy certyfikatów per model (dziś wszystkie dane są na poziomie firmy).

**Konsekwencja niezrobienia tego.** Inwestor widzi "Zgodność z Bbl" z odznaką potwierdzenia dla każdego modelu Budmana, a w bazie nie ma nic, co by to uzasadniało. Dla inwestora to wygląda na gwarancję zgodności projektu, a nią nie jest.

## Options considered

### Option 1: Rozdział w modelu danych, potwierdzanie przez administratora (wybrana)

Nowa tabela certyfikatów firmy i nowa tabela ocen projektów w bazie, każdy wpis z flagą `self_reported` albo `platform_confirmed`, ustawianą tylko przez administratora. Trzy niezależne etykiety w UI.

**Pros**:
- Usuwa źródło problemu, a nie tylko jego objaw.
- Ocena projektu jest powiązana z realnym produktem i może być prawdziwie per projekt.
- Stan potwierdzenia jest jawny, więc deklaracja nigdy nie wygląda jak dokument.

**Cons**:
- Dwie nowe tabele, dwa zestawy akcji, dwa miejsca w panelach.
- Dwuetapowa migracja, bo stara kolumna jest czytana przez działający kod.
- Wymaga ręcznej pracy administratora przy każdym potwierdzeniu.

### Option 2: Tylko poprawka etykiety i zastrzeżenia

Zostawić płaski `string[]`, zmienić wygląd (inna ikona, dopisek "deklaracja"), bez zmiany modelu danych.

**Pros**:
- Najmniej kodu i migracji, można zrobić w jednym przebiegu.
- Widoczna od razu poprawa dla inwestora.

**Cons**:
- Źródło pozostaje: dane producenta nadal rozlewają się na każdy projekt bez rozróżnienia.
- Nic nie odróżnia wpisu potwierdzonego od deklaracji w bazie, więc każdy kolejny wpis wymaga kolejnej poprawki wyglądu.
- Ocena zgodności per projekt nadal nie ma miejsca w bazie.

### Option 3: Osobny, szeroki system zaufania z przepływem dokumentów

Zaprojektować od razu cały proces: upload dokumentów, weryfikacja przez administratora, odznaki, oceny, wszystko w jednym `/architect`.

**Pros**:
- Jedno, kompletne rozwiązanie zamiast kilku kroków.
- Dowód w postaci pliku od początku.

**Cons**:
- Dubluje zakres funkcji 19 (weryfikacja firmy), która ma już swój przyszły `/architect`.
- Znacznie większy zakres, niż potrzebny, żeby usunąć konkretny błąd, który inwestor widzi dziś.
- Wymaga decyzji o dokumentach i przechowywaniu, których jeszcze nie ma (funkcja 19).

## Rationale

Wybrano Option 1, bo źródło problemu to to, że jeden płaski wpis łączy dwa różne pojęcia: certyfikat firmy i ocenę projektu. Option 2 zostawia to źródło i odkłada problem na kolejne poprawki wyglądu. Option 3 rozwiązuje też rzeczy, które należą do funkcji 19, i wymaga dokumentów, których jeszcze nie ma.

Ocena projektu w bazie (a nie w fixture) wynika z tego, że Bbl Budmana już tam jest i ma być powiązany z realnym produktem. Reużycie statusów `approved`, `conditional` i `blocked` oraz zastrzeżenia z eligibility zapewnia, że inwestor widzi ten sam język we wszystkich miejscach, w których platforma coś ocenia.

Potwierdzenie przez administratora (a nie przez producenta) wynika z doświadczenia z tym wpisem: deklaracja została zapisana jako potwierdzona bez żadnego sprawdzenia. Producent sam ustawiający status odtworzyłby ten błąd. Wzorzec jest ten sam co dla `volumeVerificationStatus` (`setProducerVolumeVerification`, spec 0037), więc nie wymyślamy nowego mechanizmu.

Blokada optymistyczna (kolumna `version`) i reset potwierdzenia przy każdej zmianie nazwy chronią przed sytuacją, w której administrator potwierdza coś, czego producent przed chwilą zmienił.

Krytyczny przegląd drugim modelem przed akceptacją zgłosił: FK `SET NULL` łamiący CHECK (zmieniono na RESTRICT), brak triggera audytu na nowych tabelach, brak sposobu dodania oceny przez admina, zapis `certifications` w starym formularzu i utratę wpisów innych producentów przy backfillu (zmieniono na pełny backfill), oraz niespójny opis migracji. Wszystkie punkty są w specu. Zakres prawny zastrzeżenia do potwierdzenia z prawnikiem (patrz Follow-up). To tani mechanizm w porównaniu z kosztem błędnego potwierdzenia.

**Odstępstwo od odpowiedzi inżyniera, do ratyfikacji.** Inżynier wybrał przeniesienie wpisu Bbl Budmana jako ocenę dla NL. Ocena wymaga werdyktu dla konkretnego projektu. Wpis był deklaracją ogólną dla całego producenta, bez werdyktu dla żadnego modelu. Przeniesienie go na 13 ocen tworzyłoby statusy, których producent nigdy nie podał, czyli dokładnie ten błąd, który spec naprawia. Dlatego wpis trafia jako certyfikat firmy `self_reported`, a ocen dla Budmana nie ma, dopóki jego zespół nie poda werdyktów. Jeśli inżynier chce jednak wpis jako ocenę, trzeba najpierw dostać od Budmana werdykt dla każdego modelu.
