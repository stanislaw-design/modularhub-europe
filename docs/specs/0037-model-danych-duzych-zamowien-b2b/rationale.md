# 0037. Model danych dla dużych zamówień B2B, uzasadnienie

## Context

Zamawiający chce dodać obsługę dużych zamówień (10 i więcej domów naraz), inspirowaną klientami typu Lammert: inwestorami i deweloperami planującymi resorty, parki wakacyjne albo osiedla. Dzisiejsza platforma (spec 0018, `inquiry`/`inquiryItem`/`offer`/`offerItem`) zakłada zalogowanego klienta wybierającego 1 do 3 konkretnych, opublikowanych produktów do porównania, każdy z osobną wyceną. To nie pasuje do dwóch nowych potrzeb: (1) inwestor, który nie chce przeglądać katalogu, tylko opisać swój projekt i wysłać go od razu do wszystkich sprawdzonych, dużych producentów; (2) producent, który dziś nie ma żadnego sposobu opisania swojej realnej zdolności produkcyjnej (ile domów miesięcznie, w jakim czasie przy jakim wolumenie, jakie certyfikaty), a to właśnie ta zdolność decyduje, czy nadaje się do dużego projektu.

Zamawiający świadomie podzielił tę dużą inicjatywę (kafle na stronie głównej, formularz inwestora, profil zdolności producenta, odznaka "Verified Volume Manufacturer", inteligentne dopasowywanie "Request for Project") na osobne decyzje, wybierając model danych jako pierwszą, fundamentalną decyzję, bo każda z pozostałych części czyta albo zapisuje dokładnie te dane.

Kluczowe siły w grze: (a) niska bariera wejścia dla inwestora, brak logowania przy pierwszym kontakcie, bo to typowy lead B2B, który chce szybkości; (b) reużycie istniejących konwencji tej bazy (Neon Postgres, Drizzle, wzorzec jsonb plus Zod dla pól o zmiennym kształcie, wzorzec CHECK dla reguł krzyżowych) zamiast wprowadzania nowego stylu; (c) świadome odłożenie tego, co jeszcze nie jest rozstrzygnięte (silnik dopasowania, wygląd odznaki, integracja z realizacją zamówienia), żeby ten spec zostawał skupiony na jednej decyzji.

## Options considered

### Option 1: Rozszerzyć dzisiejszy `inquiry`/`offer` o pola B2B

Dodać do `inquiry` opcjonalne pola (liczba sztuk, typ projektu, itd.) i uczynić `inquiryItem`/logowanie opcjonalnym dla dużych zamówień, zamiast tworzyć nowe tabele.

**Pros**:
- Mniej nowych tabel i enumów, mniej kodu migracji.
- Jedna, wspólna lista zapytań dla obsługi wewnętrznej zamiast kilku źródeł.

**Cons**:
- `inquiry` ma dziś twarde założenia (klient zalogowany, `inquiryItem` wskazuje na konkretny, istniejący produkt), które musiałyby stać się warunkowe niemal w każdym polu, zamazując dzisiejsze, proste inwarianty zwykłego zapytania klienta detalicznego.
- Zapytanie o duży, wolny projekt (bez konkretnego produktu) i zapytanie o konkretny produkt w dużej ilości to dwa różne kształty danych; wciśnięcie obu w jedną tabelę wymagałoby wielu pól `nullable` używanych tylko czasami, co utrudnia czytanie i utrzymanie kodu.

### Option 2: Dwie nowe, osobne encje (`project_request`, `bulk_product_inquiry`) plus wspólna wycena i profil producenta (wybrana)

Nowe tabele obok dzisiejszego `inquiry`/`offer`, zgodnie z wyraźną decyzją zamawiającego o dwóch osobnych ścieżkach (przeglądanie konkretnego producenta kontra wolne zapytanie).

**Pros**:
- Każda tabela ma jasny, prosty kształt bez pól warunkowych zależnych od ścieżki.
- Nie dotyka żadnej istniejącej tabeli poza lekkim, w pełni wstecznie zgodnym rozszerzeniem `client` (trzy nowe, nullable pola).
- Zgadza się z wyraźnym wyborem zamawiającego (dwie osobne ścieżki, nie jedna scalona).

**Cons**:
- Więcej nowych tabel i enumów do utrzymania niż w Opcji 1.
- Wspólna tabela `project_quote` z dwoma opcjonalnymi kluczami obcymi (dokładnie jeden ustawiony) jest mniej klasyczna niż jedna, prosta relacja jeden do wielu, choć ten sam wzorzec (CHECK na wariant) już istnieje w tej bazie (`product_family_subcategory_match`, spec 0022).

### Option 3: Dwie w pełni osobne tabele wyceny (`project_quote`, `bulk_product_quote`) zamiast jednej współdzielonej

Ta sama struktura co Opcja 2, ale bez współdzielenia tabeli wyceny między dwiema ścieżkami.

**Pros**:
- Każda tabela wyceny ma dokładnie jeden klucz obcy, bez CHECK na wariant, najbardziej klasyczny kształt relacyjny.
- Łatwiejsze do zrozumienia dla kogoś czytającego schemat pierwszy raz, bez potrzeby rozumienia wzorca "dokładnie jedno z dwóch pól".

**Cons**:
- Duplikuje identyczny kształt (cena za sztukę, cena całkowita, termin, notatka, status) w dwóch tabelach zamiast jednej; każda przyszła zmiana pola wyceny (na przykład nowy status albo nowe pole ceny) musiałaby być zrobiona dwa razy.
- Kod odczytujący "wszystkie wyceny tego producenta" musiałby złączyć dwie tabele zamiast jednej.

Zamawiający wybrał Opcję 2 przy potwierdzaniu modelu danych w rozmowie projektowej.

## Rationale

Opcja 2 wygrywa, bo trzyma się dwóch sił z Context: dwie osobne, wyraźnie różne ścieżki wejścia (potwierdzone wprost przez zamawiającego) dostają dwie osobne, proste tabele, a wspólny kształt odpowiedzi producenta (cena, termin, notatka) zostaje jeden, reużywalny wzorzec zamiast duplikowanego kodu. Kompromis (CHECK na dokładnie jedno z dwóch pól w `project_quote`) jest świadomie zaakceptowany, bo ta sama technika już istnieje w bazie (`product_family_subcategory_match`, spec 0022) i jest tańsza w utrzymaniu niż duplikacja całej tabeli wyceny (Opcja 3) przy pierwszej zmianie pola.

Reużycie istniejących enumów (`offerStatusEnum` dla `project_quote.status`, `producerVerificationStatusEnum` dla `volumeVerificationStatus`, `completionStandardEnum` dla obsługiwanych standardów) zamiast tworzenia nowych o identycznym kształcie wynika wprost z konwencji tej bazy (`lib/db/AGENTS.md`, reużycie ponad duplikację) i zmniejsza liczbę nowych typów Postgres o trzy.

Decyzja, żeby konto klienta powstawało dopiero przy pierwszym prawdziwym logowaniu (nie od razu przy wysłaniu zapytania), zachowuje istniejący inwariant ze spec 0023 bez zmian (`users`/`client` powstają dopiero przy potwierdzonym logowaniu), zamiast rozluźniać regułę używaną w całej aplikacji tylko dla jednej nowej funkcji.

## References

_Poziom: źródła plus zweryfikowane linki (research przed większymi decyzjami, ustalona preferencja zamawiającego w epice Produkcja)._

**Project sources** (weryfikowalne w repozytorium):
- `AGENTS.md`, katalog główny: stack (Next.js 16, Neon Postgres, Drizzle), zasada asynchronicznych funkcji dostępu do danych.
- `lib/db/AGENTS.md`: wzorzec jsonb plus Zod dla pól o zmiennym kształcie, wzorzec CHECK dla reguł krzyżowych, częściowy unikalny indeks, `db.batch` zamiast `db.transaction`.
- Spec [0018](../0018-prawdziwy-model-danych/index.md) ("Prawdziwy model danych"): konwencja migawki danych kontaktowych na `inquiry` (reużyta tu na `project_request`/`bulk_product_inquiry`), wzorzec "jedna aktywna oferta na parę" (`offer_active_per_inquiry_producer`, reużyty jako wzorzec dla `project_quote`).
- Spec [0022](../0022-rodziny-produktow-i-kategorie/index.md) ("Rodziny produktów i kategorie"): wzorzec jsonb walidowany schematem Zod (`technicalSpecs`), wzorzec CHECK na warianty (`product_family_subcategory_match`), reużyty tu dla `project_quote`'s dwóch opcjonalnych kluczy.
- Spec [0023](../0023-klient-na-realnym-zapleczu/index.md) ("Klient na realnym zapleczu"): inwariant, że `users`/`client` powstają dopiero przy pierwszym udanym logowaniu (link magiczny), świadomie zachowany bez zmian w tej decyzji.
- Spec [0031](../0031-realne-przechowywanie-plikow/index.md) ("Realne przechowywanie plików"): kształt tabeli `document` (`ownerUserId` wymagane), powód dla którego załączniki na anonimowym zgłoszeniu zostały świadomie odłożone w tej decyzji.

**Practices & standards**:
- RODO, art. 6 ust. 1 lit. b (przetwarzanie niezbędne do podjęcia działań na żądanie osoby, której dane dotyczą, przed zawarciem umowy): podstawa prawna dla zbierania danych kontaktowych bez logowania, bo to sama osoba inicjuje kontakt prosząc o wycenę.
- Wzorzec modułowej architektury RFQ (request for quote): osobne encje żądania i odpowiedzi, wspólny mechanizm wyceny, znany z platform B2B e commerce.
- Odznaka "zweryfikowany dostawca" jako sygnał zaufania oceniany ręcznie/administracyjnie w danym momencie, nie automatyczna gwarancja (wzorzec znany z dużych platform B2B, np. Alibaba Verified Supplier), zastosowany tu jako `volumeVerificationStatus` zatwierdzany przez administratora zamiast auto obliczany z samych zgłoszonych liczb.

**Links** (zweryfikowane podczas rozmowy projektowej):
- RFQ, model danych i architektura: [HCL Commerce, model danych RFQ](https://help.hcl-software.com/commerce/9.1.0/database/refs/rdb_datamodel_rfq.html)
- RFQ, przykład modułowej architektury (żądanie, portal dostawcy, ocena, log audytu): [Virto Commerce, zarządzanie ofertami B2B](https://virtocommerce.com/blog/b2b-ecommerce-quote-management)
- Odznaka zweryfikowanego dostawcy jako audyt w danym momencie, nie gwarancja: [Alibaba, Verified Supplier](https://seller.alibaba.com/businessblogs/what-is-a-verified-supplier-on-alibabacom-px001z0dr)
- RODO a zbieranie danych kontaktowych B2B przed zawarciem umowy: [Octoboard, RODO w generowaniu leadów B2B](https://www.octoboard.com/support/lead-generation-gdpr-faq)
