# Verify: domykanie luk (producent) · spec 0010 · updated 2026-08-16
_Steps derived from spec 0010 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Na `/pl/producent/gotowosc-eksportowa` rozwiń wiersz Niemiec (status warunkowy) → pod listą braków widać przycisk „Domknij luki”, prowadzący do `/pl/producent/domykanie-luk?kraj=DE`   → AC-1
- [ ] Rozwiń wiersz Polski (dopuszczone) lub Holandii (niedopuszczone) → nigdy nie ma przycisku „Domknij luki”                                                                              → AC-1
- [ ] Wejdź na `/pl/producent/domykanie-luk?kraj=DE&nazwa=Modulor%2028` → nagłówek z nazwą kraju i nazwą projektu, to samo zastrzeżenie prawne co na mapie, dwie sekcje jedna pod drugą      → AC-2
- [ ] Wejdź na `/pl/producent/domykanie-luk` (brak `kraj`), `/pl/producent/domykanie-luk?kraj=XX` (nieznany), `/pl/producent/domykanie-luk?kraj=PL` (dopuszczony) → za każdym razem łagodny redirect na `/pl/producent/gotowosc-eksportowa` (z `nazwa` zachowaną, gdy była podana), nigdy błąd → AC-3
- [ ] W sekcji „Wgraj dokumenty samodzielnie”: przycisk „Wyślij” jest nieaktywny przy zero wybranych plików, aktywuje się po wybraniu co najmniej jednego                                     → AC-4
- [ ] Kliknij „Wyślij” → komunikat „Dokumenty przesłane do weryfikacji” i link powrotny do mapy; po powrocie Niemcy nadal mają status warunkowy (nic nie zapisało się)                        → AC-5
- [ ] W sekcji „Kup pakiet domykania luk”: widoczna cena 149 € (stała `PLOT_ANALYSIS_PRICE_EUR`), przycisk „Zapłać”                                                                          → AC-6
- [ ] Kliknij „Zapłać” → faza „Przetwarzanie płatności…” z `aria-live="polite"`, potem faza wynikowa ze statusem „Dopuszczone” i tekstem potwierdzenia                                        → AC-6, AC-7
- [ ] Po zakupie wróć na `/pl/producent/gotowosc-eksportowa` → Niemcy renderują się jako „Dopuszczone”, bez akordeonu, z zastępczym uzasadnieniem; `getExportReadiness()` w kodzie źródłowym pozostaje niezmieniony (mock nadal zwraca `conditional`) → AC-8
- [ ] Wejdź ponownie na `/pl/producent/domykanie-luk?kraj=DE` dla już rozwiązanego kraju → krótki komunikat informacyjny zamiast obu sekcji, z linkiem powrotnym do mapy                        → AC-9
- [ ] W trybie prywatnym / z zablokowanym `localStorage`: obie ścieżki (upload, zakup) działają bez błędu; zakup pokazuje wynik mimo że zapis po cichu się nie udał                            → AC-10
- [ ] Nawigacja klawiaturą przez obie sekcje ekranu domykania luk; dokładnie jeden `<h1>`; faza „paying” ogłoszona przez czytnik ekranu (`aria-live`)                                          → AC-11

## Commands
- [ ] `npm run test` → cały pakiet testów przechodzi (poza wcześniej istniejącym, niepowiązanym `RegistrationForm.test.tsx`)   → AC-1–AC-11
- [ ] `npm run lint` → brak błędów                                                                                             → AC-11
- [ ] `npm run build` → kompiluje się (blokowane dziś tylko przez niepowiązany, wcześniej istniejący błąd typów w `ProjectWizardProgress.test.tsx`, feature 12, poza zakresem tej specyfikacji) → n/a

## Acceptance-criteria coverage
- AC-1 … pierwszy krok UI/manual i drugi krok · AC-2 … trzeci krok · AC-3 … czwarty krok · AC-4 … piąty krok · AC-5 … szósty krok · AC-6 … siódmy i ósmy krok · AC-7 … ósmy krok · AC-8 … dziewiąty krok · AC-9 … dziesiąty krok · AC-10 … jedenasty krok · AC-11 … dwunasty krok
