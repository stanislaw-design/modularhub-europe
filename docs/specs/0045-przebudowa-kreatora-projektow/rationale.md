# 0045. Przebudowa kreatora projektów pod nowy model danych, rozumowanie

## Context

> ⚠️ Uwaga o przesłance: temat obejmuje pięć osobnych obszarów danych (warianty/cennik, układ pomieszczeń, dokumenty/rzuty, FAQ, logistyka/zgodność), które teoretycznie mogłyby być pięcioma osobnymi specami. Zostają w jednym, bo dzielą jeden ekran (ten sam kreator, tę samą belkę postępu, ten sam wzorzec zapisu) i jedną intencję zgłaszającego ("wszystkie dane potrzebne nam na stronie naraz"), a dzielenie ich zwiększyłoby tylko koszt koordynacji między pięcioma budowami tego samego komponentu. Spec jest długi, ale to jedna decyzja o jednym ekranie, nie pięć niezależnych.

Kreator projektów producenta (`components/producent/ProjectWizard.tsx` i jego kroki) pochodzi ze spec 0008 (sześć sztywnych kroków, wyłącznie dom, dane w `localStorage`, żadnego backendu). Od tamtej pory model danych przeszedł dwie duże przebudowy, których kreator nigdy w pełni nie doganiał:

- Spec 0022 wprowadził `family` + podkategorie + `technicalSpecs` jsonb (kreator to obsłużył, jeden dynamiczny krok techniczny zamiast trzech).
- Spec 0041 wprowadził `product_variant` (osobna cena i zakres na standard wykończenia), `cost_line_item`, `product_timeline_stage`, oraz pola logistyczne na `product` (gwarancja montażu, opis serwisu, wymiary transportowe, wymagania żurawia, minimalna szerokość działki). Follow-up tego spec wprost odkładał "formularz producenta do samodzielnego wpisywania wariantów" na moment, w którym model danych okaże się wystarczający. Ten moment jest teraz.
- Spec 0042 dodał `roomLayout` i `faq` jako jsonb na `product`, oba z otwartym Follow-upem "walidacja Zod jest odłożona".

W efekcie: dane wszystkich tych trzech speców istnieją w bazie i renderują się na karcie projektu klienta (`app/[locale]/(customer)/project/[id]/page.tsx`), ale nie ma żadnej ścieżki producenta, żeby je wpisać. Jedyny sposób dziś to ręczny insert przez Neon MCP (używany do danych startowych Budman/Cocomodule), co nie skaluje się na kolejnych producentów.

Dodatkowo: `certifications` i `simplifiedPermitEligible`, które karta projektu klienta umie wyrenderować, istnieją tylko w typie `Project` używanym przez dane przykładowe (`lib/data/fixtures/projects.ts`), nie w prawdziwym schemacie `product`. To nie tylko brak UI w kreatorze, to brak kolumny w bazie dla `simplifiedPermitEligible`, i brak jakiegokolwiek per projektowego odpowiednika dla certyfikatów (tylko producent poziomowy `producer_capacity_profile.certifications` istnieje).

Kreator dziś zarządza całym stanem formularza ręcznym `useState<ProjectDraft>` bez `react-hook-form` (nie jest zainstalowany). Rozbudowa o warianty (każdy z własną listą pozycji kosztowych i etapów harmonogramu), układ pomieszczeń i FAQ oznacza kilka poziomów zagnieżdżonych, dynamicznych tablic naraz, znacznie więcej niż dzisiejsza jedna płaska lista zdjęć.

## Options considered

### Opcja 1: Rozbudowa istniejącego kreatora (fix in place), z migracją stanu na react-hook-form

Zostaje ta sama architektura ekranu (kroki, belka postępu, zapis na "Dalej" przez akcje serwerowe), dodane trzy nowe kroki i rozbudowany krok cenowy. Przy tej okazji cały stan formularza (w tym istniejące kroki) przechodzi z ręcznego `useState` na `react-hook-form` + `useFieldArray`, żeby nowe i stare listy dzieliły jeden wzorzec.

**Zalety**:
- Producent uczy się jednego, znanego już interfejsu (ta sama belka postępu, te sama konwencja "Dalej"/"Wstecz"), tylko z nowymi krokami.
- Najmniejsze ryzyko migracji danych: żadna istniejąca tabela nie zmienia znaczenia, tylko dostaje nowe, nullable kolumny i nowe ścieżki zapisu.
- `useFieldArray` jest zaprojektowany właśnie do tego przypadku (dodawanie/usuwanie/reorder wierszy tablicowych) i eliminuje klasę błędów związanych z ręcznym zarządzaniem kluczami tablic w React.

**Wady**:
- Migracja stanu na `react-hook-form` dotyka też kroków, które dziś działają bez zarzutu (podstawowe, techniczne), co jest realnym ryzykiem regresji niezwiązanym wprost z nowymi danymi.
- Kreator rośnie do 8 kroków; dłuższa ścieżka, nawet jeśli każdy krok jest prostszy.

### Opcja 2: Przepisanie od zera równolegle (strangler), stary kreator zostaje aż nowy jest gotowy

Nowy komponent od podstaw, z `react-hook-form` od pierwszej linii kodu, budowany równolegle pod osobną flagą, przełączenie ruchu po potwierdzeniu, że nowy działa.

**Zalety**:
- Czysta architektura od dnia pierwszego, bez kompromisów wynikających z istniejącego kodu.
- Zero ryzyka regresji w produkcyjnym kreatorze w trakcie budowy nowego.

**Wady**:
- Dużo więcej pracy na start: cały ekran (8 kroków) budowany od zera, zamiast rozszerzenia 5 istniejących.
- Tymczasowa duplikacja dwóch kreatorów w kodzie, dodatkowa złożoność na czas przejścia, nieproporcjonalna do wielkości tej zmiany (rozszerzenie ekranu, nie zamiana fundamentu).

### Opcja 3: Rozbudowa istniejącego kreatora, ale bez migracji na react-hook-form

Te same trzy nowe kroki, ale nowe listy zarządzane ręcznym `useState` (tablice + funkcje pomocnicze), tak jak dzisiejsza lista zdjęć, zamiast wprowadzać nową zależność.

**Zalety**:
- Zero nowej zależności npm, zero ryzyka w już działających krokach.
- Najmniejszy diff względem dzisiejszego kodu.

**Wady**:
- Zagnieżdżone, dynamiczne listy (warianty → pozycje kosztowe + etapy harmonogramu) ręcznym `useState` to dużo powtarzalnego, błędogennego kodu (klucze tablic, aktualizacje przez indeks w głęboko zagnieżdżonej strukturze) właśnie tam, gdzie najbardziej zależy na poprawności.
- Dwa wzorce zarządzania stanem (nowy `react-hook-form` gdzie indziej w projekcie kontra ręczny tu) byłyby bardziej konsystentne niż jeden ręczny wzorzec rozciągnięty na coraz większą złożoność, ale to nie był wybrany kierunek.

## Rationale

Opcja 1 wygrywa, bo ten kreator już żyje na prawdziwym zapleczu (spec 0016) i jest używany przez realnych producentów: przepisanie od zera (Opcja 2) kosztowałoby więcej niż uzasadnia zakres tej zmiany (rozszerzenie ekranu o nowe kroki, nie zamiana fundamentu), a ryzyko tymczasowej duplikacji dwóch kreatorów przewyższa ryzyko migracji stanu w miejscu.

Migracja na `react-hook-form` (odrzucając Opcję 3, zostanie przy ręcznym `useState`) jest uzasadniona samą skalą nowych list: warianty z zagnieżdżonymi pozycjami kosztowymi i etapami harmonogramu to dwa poziomy zagnieżdżenia tablic naraz, dokładnie ten przypadek, do którego `useFieldArray` został zaprojektowany. Ręczne rozciągnięcie dzisiejszego wzorca (`lib/producer-project-draft.ts` z funkcjami pomocniczymi add/remove/update na tablicach) do tej skali zwiększyłoby powierzchnię błędów bez korzyści.

Rozważono też wariant pośredni: `react-hook-form` tylko dla nowych, zagnieżdżonych kroków (warianty, pomieszczenia, FAQ), stare kroki zostają na `useState` do osobnej, późniejszej zmiany. Odrzucony, bo `ProjectWizard` i `ProductEditWizard` współdzielą jeden komponent z jednym drzewem stanu; dwa równoległe wzorce zarządzania stanem w jednym formularzu (część pól kontrolowana przez `useForm`, część przez ręczny `useState` obok) to więcej przypadkowej złożoności niż jedna, konsystentna migracja, mimo większego jednorazowego ryzyka regresji. To ryzyko jest świadomie przyjęte i mitygowane w Build planie (charakteryzujące testy przed migracją, krok po kroku, nie jednym cięciem), nie zignorowane.

Decyzja o współdzielonych certyfikatach (`producer_capacity_profile.certifications` zamiast nowego pola per projekt) i o checkboxie `simplifiedPermitEligible` bez logiki wyliczającej trzyma się tej samej zasady co reszta projektu (`AGENTS.md`: żaden prawdziwy silnik zgodności na tym etapie) i unika duplikacji danych, które i tak żyją na poziomie producenta.

## Uzupełnienie 2026-09-18: audyt formularza producenta

`docs/research/2026-09-18-audyt-formularza-producenta.md` przeglądnął ten sam ekran (kod i próba w przeglądarce) już po tym, jak milestone 3 tego spec (warianty i cennik) trafił na produkcję. Poniżej rozumowanie za decyzjami, które nie były oczywiste albo które cofają już wdrożony fragment.

### Dlaczego aktualizacja tego spec, nie nowy równoległy kreator

Audyt wprost rekomenduje to w swoim ostatnim akapicie: "warto realizować w ramach domknięcia specyfikacji 0045 (...), bez dokładania kolejnego równoległego kreatora." Ten spec już jest jedynym miejscem opisującym ten ekran, jest w budowie (feature 38, `docs/scope/produkcja.md`), a znaczna część audytu (jeden krok ceny i zakresu, prawdziwe rzuty, nawigacja bez utraty danych) pokrywa się z ACs już tu istniejącymi albo bezpośrednio je koryguje. Osobny spec dla tego samego ekranu i tej samej decyzji (fix in place vs przepisanie) powielałby Context i Options considered bez realnej różnicy.

### Dlaczego wszystkie P0 i P1, nie tylko trzy pierwsze zmiany audytu

Inżynier wybrał najszerszy zakres (P0 + P1) świadomie, kosztem większego, jednorazowego Build planu (10 nowych zadań, 15–24). Zdecydowano nie dzielić tego na kolejne, osobne rundy /architect, bo prawie wszystkie P1 dotyczą tych samych plików co P0 (np. `ProjectWizardVariantsStep`, `ProjectWizardProgress`) — rozdzielanie ich na osobne specyfikacje zwiększyłoby koszt koordynacji bardziej niż rozmiar samego Build planu uzasadnia. Pozycje P2 (kopiowanie projektu, import katalogu, formalny audyt dotykowych celów, integracja z obsługą) zostają odłożone, bo każda dotyka innego obszaru (współdzielone szablony producenta, parser plików zewnętrznych, proces wsparcia) i żadna nie blokuje ani nie upraszcza P0/P1.

### Dlaczego zniesienie unikalności standardu (AC-19) mimo już wdrożonego kodu

Milestone 3 wdrożył `product_variant_product_standard_unique` i `createVariant`'s duplicate-standard check jako świadomą decyzję tego samego spec (patrz oryginalna tabela Feature surface API: "duplikat standardu dla tego produktu (409)"). Audyt pokazuje realny przypadek biznesowy, którego ten model nie obsługuje: dwóch różnych pakietów handlowych (BASIC, ALL-IN) będących tym samym standardem wykonania. Kolumna `variant_label` istniała od początku właśnie z myślą o takim rozróżnieniu (komentarz w `lib/db/schema.ts`: "opcjonalna własna nazwa marketingowa producenta"), ale nigdy nie dostała pola w UI i jest dziś aktywnie zerowana przy każdym zapisie — to nie nowa potrzeba, to niedokończona wcześniejsza decyzja. Alternatywa (zostawić ograniczenie, kazać producentowi zakładać dwa osobne "produkty" dla dwóch pakietów tego samego domu) rozbiłaby jeden dom na dwie karty klienta, co jest gorsze niż koszt odkręcenia jednego indeksu i przepisania kilku testów. Stąd decyzja inżyniera: zrobić to teraz, nie odkładać.

### Dlaczego autosave zamiast osobnych przycisków zapisu (AC-18)

`ProjectWizard`/`ProductEditWizard` już zapisują cały formularz do bazy na każde "Dalej" (`persistProgress`, `publish: false`) — to nie jest dziś czysto lokalny stan czekający na później. Problem, który zgłasza audyt, jest węższy: `ProjectWizardVariantsStep` ma własny, dodatkowy przycisk "Zapisz wariant" wywołujący osobną akcję (`updateVariant`) niezależnie od głównego zapisu kroku; edycja pola w karcie wariantu bez kliknięcia tego przycisku i bez kliknięcia "Dalej" (np. bezpośrednie kliknięcie "Wstecz") może więc nadal zgubić zmianę, dokładnie tak jak audyt opisuje, tylko dziś już na prawdziwej bazie, nie w lokalnym stanie jak w czasach audytu jego źródeł. Rozwiązaniem nie jest zdjęcie zapisu wariantu do wspólnego `persistProgress` (warianty/pozycje kosztowe/etapy mają własne akcje serwerowe z osobną weryfikacją własności, AC-12, i własne transakcje przy klonowaniu) — tylko uczynienie tego zapisu automatycznym i domykanym przy nawigacji, zamiast zależnym od pamiętania o dodatkowym przycisku.

### Dlaczego przełożenie kolejności kroków (AC-20) i relaksacja pól technicznych (AC-21) razem

Audyt łączy te dwie zmiany w jedną rekomendację: trudne dane techniczne dziś stoją przed ceną i zdjęciami, i są w całości wymagane. Samo przełożenie kolejności bez złagodzenia wymogu nie rozwiązałoby problemu producenta bez pełnej dokumentacji — nadal utknąłby na tym samym kroku, tylko później w formularzu. Stąd oba trafiają do tej samej rundy: kolejność (AC-20) daje producentowi szybką satysfakcję (widzi swoją ofertę z ceną i zdjęciami wcześnie), a złagodzenie (AC-21) daje mu realną możliwość dokończenia zadania bez dokumentu, którego nie ma. Techniczne domknięcie jest tańsze niż się wydaje: walidacja `draft` (partial) już istnieje w `lib/product-technical-specs.ts`, dziś po prostu nieużywana przy zapisie kroku kreatora — to nie nowy schemat, tylko przełączenie, którego schematu kreator używa.

### Dlaczego rodzina-warunkowe pola podstawowe (AC-24) trafiają tu, nie do osobnego spec

`bedrooms`/`floorAreaM2` są dziś polami płaskimimi na `ProjectDraft` (nie częścią `technicalSpecs` per rodzina), renderowanymi bezwarunkowo w `ProjectWizardBasicInfoStep` niezależnie od tego, jak dobrze `technicalSpecs` już obsługuje rodzinę produktu (spec 0022, 0039). To błąd w jednym komponencie, nie brakująca decyzja modelu danych — nie wymaga nowego schematu ani migracji, tylko warunku w JSX i etykiety. Rozmiar poprawki (jedno zadanie, zadanie 20) nie uzasadnia osobnego spec.

### Poprawki po cross checku (inny model, ta sama data)

Niezależny przegląd tej aktualizacji na innym modelu znalazł kilka realnych problemów, wszystkie poprawione bezpośrednio w `index.md`:

- **AC-19, retarget zamiast usunięcia**: pierwsza wersja tego spec po prostu usuwała indeks unikalności standardu, co otwierało realną lukę — dwa warianty tego samego standardu z tą samą (pustą) nazwą własną, np. przez podwójny klik albo ponowienie autosave, nic by nie złapało. Poprawka: nowy indeks na (standard, nazwa własna) zamiast braku indeksu w ogóle. To też znacząco zmniejsza ryzyko migracji z Migration plan (nie ma stanu pośredniego bez żadnej ochrony).
- **AC-4 kontra tryb wyceny indywidualnej**: pierwsza wersja AC-4 wymagała ceny min na domyślnym wariancie bezwarunkowo, co razem z nowym AC-27 (tryb "Wycena indywidualna") tworzyło sprzeczność — wybór tego trybu byłby niepublikowalny na zawsze. Poprawka: AC-4 akceptuje też jawny tryb wyceny indywidualnej jako spełnienie warunku ceny, zgodnie z tym, co audyt wprost mówi w sekcji "Co ma być wymagane".
- **Brakujący P0: ostrzeżenie przy edycji opublikowanego produktu**: audyt zgłasza to jako blokujący problem (P0), pierwsza wersja tej aktualizacji go pominęła. Pełne oddzielenie szkicu od danych publicznych dla już opublikowanego produktu to osobna, większa decyzja (wersjonowanie produktu) — audyt sam to zastrzega ("wolno wdrożyć dopiero wraz z faktyczną gwarancją"). Zamiast cichego pominięcia: nowy AC-36 daje minimalną, uczciwą wersję (jawne ostrzeżenie), a Follow-up nazywa wprost, że realne oddzielenie zostaje odłożone, nie zapomniane.
- **AC-18, tańszy mechanizm**: pierwsza wersja wymagała pełnego debounce na każdym polu z osobnym stanem per pole. Audytowy przypadek utraty danych dotyczy węziej: "Wstecz" bez kliknięcia przycisku zapisu karty. Flush przy nawigacji (ten sam zapis co dzisiejszy przycisk, tylko wywołany automatycznie) rozwiązuje dokładnie ten przypadek przy mniejszym koszcie (mniej zapisów do bazy, brak nowej maszyny stanów per pole); pełny debounce zostaje dopuszczalną, nie wymaganą opcją.
- **Niespójność Build planu**: pierwsza wersja budowała układ pomieszczeń i logistykę jako osobne kroki kreatora (zadania 6, 9), a jednocześnie kazała je scalić z innymi krokami w zadaniu 17 (AC-20) — dwa zadania budowałyby ekran, który trzecie zadanie zaraz rozmontowuje. Poprawka: zadania 6 i 9 budują od razu sekcje we właściwym, docelowym kroku; zadanie 17 tylko przekłada kolejność już istniejących czterech kroków (podstawy, techniczne, zdjęcia, warianty), nie tworzy nowego podziału.
- **Reszta znalezisk** (stare "poprzedniego wariantu" w AC-2 po zniesieniu limitu trzech, brakujące P1 z audytu — nazwa formularza, zwijanie zakładek tłumaczeń, progresywne ujawnianie karty wariantu, wyjątki technologii per wariant, podział typu zdjęcia, wznowienie szkicu — cztery stany braku danych zamiast jednego, doprecyzowanie kolejności blokowania "Dalej"/"Opublikuj", kolejność usuwania z cofnięciem względem autosave, ryzyko migracji przy rozjechanym rewercie kodu/bazy) trafiły do odpowiednich AC (AC-2, AC-21, AC-32, AC-34, AC-37–AC-41) i do sekcji Migration plan > Ryzyka, zamiast zostać pominięte jako "drobne".
