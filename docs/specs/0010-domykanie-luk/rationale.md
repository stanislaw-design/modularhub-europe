# 0010. Domykanie luk (producent): rationale

## Context

Spec [0009](../0009-gotowosc-eksportowa/index.md) zbudowała mapę gotowości eksportowej: trzy kraje, każdy ze statusem, kraj warunkowy pokazuje listę konkretnych braków w akordeonie. Ta specyfikacja świadomie zostawiła wiersz warunkowy bez żadnej akcji ("Ekran nie zawiera żadnych dodatkowych akcji ani linków", AC-7), z wprost zapisanym follow-upem: "Gdy funkcja 14 (domykanie luk) dostanie własną specyfikację, doda działanie na wierszu warunkowym."

Funkcja 14 w `docs/scope/scope.md` opisuje to działanie jako wybór między dwiema drogami: samodzielne wgranie dokumentów albo zakup pakietu (makieta płatności, ten sam wzorzec co analiza działki klienta, funkcja 8). Sam opis funkcji nie rozstrzyga jednak: jak dokładnie ma wyglądać ekran wyboru, jakim kontraktem URL przekazać kraj i ewentualnie listę braków, jaka jest cena pakietu, i co dokładnie dzieje się po każdej z dwóch ścieżek. To właśnie te cztery pytania (wymienione wprost w temacie tej specyfikacji) są przedmiotem projektowania tutaj.

Kluczowa siła w grze: `lib/pricing.ts` już zawiera komentarz zostawiony przy poprzedniej funkcji, że "producer side's own paid gateway mock (function 14) reuses this constant instead of defining its own" — sugerując reużycie `PLOT_ANALYSIS_PRICE_EUR`. Druga siła: spec 0009 wprost stwierdza "Brak relacji do Project/ProjectDraft/tożsamości producenta; płaska, statyczna lista" dla mapy gotowości eksportowej, co ogranicza, jak daleko można pociągnąć trwały zapis stanu bez przebudowy istniejącego kontraktu URL (`nazwa` jest dziś jedynym parametrem tej strony).

## Options considered

### Option 1: Dwie sekcje na jednym ekranie, globalny zapis localStorage tylko dla zakupu pakietu

Nowy ekran pod `/producent/domykanie-luk?kraj=...&nazwa=...` pokazuje obie ścieżki naraz, jedna pod drugą: samodzielne wgranie (jedno pole na wszystkie braki, komunikat potwierdzenia, nic nie zapisuje) i zakup pakietu (mockowa płatność wzorem `PlotAnalysisRow`, wynik zapisuje kod kraju w jednym, globalnym kluczu localStorage, bez NIP). Mapa gotowości eksportowej odczytuje ten klucz po stronie klienta i nadpisuje wyświetlany status.

**Pros**:
- Zero zmian w kontrakcie URL mapy gotowości eksportowej poza jednym nowym, opcjonalnym parametrem (`kraj` na nowym ekranie, nie na mapie) — `nazwa` zostaje jedynym parametrem mapy, zgodnie z tym, co spec 0009 ustaliła.
- Reużywa cenę z `lib/pricing.ts` dokładnie tak, jak zasugerował komentarz zostawiony przy poprzedniej funkcji.
- Daje przekonujące demo (mapa faktycznie się zmienia po zakupie) bez otwierania na nowo decyzji o tożsamości producenta na mapie.

**Cons**:
- Zapis jest globalny, nie per producent: w tej samej przeglądarce różni producenci "dzielą" ten sam rozwiązany kraj. Nie do zaakceptowania dla prawdziwego produktu, ale spójne z tym, że mapa i tak nie ma dziś żadnej relacji do tożsamości producenta.
- Asymetria (tylko zakup zmienia status, upload nie) wymaga jasnego uzasadnienia w UI, inaczej może wyglądać na niedopracowaną.

### Option 2: Ten sam ekran, ale bez żadnego trwałego zapisu (stan czysto efemeryczny)

Zamiast localStorage, wynik zakupu pakietu żyje tylko na ekranie wyniku, dokładnie jak faza "result" w `PlotAnalysisRow` (która też niczego nie zapisuje trwale, tylko pokazuje wynik dla bieżącej sesji). Powrót na mapę zawsze pokazuje ten sam, niezmienny mock.

**Pros**:
- Najmniej kodu: brak nowego modułu `lib/gap-closure.ts`, brak ryzyka związanego z odczytem/zapisem localStorage w dwóch różnych komponentach.
- Idealnie spójne z tym, że `getExportReadiness()` jest i pozostaje "tym samym kanonicznym mockiem za każdym razem" (spec 0009, Key invariants) — nic nigdzie nie nadpisuje tej zasady, nawet lokalnie.

**Cons**:
- Demo jest mniej przekonujące: producent "kupuje pakiet", ale wracając na mapę widzi dokładnie ten sam warunkowy status, co wygląda jak płatność bez efektu.
- Nie realizuje wprost intencji z opisu funkcji 14 w scope.md, która sugeruje realny efekt zakupu pakietu (nawet jeśli mockowy).

### Option 3: Pełne dowiązanie do NIP producenta przez cały łańcuch URL

Rozszerzenie kontraktu URL `/gotowosc-eksportowa` (i nawigacji z `ProjectWizard`, funkcja 12) o `nip`, żeby zapis rozwiązanych krajów mógł być kluczowany per producent, dokładnie jak `lib/producer-project-draft.ts` kluczuje szkic projektu.

**Pros**:
- Najbardziej poprawne semantycznie: różni producenci w tej samej przeglądarce nie dzielą stanu.
- Spójne z istniejącym wzorcem zapisu (draft projektu jest już kluczowany po NIP).

**Cons**:
- Wymaga zmiany kontraktu URL i nawigacji w trzech miejscach (`ProjectWizard`, `gotowosc-eksportowa/page.tsx`, mapa) zamiast jednego nowego ekranu — wykracza poza zakres funkcji 14.
- Koliduje wprost z jawnym stwierdzeniem w spec 0009 ("Brak relacji do tożsamości producenta"), które trzeba by świadomie unieważnić bez osobnej decyzji o tym w tej specyfikacji.

## Rationale

Option 1 wygrywa, bo domyka funkcję 14 dokładnie w jej deklarowanym zakresie, bez pociągania za sobą zmian w funkcji 11/12/13, których żaden "Done when" nie wymaga. Cena decyzji Option 3 (spójność per producent) jest wyższa niż jej zysk na tym etapie: platforma i tak nie ma logowania ani rzeczywistej tożsamości producenta poza NIP przechodzącym przez URL sesyjnie, więc "poprawność" per producent jest tu pozorna. Option 2 był kuszący swoją prostotą, ale inżynier wprost wybrał, żeby zakup pakietu miał widoczny efekt na mapie — to demo ma pokazywać, że płatność coś załatwia, inaczej traci sens jako element ścieżki producenta.

Asymetria między dwiema ścieżkami (tylko zakup zmienia status) nie jest przeoczeniem: to świadome odwzorowanie różnicy między "obiecuję, że wyślę dokumenty" (brak weryfikacji, więc brak efektu) i "kupuję gotowy pakiet" (usługa z deklarowanym rezultatem, więc mockowy rezultat od razu widoczny).
