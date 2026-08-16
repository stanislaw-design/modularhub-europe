# 0002. System projektowy i fundament UI

**Date**: 2026-08-13
**Status**: Accepted

## Summary

Ta specyfikacja ustawia wspólny fundament wizualny i danych dla wszystkich trzynastu ekranów prototypu ModularHub Europe: tłumaczy już gotowe wytyczne marki na tokeny Tailwind i skalę typografii, buduje zestaw komponentów bazowych z prawdziwą obsługą klawiatury i fokusa, oraz przygotowuje typowane dane mockowe (projekty, kraje, dopuszczalność) razem z pustymi segmentami trasy dla ścieżki klienta i producenta. Po tej specyfikacji każdy kolejny ekran dostaje gotowe klocki zamiast wymyślać je od nowa.

## Structure

- [0002-tokeny-i-typografia.md](0002-tokeny-i-typografia.md): rozszerza Tailwind `@theme` w `app/globals.css` o skalę typografii, siatkę i kontener z `docs/brand-guidelines-v3.md`, ustala ładowanie czcionek, i zapisuje `docs/design.md` jako dokument źródłowy systemu. Wspiera fragment "Done when": "design.md pokrywa typografię/kolor/spacing/komponenty".
- [0002-biblioteka-komponentow.md](0002-biblioteka-komponentow.md): wybiera sposób stylowania wariantów, bibliotekę dostępnych prymitywów, zestaw ikon, i listę komponentów bazowych do zbudowania teraz. Wspiera fragment "Done when": "komponenty bazowe obsługują focus i klawiaturę".
- [0002-dane-i-routing.md](0002-dane-i-routing.md): definiuje model danych mockowych (Project, Country, EligibilityByCountry), kształt funkcji dostępowych, i tworzy puste segmenty tras `/klient` i `/producent`. Wspiera fragment "Done when": "routing i dane mockowe (projekty, ceny, wymagania krajowe, statusy) są gotowe do użycia przez wszystkie ekrany" (statusy świadomie odłożone, patrz Follow-up).

**Wspólny kontrakt między dziećmi**: komponenty z [0002-biblioteka-komponentow.md](0002-biblioteka-komponentow.md) są jedynym sposobem budowania powłok tras z [0002-dane-i-routing.md](0002-dane-i-routing.md); żaden komponent nie zaszywa własnego koloru czy rozmiaru na sztywno, każda wartość wizualna pochodzi z tokenu ustawionego w [0002-tokeny-i-typografia.md](0002-tokeny-i-typografia.md). `docs/design.md` (dziecko 1) dokumentuje też komponenty bazowe zbudowane w dziecku 2, więc jest pisany po nich.

## Decision

**Chosen option**: fundament oparty na już gotowych tokenach marki, rozszerzony o skalę typografii i siatkę (Tailwind `@theme`), bibliotekę komponentów zbudowaną na `tailwind-variants` plus `Headless UI` plus `lucide-react`, i warstwie danych mockowych w typowanych plikach TypeScript z asynchronicznymi funkcjami dostępowymi.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Tokeny → Tailwind | Rozszerzenie `@theme` w `app/globals.css` o skalę typografii i mapowanie modułu odstępów na skalę Tailwind; `docs/design.md` jako dokument źródłowy | kolor, promienie i czcionki już wpięte w spec 0001; moduł odstępów (`--brand-space-1` do `--brand-space-7`) i skala typografii istnieją tylko jako zwykłe zmienne CSS, jeszcze nie jako tokeny Tailwind `@theme`, więc żadna klasa `text-*` ani odstęp specyficzny dla marki jeszcze nie działa |
| Stylowanie wariantów | `tailwind-variants` | jedna zależność zbudowana pod dokładnie ten przypadek: typowane warianty plus wbudowane scalanie klas |
| Dostępne prymitywy | `Headless UI` (Tailwind Labs) | najciaśniejsze dopasowanie do Tailwind, mniejszy zakres pasujący do lean/medium wagi tego etapu |
| Ikony | `lucide-react` | domyślny wybór ekosystemu 2026, typowany, łatwy do wymiany później |
| Zakres komponentów teraz | Atomy plus layout (Button, pola formularza, Label, StatusPill, Card, typografia, Container/Grid/Stack, pierścień fokusa) | wzorce ustawiane przez konkretne ekrany (dialog, oś statusu, upload) zostają własnością tych specyfikacji, nie tej |
| Dane mockowe | Typowane moduły TS pod `lib/data/`, funkcje dostępowe asynchroniczne | zgodne z regułą `AGENTS.md` (asynchroniczność od początku) i uzasadnieniem TypeScript ze spec 0001 |
| Routing | Puste segmenty `app/[locale]/klient/` i `app/[locale]/producent/` z minimalną wspólną powłoką teraz | każda kolejna specyfikacja ekranu dodaje stronę, nie podejmuje decyzji o folderze i layoucie |

## Consequences

**Positive**:
- Każdy z trzynastu ekranów startuje z gotowym słownikiem wizualnym i gotowymi klockami, zamiast trzynastu osobnych, drobnych decyzji projektowych.
- Wymiana danych mockowych na prawdziwe API w drugim etapie dotyka tylko wnętrza funkcji w `lib/data/`, nie ekranów, które je wywołują (zgodnie z regułą `AGENTS.md`).
- `docs/design.md` daje jedno miejsce do sprawdzenia zgodności z marką zamiast przeszukiwania `brand-guidelines-v3.md` przy każdym nowym ekranie.

**Negative / tradeoffs**:
- Trzy nowe zależności (`tailwind-variants`, `@headlessui/react`, `lucide-react`) w projekcie, który wcześniej miał tylko Tailwind; każda wymaga aktualizacji przy podatnościach.
- Zakres komponentów zawężony do atomów i layoutu oznacza, że dialog, oś statusu i upload wciąż czekają na własne specyfikacje (ekrany 8, 10, 12) zanim będą miały bazę do rozbudowy.
- Model danych mockowych (Project, Country, EligibilityByCountry) nie obejmuje jeszcze encji zamówienia/statusu używanej przez ekrany 10 i 16; ta decyzja świadomie odłożona do specyfikacji tych ekranów.
- `EligibilityByCountry.reason` to wolny tekst, nie ustrukturyzowana lista braków; ekran 13 (gotowość eksportowa) i 14 (domykanie luk) będą potrzebować rozszerzenia tego pola o listę konkretnych elementów, nie tylko zdania z powodem.
- Cena (`priceMin`/`priceMax`) siedzi na `Project`, nie per kraj docelowy, mimo że cena końcowa z wytycznych marki to dom plus transport plus montaż, a koszt transportu realnie zależy od kraju. Ten sam `Project` pokaże więc jedną cenę niezależnie od tego, czy klient jest w Niemczech czy Holandii. Zaakceptowane świadomie na tym etapie (prototyp, dane mockowe), ale ekran 6 albo 9 może wymagać przeniesienia ceny na złącze `EligibilityByCountry`, jeśli różnica w transporcie ma być widoczna.
- `producerId`/`producerName` na `Project` są zdenormalizowane; nie ma osobnej encji `Producer`. Wystarcza to ekranom, które tylko czytają projekty, ale ekran 11 (rejestracja producenta) będzie potrzebował własnej encji producenta, nie tylko pól na projekcie.

**Neutral**:
- Dwa nowe skille agenta (`headlessui`, `lucide-icons`) zainstalowane w `.agents/skills/`, ale jeszcze nie wpisane w sekcję `## Agent skills` w `AGENTS.md` (patrz Follow-up).
- `docs/design.md` to nowy plik referencyjny, nie kod; nie wpływa na build ani lint.

## Follow-up

- [ ] Wpisz `headlessui` i `lucide-icons` do sekcji `## Agent skills` w root `AGENTS.md` (dotyczą całego projektu: komponenty i ikony pojawiają się na każdym ekranie), przy najbliższym `/audit` albo `/sync`.
- [ ] MCP `lucide-icons-mcp` odłożone na teraz (zestaw ikon jest mały i znany z góry na tym etapie); rozważ ponownie, jeśli lista potrzebnych ikon urośnie.
- [ ] Encja statusu/zamówienia (używana przez ekrany 10 i 16, oś statusu) świadomie odłożona; potrzebuje własnej decyzji przy `/architect realizacja — oś statusów`.
- [ ] Encja `Producer` (używana przez ekran 11, rejestracja producenta, i pośrednio przez 13) świadomie odłożona; `Project.producerId`/`producerName` wystarczają na czytanie, ale nie na rejestrację. Zaprojektuj przy `/architect rejestracja producenta`.
- [ ] Sprawdź przy `/architect kreator ceny` albo `/architect oferta wiążąca`, czy cena per kraj docelowy (transport) wymaga przeniesienia `priceMin`/`priceMax` z `Project` na złącze `EligibilityByCountry`.
- [ ] Po zbudowaniu tego fundamentu zaktualizuj `docs/scope/scope.md`, pozycja 3, zgodnie z krokiem "po zapisaniu spec" tego narzędzia.

## Rationale

Pełne uzasadnienie, porównanie opcji i źródła: patrz [rationale.md](rationale.md).
