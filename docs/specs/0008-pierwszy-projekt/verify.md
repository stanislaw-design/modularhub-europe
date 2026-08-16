# Verify: Pierwszy projekt (producent) · spec 0008 · updated 2026-08-16

_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Wejdź na `/pl/producent/projekt?nip=1234567890&countries=PL&technology=szkielet-drewniany` → kreator pierwszego projektu renderuje się od razu, z jednowierszowym paskiem potwierdzenia rejestracji (NIP, kraje, technologia) na górze, bez ekranu `RegistrationConfirmation` → AC-1
- [ ] Wejdź na `/pl/producent/projekt` bez parametrów → redirect do `/pl/producent` → AC-1
- [ ] Na kreatorze widać sześć kroków w stałej kolejności (Informacje podstawowe, Konstrukcja i izolacja, Instalacje i okna, Odporność, Pliki, Podsumowanie) ze wskaźnikiem postępu pokazującym wszystkie kroki i aktualny krok → AC-2
- [ ] Kliknięcie „Dalej” na niekompletnym kroku nie przechodzi dalej i pokazuje walidację inline; po uzupełnieniu pól „Dalej” przechodzi do kolejnego kroku; „Wstecz” i klik już ukończonego kroku na wskaźniku cofają bez utraty danych; nieosiągnięte kroki nie są klikalne → AC-3
- [ ] Krok „Informacje podstawowe” zawiera nazwę, metraż, liczbę sypialni, kraj produkcji (lista z `getCountries()`) i opis, wszystkie wymagane → AC-4
- [ ] Kroki „Konstrukcja i izolacja”, „Instalacje i okna”, „Odporność” zawierają razem osiem pól technicznych, każde z podpowiedzią pod polem, wszystkie wymagane → AC-5
- [ ] Krok „Pliki” ma dwa niezależne obszary (Rzuty, Zdjęcia), każdy przyjmuje wiele plików, pokazuje listę wybranych (nazwa, rozmiar) z usuwaniem pojedynczego pliku, żaden plik nie jest faktycznie zapisany, a pusty obszar blokuje „Dalej” → AC-6
- [ ] Krok „Podsumowanie” pokazuje tylko do odczytu wszystkie wpisane wartości i nazwy wybranych plików, pogrupowane według poprzednich kroków, z przyciskiem „Zapisz projekt” → AC-7
- [ ] Wypełnij kilka kroków, odśwież stronę w połowie (np. po kroku 3) → ponowne wejście na `/pl/producent/projekt` z tymi samymi parametrami rejestracji otwiera kreator na kroku 4 z zachowanymi danymi z kroków 1–3, bez pytania → AC-8
- [ ] Ręcznie ustaw uszkodzoną wartość w `localStorage` pod kluczem `producent:<nip>:projekt-szkic` (np. niepoprawny JSON) → wejście na kreator nie pokazuje błędu strony, startuje pusty od kroku 1 → AC-8
- [ ] Zarejestruj się drugim NIP-em w tej samej przeglądarce → kreator nie wznawia szkicu poprzedniego producenta → AC-8 (Key invariants)
- [ ] Wypełnij wszystkie sześć kroków i kliknij „Zapisz projekt” na Podsumowaniu → nawigacja do `/pl/producent/gotowosc-eksportowa?nazwa=<nazwa projektu>`, a zapisany stan znika z `localStorage` → AC-9
- [ ] Wejdź na `/pl/producent/gotowosc-eksportowa?nazwa=Test` → nagłówek zawiera przekazaną nazwę i informację „w przygotowaniu”; wejdź bez `nazwa` → ten sam ekran z ogólnym nagłówkiem, bez błędu → AC-10
- [ ] Sprawdź dokładnie jeden prawdziwy `<h1>` na stronie (nie per krok), logiczną kolejność fokusa w obrębie kroku, `aria-current="step"` na aktywnym kroku wskaźnika postępu, widoczny fokus (`.focus-ring`) na każdym elemencie interaktywnym → AC-11

## Commands

- [ ] `npx tsc --noEmit` → bez błędów
- [ ] `npm run lint` → bez błędów
- [ ] `npm run build` → kończy się sukcesem

## Acceptance-criteria coverage

- AC-1 … kroki 1–2 (UI/manual) · AC-2 … krok 3 · AC-3 … krok 4 · AC-4 … krok 5 · AC-5 … krok 6 · AC-6 … krok 7 · AC-7 … krok 8 · AC-8 … kroki 9–11 · AC-9 … krok 12 · AC-10 … krok 13 · AC-11 … krok 14
