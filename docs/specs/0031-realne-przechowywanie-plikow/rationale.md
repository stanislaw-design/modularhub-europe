# 0031. Realne przechowywanie plików — uzasadnienie

## Context

> ⚠️ Uwaga wstępna: temat zaczął się szerzej niż to, co ostatecznie zaprojektowano. W rozmowie projektowej padła propozycja "podłącz wszystko od razu" (kreator producenta, domykanie luk, weryfikacja firmy, załączniki do ofert), co po sprawdzeniu okazało się w istocie kilkoma osobnymi decyzjami: (1) prawdziwe przechowywanie plików jako warstwa techniczna, (2) migracja ekranów producenta z `localStorage` na prawdziwe zaplecze (to już świadomie odłożona decyzja z 2026-09-07, dotyka funkcji 12/14/18/19), (3) załączniki do odpowiedzi na zapytania (funkcja 11 "Realna oferta i jej przyjęcie", jeszcze bez spec, wymaga nowej wartości `document_purpose`). Ten spec skupia się wyłącznie na (1) plus dwóch wąskich, realnych konsumentach (migracja istniejących zdjęć, narzędzie administratora idąc naprzód), a (2) i (3) zostają jawnie odłożone do własnych przyszłych sesji `/architect`, patrz Follow-up w `index.md`.

Spec 0017 wybrał Cloudflare R2 (kubełek UE) jako magazyn plików, ale nigdy nie założył kubełka ani nie napisał kodu klienta. Spec 0018 zaprojektował tabelę `document` (klucz R2, typ MIME, rozmiar, cel, flaga okładki, kolejność, właściciel, powiązania z produktem/producentem/etapem zamówienia) dokładnie pod ten cel, z komentarzem wprost mówiącym, że ma zastąpić dzisiejszą kolumnę tekstową `product.coverImageUrl`. Żadna z tych dwóch decyzji nie została jeszcze wykonana: nie ma kodu klienta R2, nie ma pakietu SDK w `package.json`, tabela `document` jest pusta.

**Pierwszy szkic tego spec błędnie zakładał, że dzisiejsze produkty pokazują losowe zdjęcia z picsum.photos.** Cross check (druga para oczu, inny model) sprawdził to bezpośrednio w bazie danych i repozytorium, i pokazał, że jest odwrotnie. Zapytanie do prawdziwej bazy Neon (`SELECT p.name, pr.name, p.cover_image_url FROM product p JOIN producer pr ON pr.id = p.producer_id`) zwróciło 65 wierszy, żaden nie wskazuje na picsum.photos: wszystkie 65 realnych produktów u czterech realnych producentów (Budman House, Castor Domy Drewniane, Cocomodule, Steel House) mają `coverImageUrl` wskazujący na prawdziwe pliki zdjęć pod `/images/houses/<producent>/<produkt>/...`, fizycznie leżące w `public/images/houses/` tego repozytorium. Każdy folder produktu ma kilka ponumerowanych zdjęć (np. `01_wizualizacja_tylna.jpg`, `02_wizualizacja_front_1.jpg`, `03_wizualizacja_front_2.jpg`), a dziesiątki produktów mają też wypełnione pole `technicalSpecs._extraImageUrls` wskazujące na te dodatkowe zdjęcia jako galerię — ten "prowizoryczny most" (spec 0020) jest więc żywy, produkcyjny mechanizm używany dziś przez realne dane, nie martwy, prawie pusty scaffold, jak zakładał pierwszy szkic.

`picsum.photos` faktycznie występuje w repozytorium, ale wyłącznie w `lib/data/fixtures/projects.ts` (warstwa mockowa epiki Prototyp, kompletnie niezwiązana z realnymi 65 produktami) i w danych testowych — nigdy w realnej bazie danych.

Prawdziwy problem jest więc inny, niż pierwszy szkic zakładał: te 65 produktów ma już prawdziwe, wielozdjęciowe galerie, ale żyją jako pliki wgrane na sztywno do repozytorium kodu, dopisywane ręcznym commitem (widać to w ostatnich commitach: "wgranie projektów steelhouse", "dodanie producenta castro + dodanie podkreślenia") razem z ręcznym wstawieniem `coverImageUrl`/`_extraImageUrls` przez Neon MCP (potwierdzają to pliki `_docs/*-import-manifest.json`). To działa dziś, ale ma realne koszty: (a) stoi w sprzeczności z architekturą wybraną w spec 0017 (R2, nie własne repozytorium kodu, jako magazyn plików); (b) każde nowe zdjęcie lub nowy producent wymaga commitu kodu i wdrożenia, ręcznej, żmudnej pracy dla czegoś, co powinno być rutynową operacją treści; (c) historia binarnych obrazów rośnie w repozytorium git bez końca; (d) folder `public/images/houses/golden-hour/` zawiera już zdjęcia dla trzech kolejnych producentów (Baltyk Modular, Karpaty Haus, Modulor Systems), którzy jeszcze nie trafili do realnej bazy (wciąż fixture) — ten sam, ręczny wzorzec się powtórzy, gdy zostaną dodani.

Komponent `FileUpload` (`components/ui/FileUpload.tsx`), używany przez `ProjectWizardFilesStep` i `GapClosureUploadSection` po stronie producenta, dziś tylko trzyma `{name, sizeBytes}` w stanie React, nic nigdy nie zapisuje, nawet do `localStorage`. To świadomy mock epiki Prototyp; ekrany producenta zostają na `localStorage` do własnej, przyszłej decyzji (funkcje 12/14/18/19), więc ta decyzja ich nie dotyka.

RODO jest tu realną siłą: dane osobowe i pliki muszą zostać w Unii Europejskiej (już zaadresowane wyborem regionu w spec 0017), a spec 0017 zostawił otwarty, nierozwiązany problem osieroconych plików w R2 po skasowaniu wiersza w bazie. Ta decyzja adresuje go najlepiej jak może dla swojego zakresu (patrz Rationale niżej za dokładny opis, co jest w pełni rozwiązane, a co jest zaakceptowanym, rzadkim ryzykiem).

## Options considered

### Option 1: Wąski zakres, admin only narzędzie plus jednorazowy skrypt migracyjny

Zbudować warstwę R2 (klient, wgrywanie, usuwanie, walidacja) i podłączyć ją do dwóch konsumentów: jednorazowego skryptu migrującego dzisiejsze 65 realnych produktów z `public/` do R2, oraz nowego ekranu wewnętrznego dla administratora do zarządzania zdjęciami idąc naprzód (nowe produkty, podmiany, poprawki). Ekrany producenta zostają nietknięte.

**Pros**:
- Realny, kompletny, sprawdzalny koniec do końca wątek (zgodnie z podejściem Tracer Bullet epiki), bez dotykania decyzji, które epika świadomie odłożyła (funkcje 12/14/18/19).
- Rozwiązuje problem u źródła: przestaje wymagać commitu kodu dla rutynowej operacji treści (dodanie/podmiana zdjęcia).
- Skrypt migracyjny, nie ręczne przeklikanie 65 produktów przez UI, dopasowany do realnej skali.

**Cons**:
- Warstwa magazynu plików zostaje na razie wykorzystana tylko przez wąski zestaw konsumentów; producent i tak nie może dziś wgrać własnego zdjęcia przez swój panel.
- Skrypt migracyjny to dodatkowy, jednorazowy kawałek kodu do napisania i ostrożnego uruchomienia na realnej bazie, nie tylko UI.

### Option 2: Podłączyć też ekrany producenta (kreator, domykanie luk, weryfikacja)

Oprócz warstwy R2, narzędzia admina i skryptu migracyjnego, podłączyć też realne wgrywanie plików w `ProjectWizardFilesStep`, `GapClosureUploadSection` i `CompanyVerificationView`, zostawiając resztę danych tych ekranów na `localStorage`.

**Pros**:
- Producent od razu może wgrać prawdziwy plik, nie tylko administrator.
- Więcej wartości `document_purpose` z tabeli 0018 od razu w użyciu (`product_floor_plan`, `company_verification`).

**Cons**:
- Wymaga zdecydowania, jak wiązać dokument z encją, która jeszcze nie istnieje naprawdę (produkt z kreatora nie ma prawdziwego `product.id`, dopóki nie zostanie zapisany do bazy, co jest świadomie odłożoną decyzją funkcji 12/18) — to nie jest już tylko decyzja o magazynie plików, tylko częściowe rozstrzygnięcie przyszłej migracji tych ekranów z `localStorage`.
- Poszerza zakres tej jednej sesji `/architect` o trzy dodatkowe ekrany producenta naraz, każdy z własnymi pytaniami (limit plików, komunikat błędu, UX), zamiast jednego, dobrze przemyślanego wątku.

### Option 3: Tylko infrastruktura, bez podłączonego konsumenta

Zbudować warstwę R2 i CRUD dokumentów bez żadnego skryptu ani ekranu; dowieść działania przez bezpośrednie wywołania (testy, skrypt jednorazowy poza tym spec).

**Pros**:
- Najmniejszy możliwy zakres tej sesji.

**Cons**:
- Nie spełnia kryterium "Done when" z `docs/scope/produkcja.md` funkcja 13 ("wgrany plik jest trwale zapisany, dostępny do pobrania po odświeżeniu strony"), bo nic nie jest naprawdę przeniesione ani wgrane przez żaden zbudowany mechanizm.
- Zostawia dzisiejszy, realny problem (zdjęcia produktów uwięzione w repozytorium kodu, wymagające commitu na każdą zmianę) nierozwiązany mimo zbudowanej infrastruktury.

## Rationale

Option 1 dostarcza dokładnie to, co funkcja 13 obiecuje ("Done when: wgrany plik jest trwale zapisany, dostępny do pobrania po odświeżeniu strony i w kolejnej sesji"), bez po cichu rozstrzygania decyzji, które epika już świadomie odłożyła (migracja ekranów producenta z `localStorage`, decyzja zamawiającego z 2026-09-07). Inżynier w rozmowie projektowej najpierw wskazał szerszy zakres ("wgraj wszystko"), potem doprecyzował na "zdjęcia istniejących projektów i producentów", a na koniec, gdy napięcie między "podłącz panel producenta do odpowiedzi na zapytania" a "funkcja 11 nie ma jeszcze spec" zostało nazwane wprost, wybrał węższy zakres (infrastruktura plus zdjęcia katalogu). To dokładnie podejście Tracer Bullet zapisane w `AGENTS.md` dla epiki Produkcja: jeden prawdziwy, kompletny wątek przez wszystkie warstwy, zanim pogrubi się kolejne ekrany. Odkrycie z cross checku (65 produktów z prawdziwymi zdjęciami w repozytorium, nie 6 z placeholderami) zmieniło szczegóły wykonania (skrypt migracyjny zamiast ręcznego wgrywania przez administratora), ale nie zmieniło wyboru między opcjami: Option 1 był i zostaje właściwym zakresem.

Zdjęcia producentów (`producer_photo`) i załączniki do ofert są świadomie poza tym spec: `lib/data/producers.ts` jest dziś w całości mockiem (w przeciwieństwie do `lib/data/projects.ts`, już realnego), więc prawdziwe zdjęcie producenta nie miałoby dziś gdzie się realnie wyświetlić bez dodatkowej migracji panelu producenta na realne dane, a załączniki do ofert wymagają najpierw zaprojektowania samej realnej oferty (funkcja 11).

Trzy mniejsze decyzje techniczne, poprawione po cross checku, są też tu odnotowane:
- Częściowy unikalny indeks na "jedna okładka na produkt" musi filtrować po `purpose = 'product_photo'`, nie tylko po `is_cover`, inaczej zdjęcie i przyszły rzut techniczny (`product_floor_plan`) tego samego produktu mogłyby rywalizować o ten sam indeks. Pierwszy szkic tego pominął.
- "Wgraj do R2 przed wstawieniem wiersza" zapobiega tylko jednemu kierunkowi osierocenia (wiersz bez pliku), nie drugiemu (plik bez wiersza, gdy wstawienie do bazy zawiedzie po udanym wgraniu). Pierwszy szkic twierdził, że problem jest "rozwiązany"; poprawiona wersja nazywa to wprost zaakceptowanym, rzadkim ryzykiem przy tej skali (narzędzie administratora, nie masowy ruch klientów), sprzątanym ręcznie, nie automatycznym mechanizmem uzgadniania.
- `@aws-sdk/s3-request-presigner` z pierwszego szkicu jest zbędny: wgrywanie idzie przez serwer (nie podpisane URL do przeglądarki), a serwowanie przez publiczną domenę R2 (nie podpisane URL do pobierania), więc sam `@aws-sdk/client-s3` wystarcza.
