# Weryfikacja 0078: punkt odniesienia kosztów (AC-1, część)

Zapisane 2026-10-30 z API rozliczeń Vercel (`list_billing_charges`, zespół
`stanautomation's projects`, projekt `modularhub-europe`). To jest tylko część AC-1.
Brakuje jeszcze rozkładu tras (top 10 według wywołań i CPU) oraz udziału botów:
te dane są wyłącznie w panelu Vercel (Observability, Firewall Traffic).

## Koszt użycia (zużycie, USD) w oknach, w których pobrano dane

Okno 15 do 18 października nie zostało pobrane (nadpisany plik wyniku).

| Okno (UTC) | Wartość zużycia | Zapłacone po limicie |
|---|---|---|
| 3 do 7 paź | 3,40 | 0,00 |
| 6 do 9 paź | 2,52 | 0,19 |
| 9 do 12 paź | 7,22 | 2,83 |
| 12 do 15 paź | 3,18 | 0,63 |
| 18 do 21 paź | 4,22 | 0,35 |
| 21 do 24 paź | 7,66 | 0,76 |
| 24 do 27 paź | 7,80 | 7,19 (w tym plan Pro 1,94) |
| 27 do 29 paź | 6,29 | 6,29 (w tym plan Pro 1,29) |

Największe pozycje w ostatnich oknach: Fast Origin Transfer (1,3 do 1,7 USD na okno),
Fluid Active CPU i Fluid Provisioned Memory (razem 2 do 2,5), Function Invocations
(0,4 do 0,6), Image Optimization (0,96 plus 0,62 w oknie 21 do 24 paź). Obrazki
nie dominują.

## Do uzupełnienia przed pomiarem po wdrożeniu (AC-13)

- [ ] Dzienny koszt według usługi dla 20 do 26 października (pobrać dniami, okno 3-dniowe daje sumy).
- [ ] Top 10 tras według wywołań i CPU (panel Vercel, Observability).
- [ ] Udział botów (panel Vercel, Firewall Traffic).
