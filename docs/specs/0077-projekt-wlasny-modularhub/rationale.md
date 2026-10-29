# 0077 Uzasadnienie: projekt własny ModularHub

## Context

> ⚠️ Premise note: ten temat obejmuje cztery niezależne decyzje (projekt własny z wariantami, grupy producentów, język maili producenta, konta administratora). Każdą dałoby się zbudować osobno, więc spec jest parasolem z czterema częściami. Część D (konta admina) dodaje też ryzyko: im więcej osób z dostępem do panelu, tym bardziej brakuje dwuskładnikowego logowania (funkcja 54), którego jeszcze nie ma. Spec idzie dalej z tym ryzykiem opisanym jawnie, a funkcję 54 stawia jako pierwszy Follow-up.

Przetarg na duże zamówienia (spec 0070) zakłada klienta zewnętrznego: zapytanie składa inwestor, producenci odpowiadają ofertami, ModularHub publikuje podsumowanie, klient wybiera, a strony łączą się po zatwierdzeniu firmy klienta (B2B). Do tego dochodzą: limit trzech aktywnych zapytań na adres e mail, próg trzech domów w bazie, notatka o zgodzie klienta przy zapytaniu składanym przez doradcę i ukrywanie kontaktu do chwili połączenia.

ModularHub chce teraz sam być zamawiającym: zakładać projekty dla siebie, zbierać oferty od wybranych producentów (często w kilku wariantach tego samego producenta), porównywać je i przekazywać wybraną ofertę dalej poza systemem. ModularHub nie jest stroną umowy. Obecny przepływ nie pasuje: wymagałby wymyślonego klienta z fikcyjną zgodą, publikacji oferty samym sobie, zatwierdzania B2B własnej firmy, a limit trzech zapytań zablokowałby czwarty projekt. Indeks w bazie pozwala na jedną aktywną ofertę na producenta i projekt, więc kilka wariantów jest dziś niemożliwych.

Dodatkowo rola administratora istnieje w bazie, ale nigdzie w kodzie nie ma ścieżki jej nadania, więc każdy nowy admin to ręczna zmiana w bazie. Maile do producentów są na sztywno po polsku, a konta producentów nie mają zapisanego języka, co blokuje producentów z rynków DE i NL.

## Options considered

### Option 1: Projekt własny jako flaga na istniejących tabelach przetargu

Kolumna `is_platform_owned` na `project_request`, kolumna `variant_label` na `project_quote`, zmiana jednego indeksu i kilku bramek. Wspólny silnik przetargu zostaje.

**Pros**:
- Jeden zestaw ekranów, maili, przypomnień, załączników i formatu oferty.
- Zmiany w bazie są dodawaniem, więc migracja jest bezpieczna dla działającej aplikacji.
- Producent widzi znaną tablicę i znany formularz oferty.

**Cons**:
- Kilka miejsc z rozgałęzieniem "czy to projekt własny", łatwych do przeoczenia przy kolejnych zmianach.
- Wymiana indeksu ofert dotyka ścieżki klientów.

### Option 2: Osobne tabele i moduł dla projektów własnych

Nowe tabele `platform_project` i `platform_quote`, osobne akcje, ekrany i maile.

**Pros**:
- Czysta separacja, zero ryzyka regresji w przetargu klientów.
- Każdy model dopasowany do swojego przypadku (bez pól klienta).

**Cons**:
- Podwójny kod: formularz oferty, załączniki, przypomnienia, widok producenta i maile trzeba powielić lub uogólnić.
- Producent miałby dwie tablice i dwa formularze ofert.
- Znacznie większy zakres przy tym samym efekcie dla użytkownika.

### Option 3: Konto klienta "ModularHub" i istniejące zapytanie w imieniu klienta, bez zmian w kodzie

Zakładać konto klienta na adres zespołu i używać `createRequestOnBehalf` z wpisaną notatką o zgodzie.

**Pros**:
- Zero kodu, od razu.

**Cons**:
- Fikcyjna zgoda w bazie, mail "w Pana imieniu" do siebie, publikacja oferty sobie, krok B2B dla własnej firmy.
- Limit trzech zapytań zablokuje czwarty projekt.
- Nadal żadnych wariantów oferty ani grup producentów.
- Obejście, które trzeba byłoby potem cofać, gdy projekty własne urosną.

## Rationale

Opcja 1 wygrywa, bo całe "mięso" przetargu (format oferty, termin, przypomnienia, załączniki, tablica producenta, wyjątki odbiorców) jest identyczne i wystarczy zdjąć kilka bramek, które zakładają zewnętrznego klienta. Opcja 2 daje czystszy model, ale kosztuje powielenie kodu, który właśnie został dopracowany w specach 0070 i 0074, i zostawia producenta z dwiema tablicami. Opcja 3 działa od jutra, ale łamie model danych (zgoda, której nikt nie wyraził) i nie rozwiązuje wariantów, więc odpada przy pierwszym prawdziwym projekcie. Rozgałęzienia z opcji 1 są policzone (dopasowanie, kontakt na tablicy, indeks, limit, przypisanie klienta po zalogowaniu) i każde ma kryterium akceptacji oraz test.

Decyzje cząstkowe, podjęte z kontekstu (RECOMMEND):
- **Warianty jako nazwa tekstowa, do pięciu na producenta**, a nie litery A, B, C: nazwa ("stan surowy", "pod klucz") jest czytelna w tabeli porównawczej. Pięć to zabezpieczenie przed zaśmieceniem widoku (alternatywa: bez limitu, odrzucona, bo limit kosztuje jeden wyzwalacz). Limit w bazie, nie w kodzie, bo dwa równoległe zapisy mogłyby go ominąć.
- **Indeks z wyrażeniem `COALESCE(lower(btrim(variant_label)), '')`** zamiast drugiego indeksu: dla ofert klientów etykieta jest pusta, więc stara zasada działa bez zmian, a jeden indeks pokrywa oba przypadki.
- **Zdjęcie stanu odbiorców** (grupy rozwijają się do wierszy `include` raz) zamiast żywych grup: projekt, do którego już wysłano mail, nie może zmieniać odbiorców po cichu.
- **Wspólny kontakt z konfiguracji skopiowany do wiersza projektu** zamiast czytania go na żywo: późniejsza zmiana zmiennych nie zmieni tego, co producent widział w mailu.
- **Dwa kroki wyboru** (oznacz, potem zakończ i powiadom): pomyłka w oznaczeniu nie kosztuje wysłanych maili. Zakończenie jest ostateczne (alternatywa z wznowieniem odrzucona, bo oznaczałaby drugą falę maili).
- **Oznaczenie wybranej oferty nie blokuje składania kolejnych**, w odróżnieniu od wyboru klienta w spec 0070, bo admin może oznaczyć ofertę tymczasowo i dalej zbierać.
- **Odebranie roli admina jako blokada konta, nie zmiana roli ani usunięcie**: rola jest jedna na konto, a zmiana jej na klienta zostawiłaby konto bez wiersza klienta. Blokada ma już kolumny, ślad i mechanizm z producentami.
- **Zaproszenie admina przez `pending_registration`**: tabela i ścieżka `createUser` już obsługują rolę `admin` (nie ma dla niej wierszy klienta ani producenta), więc nie potrzeba nowej tabeli zaproszeń. Awans istniejącego konta klienta lub producenta odrzucony, bo rola jedna na konto zepsułaby jego dostęp.
- **Język producenta jako kolumna na `producer`**, a nie na `users`: mail dotyczy firmy, a konta członków firmy mogą mieć różne preferencje, ale wspólny język firmy jest prostszy i wystarcza (producent ma wielu członków, spec 0057).
- **Maile do zespołu zostają po polsku**: zespół jest polski, a zmiana nie przynosi nic.

Premisa użytkownika, która zmieniła kształt: jedno kliknięcie wysyła jeden mail do wszystkich, bez osobnego tekstu dla zwycięzcy. Wynik widzi zwycięzca w panelu ("Wybrana"), pozostali dostają neutralne "Wybór zakończony". To świadomie odkłada trudną część (różne wiadomości i ewentualny kontakt) do czasu, aż będzie wiadomo, jak wygląda przekazanie dalej.
