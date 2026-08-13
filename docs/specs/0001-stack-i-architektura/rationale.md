# 0001. Stack i architektura, uzasadnienie

## Context

ModularHub Europe zaczyna od zera: brak kodu, brak `AGENTS.md`, jedyne co istnieje to opis zakresu (`docs/scope/scope.md`), plik przepływu klienta i producenta oraz gotowy system marki (`docs/brand-guidelines-v3.md` i tokeny w `assets/tokens/brand-v3-tokens.json` i `.css`). Ten pierwszy etap ma być świadomym prototypem demonstracyjnym: żaden ekran nic trwale nie zapisuje, logowania nie ma, płatność jest makietą. Cel to szybki, przekonujący pokaz obu ścieżek (klienta kupującego dom modułowy i producenta, który go wytwarza) na realnym brandingu, żeby dało się to komuś pokazać i zebrać reakcję, zanim padnie decyzja o inwestycji w prawdziwe zaplecze.

Przyjęte podejście do budowy to Facade: najpierw pełny, klikalny interfejs na danych przykładowych, prawdziwe zaplecze podłączane ekran po ekranie w kolejnym etapie. To jest siła kształtująca tę decyzję najbardziej: wybrany stack musi pozwolić zbudować szybko szeroki, klikalny interfejs teraz, a potem dodać prawdziwą bazę danych, autoryzację, płatności, przechowywanie plików i silnik zgodności prawnej bez przepisywania frameworka, bo te warstwy są w `scope.md` oznaczone jako pełnowagowe (full weight) i realnie przyjdą wkrótce po tym etapie.

Zespół jest mały (jedna osoba albo dwie), więc decyzja unika wszystkiego, co wymaga osobnej funkcji operacyjnej (własny serwer, orkiestracja kontenerów, wiele regionów). Zgodność prawna per kraj (wymagania krajowe, gotowość eksportowa) jest tematem produktu, ale w tym etapie nie jest tematem architektury: dane o zgodności są mockowe, a ekran wprost pokazuje zastrzeżenie, że to nie jest opinia prawna. Prawdziwy silnik zgodności to osobna, odłożona decyzja (patrz sekcja Deferred w `scope.md`), nie część tego wyboru stacku.

Konsekwencja niepodjęcia tej decyzji: nie da się zacząć budować żadnego z trzynastu zaplanowanych ekranów prototypu, bo nie ma wspólnego fundamentu (routing, stylowanie, dane mockowe), na którym mogłyby stanąć.

## Options considered

### Option 1: Next.js (App Router) + TypeScript + Tailwind CSS + lokalne dane mockowe + Vercel

Next.js w wersji App Router to pełny framework Reacta: routing plikowy, komponenty serwerowe i kliencie w jednym drzewie, możliwość dodania logiki serwerowej (route handlery, server actions) w tym samym miejscu, gdzie teraz jest funkcja czytająca mocka. Stylowanie przez Tailwind skonfigurowany na bazie już gotowych tokenów marki. Hosting na Vercel, firmie stojącej za frameworkiem.

**Pros**:
- Najlepsze dopasowanie do podejścia Facade: dokładnie ten sam plik, który teraz zwraca dane mockowe, w drugim etapie zamienia się na wywołanie prawdziwego API, bez zmiany routingu ani frameworka.
- Największa społeczność i liczba gotowych wzorców w całej grupie frameworków Reacta, więc łatwiej znaleźć pomoc i ludzi znających ten stack.
- Vercel jako hosting jest zero konfiguracyjny dla Next.js (choć na plan Pro, patrz Decision, bo darmowy plan Hobby nie pozwala na użycie komercyjne).

**Cons**:
- App Router (server components, wzorce ładowania danych) ma realną krzywą uczenia się dla kogoś, kto go wcześniej nie używał.
- Najwygodniejsza ścieżka hostingu wiąże z jednym dostawcą (Vercel), choć samego Next.js da się hostować gdzie indziej.

### Option 2: React Router v7 w trybie frameworka (dawny Remix) + TypeScript + Tailwind CSS + lokalne dane mockowe + Vercel albo Netlify

React Router v7 w trybie frameworka (kontynuacja Remix, w 2026 roku w trakcie przechodzenia na nową wersję Remix 3) to również pełny framework Reacta, z mocnym wzorcem ładowania danych (loaders i actions), również gotowy na dodanie prawdziwego zaplecza w tym samym kodzie.

**Pros**:
- Wzorzec loaders/actions jest bardzo czytelny przy przechodzeniu z danych mockowych na prawdziwe API, może nawet czytelniejszy niż server actions w Next.js dla kogoś, kto woli jawne funkcje ładowania danych per trasa.
- Mniej zależny od jednego dostawcy hostingu niż Next.js, działa dobrze i na Vercel, i na Netlify.

**Cons**:
- Mniejszy ekosystem gotowych integracji i mniej osób znających ten framework niż Next.js, trudniej o pomoc i gotowe wzorce.
- React Router v7 jest stabilny i osobno rozwijany, ale ten sam zespół pracuje równolegle nad odrębną linią Remix 3; to więcej ruchu w ekosystemie do śledzenia niż przy Next.js, choć nie jest to wymuszona migracja (patrz Referencje).

### Option 3: SvelteKit + TypeScript + Tailwind CSS + lokalne dane mockowe + Vercel

SvelteKit to pełny framework, tylko w innym języku komponentów (Svelte, nie React). Też pozwala zacząć od danych mockowych i dodać prawdziwe zaplecze później w tym samym kodzie.

**Pros**:
- Lżejszy bundle wynikowy niż odpowiadająca aplikacja React, szybsze pierwsze wyświetlenie strony.
- Prostsza składnia komponentu dla kogoś zaczynającego od zera, bez bagażu Reacta.

**Cons**:
- Wymaga nauczenia się innego języka komponentów (Svelte) od podstaw; nie ma tu żadnego wcześniejszego kodu w Svelte ani zespołu, który by go znał.
- Znacznie mniejszy ekosystem gotowych komponentów i integracji niż React, mniej materiałów i mniej osób do zapytania o pomoc.

### Option 4: Vite + React, czysta aplikacja jednostronicowa (SPA), bez własnego backendu + Tailwind CSS + lokalne dane mockowe + statyczny hosting

Czysty Vite z Reactem, bez wbudowanej warstwy serwerowej. Cała aplikacja to statyczne pliki plus JavaScript działający w przeglądarce, dane mockowe wczytywane po stronie klienta.

**Pros**:
- Najprostszy i najszybszy start: brak koncepcji server components, brak rozróżnienia serwer/klient do zrozumienia na starcie.
- Najlżejszy zestaw zależności z całej czwórki.

**Cons**:
- Brak wbudowanej warstwy serwerowej oznacza, że prawdziwe zaplecze w drugim etapie musiałoby powstać osobno: albo jako gotowa platforma typu BaaS (backend jako usługa, wtedy nie trzeba pisać własnego serwisu), albo jako własny serwis backendowy. Pierwsza droga jest do przyjęcia, ale to wciąż osobna decyzja i osobny fundament dokładany do już działającej aplikacji, nie to samo miejsce w kodzie co dzisiejszy mock, więc słabiej trzyma się celu "ten sam kod, ekran po ekranie" z opisu podejścia Facade w `scope.md`.

## Rationale

Wybrano Option 1 (Next.js, App Router) głównie dlatego, że najlepiej odpowiada podejściu Facade zapisanemu w `scope.md`: potrzeba stacku, w którym dzisiejszy ekran na mocku i przyszły ekran na prawdziwych danych to ten sam plik, tylko z inną zawartością jednej funkcji dostępowej. Option 4 (czysta aplikacja jednostronicowa) trzyma się tego warunku najsłabiej: bez wbudowanej warstwy serwerowej, drugi etap wymagałby dołożenia osobnego fundamentu backendowego (własnego serwisu albo platformy typu BaaS) do już działającej aplikacji, nie w tym samym miejscu, gdzie dziś jest funkcja dostępowa do mocka.

Option 2 (React Router v7 w trybie frameworka) też spełnia warunek "ten sam kod, ekran po ekranie", i był realną alternatywą, ale mniejszy ekosystem i trwająca w 2026 roku migracja na Remix 3 (patrz Referencje) to dodatkowa niewiadoma dla małego zespołu bez wcześniejszego doświadczenia z tym frameworkiem. Option 3 (SvelteKit) wymagałby nauki nowego języka komponentów od zera bez żadnej korzyści z tego, że gdzieś w projekcie jest już kod w Svelte, co dla małego zespołu i szybkiego terminu demo jest ryzykiem bez wystarczającego zwrotu.

Najbardziej znany i najszerzej wspierany wybór (Next.js na Vercel) jest tu też najmniej ryzykowną drogą operacyjną: hosting zero konfiguracyjny, ogromna dokumentacja, i największa szansa, że każdy problem, na jaki natrafimy, ktoś już rozwiązał publicznie.

Sprawdzenie tego spec przez inny model (patrz proces w `/architect`) nie zmieniło samego wyboru frameworka, ale poprawiło cztery szczegóły w `index.md`, które inaczej stałyby się problemem dopiero przy budowaniu: grupy trasowania w nawiasach nie dodają segmentu adresu, więc dwa ekrany o tej samej nazwie u klienta i u producenta zderzyłyby się na tym samym adresie, stąd prawdziwe segmenty `/klient` i `/producent`; funkcje dostępowe do mocka muszą być asynchroniczne od początku, inaczej druga faza zmienia sygnaturę każdej z nich; darmowy plan Vercel Hobby zabrania użycia komercyjnego, a to demo ma pomóc pozyskać inwestycję, stąd plan Pro; i Tailwind trzeba przypisać do konkretnej wersji (4, konfiguracja w CSS), bo sposób podłączenia tokenów różni się między wersjami.

## References

**Project sources** (weryfikowalne w tym repozytorium):
- `docs/scope/scope.md`, sekcja Foundations punkt 1 i sekcja Deferred (podejście Facade, lista warstw świadomie odłożonych)
- `assets/tokens/brand-v3-tokens.json` i `assets/tokens/brand-v3-tokens.css` (tokeny marki, gotowe, niezależne od frameworka)

**Practices & standards**:
- Monolit jako pierwszy wybór dla małego zespołu i wczesnej fazy produktu (basis: małe zespoły zyskują najwięcej na prostocie jednego wdrażanego bloku)
- Boring technology, czyli sprawdzone narzędzia z dużą społecznością, jako wartość operacyjna, nie ograniczenie

**Links** (zweryfikowane w sieci podczas tej rozmowy):
- Porównanie Next.js, Remix/React Router, Astro i SvelteKit w 2026 roku: https://pockit.tools/blog/nextjs-vs-remix-vs-astro-vs-sveltekit-2026-comparison/
- To samo porównanie, wersja rozszerzona: https://dev.to/pockit_tools/nextjs-vs-remix-vs-astro-vs-sveltekit-in-2026-the-definitive-framework-decision-guide-lp5
- Porównanie hostingu dla aplikacji React w 2026 roku (Vercel jako domyślny wybór dla Next.js): https://pandastack.io/blog/best-react-hosting-2026
- Stan zarządzania stanem w React w 2026 roku: https://www.pkgpulse.com/blog/state-of-react-state-management-2026
- Dokumentacja Vercel MCP: https://vercel.com/docs/agent-resources/vercel-mcp
