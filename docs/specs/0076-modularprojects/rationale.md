# 0076. Uzasadnienie: ModularProjects

Część decyzyjna specyfikacji [0076](index.md). Czyta ją człowiek lub `/architect` przy aktualizacji, `/develop` ją pomija.

## Context

> ⚠️ Premise note: właściciel chce, żeby wpisy bloga trafiały do repozytorium (pliki w kodzie), a jednocześnie mówi o stronie, która ma "pokazywać, że platforma jest realna" i będzie rosła z kolejnymi realizacjami. Trzymanie treści w kodzie jest dobre przy jednym lub kilku wpisach, ale każda zmiana wymaga commita i wdrożenia. Dlatego warstwa danych dostaje asynchroniczne gettery od początku (reguła z `AGENTS.md`), żeby przeniesienie do bazy było później podmianą jednej funkcji, a nie przepisaniem stron. Jeśli wpisów przybędzie lub treść mają prowadzić osoby bez dostępu do repozytorium, trzeba otworzyć osobną decyzję (Follow-up).

Przetarg na duże zamówienia (od 3 domów, spec 0070) działa, ale nie ma własnej nazwy. Producent widzi go jako "Tablicę ogłoszeń" w swoim panelu, inwestor jako "Duże zamówienia" w swoim, formularz nazywa się "Zgłoś duży projekt", a maile mówią "zapytanie o duże zamówienie". Ta sama usługa ma więc cztery nazwy w zależności od tego, kto na nią patrzy i gdzie. Właściciel chce jednej nazwy, ModularProjects, widocznej po obu stronach, bez zmiany tego, jak przetarg działa.

Druga potrzeba jest marketingowa. Strona główna pokazuje dziś jedną realizację (CocoLeisure, 49 domków), zahardkodowaną w `lib/data/featured-showcase.ts` i w kluczach `FeaturedProjectShowcase` w `messages/*.json`. Nie ma strony, na której odwiedzający zobaczy więcej niż jeden projekt albo przeczyta o jednym szerzej. Właściciel dodał zdjęcia wizualizacji, rysunków konstrukcji i budowy, żeby pokazać, że to prawdziwa realizacja, i chce zrobić z tego sekcję w formie bloga o większych projektach.

Siły, które kształtują wybór: przetarg (spec 0070) jest jeszcze w budowie i ma wiele testów i tekstów, więc zmiana jego logiki jest ryzykowna i niepotrzebna; strona publiczna musi działać w czterech językach (pl, en, de, nl); zasoby zespołu są małe (jeden właściciel produktu, który sam wgrywa treść w kodzie); limit optymalizacji obrazów Vercel był już wyczerpany raz.

## Options considered

### Option 1: Nazwa jako zmiana tekstów oraz wpisy bloga w plikach TypeScript

ModularProjects zastępuje cztery dotychczasowe nazwy w panelach, menu, formularzu i mailach. Wpisy bloga są typowanymi plikami w repozytorium z tekstem w czterech językach, a zdjęcia leżą w `public/`.

**Pros**:
- Zero zmian w bazie i w logice przetargu, więc nie ma ryzyka regresji w funkcji, która jest w budowie.
- Typ `Record` na czterech językach i test integralności pilnują kompletności tłumaczeń i zdjęć.
- Statyczna strona, szybka i dobra pod SEO, bez zapytań do bazy.
- Zgodne z tym, jak właściciel chce pracować (wgrywa treść w kodzie), oraz z istniejącym wzorcem zdjęć w `public/images/success/`.

**Cons**:
- Każdy wpis i każda poprawka to wdrożenie, a edytować mogą tylko osoby z dostępem do repozytorium.
- Zdjęcia powiększają repozytorium i zużywają limit optymalizacji obrazów Vercel.
- Zmiana tekstów dotyka wielu plików i testów (panele, formularz, maile), choć mechanicznie.

### Option 2: Nazwa, tytuły projektów w bazie i edytor wpisów w panelu admina

Oprócz nazwy każdy projekt dostaje tytuł (nowa kolumna w `project_request`), a wpisy bloga są w bazie z tłumaczeniami (jak w spec 0067) i edytorem w `/internal`. Wpis może być powiązany z projektem z przetargu.

**Pros**:
- Wpisy może dodawać każdy admin, bez wdrożenia.
- Powiązanie wpisu z projektem z przetargu pozwala później pokazać "wygrany projekt" bez przepisywania.
- Zdjęcia w R2, repozytorium zostaje lekkie.

**Cons**:
- Największy zakres: migracja, edytor, upload i tłumaczenia, w czasie, gdy przetarg nie jest skończony.
- Właściciel jawnie wybrał pracę w kodzie, a tytuł projektu zmienia formularz i model danych, czego nie chciał ("nie zmiana logiki").
- Dla jednego wpisu to budowa infrastruktury wyprzedzająca potrzebę.

### Option 3: Wpisy w MDX w repozytorium

Treść jako pliki `.mdx` z metadanymi, jeden plik na język i wpis.

**Pros**:
- Pisanie akapitów i nagłówków jest wygodniejsze niż w obiektach TypeScript.
- Dobre, gdy wpisy będą długie.

**Cons**:
- Nowa zależność i konfiguracja pipeline MDX w Next.js 16, której projekt dziś nie ma.
- Kompletność czterech języków i istnienie zdjęć trzeba pilnować własnym kodem, a nie kompilatorem.
- Cztery pliki na wpis zamiast jednego.

### Option 4: Tylko nazwa, bez bloga

Zmiana tekstów w panelach i formularzu, a realizacja CocoLeisure zostaje zahardkodowana na stronie głównej.

**Pros**:
- Najmniejsza zmiana.

**Cons**:
- Nie odpowiada na drugą potrzebę właściciela (strona, która pokazuje realność platformy i rośnie z kolejnymi projektami).
- Kafel na stronie głównej pozostaje danymi zaszytymi w jednym pliku z jedną realizacją.

## Rationale

Wybrana jest Option 1, bo najlepiej pasuje do sił z kontekstu. Przetarg z 0070 jest w budowie, więc jedyna bezpieczna zmiana to zmiana tekstów, która nie dotyka bazy ani logiki (właściciel powiedział to wprost). Publiczna strona ma mieć cztery języki i kilka wpisów, a właściciel sam wgrywa treść w kodzie, więc pliki TypeScript z typem `Record` dają kompletność tłumaczeń sprawdzaną przez kompilator, bez nowej zależności jak w opcji 3 i bez infrastruktury z opcji 2.

Opcja 2 jest lepsza dopiero wtedy, gdy wpisy mają prowadzić osoby spoza zespołu technicznego albo gdy realizacji będzie wiele. Dziś to potrzeba hipotetyczna, a jej koszt (migracja, edytor, uploady, tłumaczenia) jest realny. Asynchroniczne gettery z AC-8 trzymają drzwi otwarte: przejście do bazy to podmiana ciała getterów, tak jak robimy to z resztą warstwy danych (strangler, `lib/data/AGENTS.md`).

Przy nazwie wybraliśmy etykietę, a nie nowe pole tytułu, bo właściciel odpowiedział, że zmiana ma dotyczyć samej nazwy ("nie zmiana logiki albo czegoś tylko to"). Dlatego też adresy tras i klucze w `messages/*.json` zostają, co sprawia, że zmiana jest odwracalna i nie psuje linków w wysłanych mailach ani zakładek. Adresy tras zostają angielskie, jak reszta projektu, a publiczny adres `/modularprojects` nie koliduje z istniejącym `project/` (karta produktu).

Wcześniejsza koncepcja powiązania wpisu bloga z projektem z przetargu odpada, bo wpisy w plikach nie mają klucza obcego do bazy. CocoLeisure mógł zresztą powstać poza platformą, a automatyczne generowanie wpisów z przetargów groziłoby ujawnieniem danych inwestora i producenta bez ich zgody.
