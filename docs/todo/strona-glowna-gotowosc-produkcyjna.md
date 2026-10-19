# Strona główna: gotowość produkcyjna (analiza 2026-10-19)

Zrobione 2026-10-19: metadane SEO strony głównej (title, description, canonical, hreflang, Open Graph), `app/sitemap.ts` i linia Sitemap w `app/robots.ts`, hero jako WebP (2,6 MB PNG → 275 KB).

## Blokery przed publicznym startem
- [ ] Sprawdzić `NEXT_PUBLIC_SITE_URL` na Vercelu (Production); bez niego `metadataBase`, sitemapa i robots wskażą `http://localhost:3000`. Dopisać do `.env.local.example`.
- [ ] Baner zgody na cookies (scope, funkcja 5).
- [ ] Prawdziwa polityka prywatności i regulamin (dziś tymczasowa strona testowa, spec 0066 AC-17).
- [ ] Stopka na stronach klienta (kontakt, informacje prawne, dane firmy).
- [ ] Sitemapa: dodać dynamiczne strony produktów (dom, sauna, outdoor-tv); dane strukturalne JSON-LD (Organization, WebSite); obrazek Open Graph.

## Do poprawy
- [ ] Nazwy krajów w wyszukiwarce są fixture'em po polsku (`lib/data/fixtures/countries.ts`); przetłumaczyć i wyjąć z fixture'ów.
- [ ] Pole "Budżet" w `SearchCard` nic nie filtruje; podpiąć do wyników albo usunąć.
- [ ] `FeaturedProjectShowcase`: realizacja Succes Resorts wpisana na stałe (liczby, zdjęcia); przenieść do bazy/konfiguracji.
- [ ] `ComplianceEngineShowcase`: przykład "Nordic 126 / 92%" to dane na sztywno; oznaczyć wyraźnie jako ilustrację albo podpiąć pod prawdziwy wynik.
- [ ] Wyłączony przycisk "Zobacz wszystkich producentów" (`ProducerShowcase`): ukryć albo podlinkować do `/verified-manufacturers`.
- [ ] Stany puste: brak produktów `featured` w `PopularHomes` i `CompareHomesTeaser`.
- [ ] Obsługa błędu bazy w `Promise.all` strony głównej (fallback / `error.tsx`).
- [ ] Layout woła `auth()` i `cookies()`, więc cała strona jest dynamiczna; rozważyć cache dla części statycznej.
- [ ] `CompareHomesTeaser`: `Intl.NumberFormat("pl-PL")` dla każdego języka; użyć bieżącego locale.
- [ ] Zdecydować o wyłączonych sekcjach "Więcej niż dom" i "Co mówią nasi klienci".
- [ ] Test e2e samej strony głównej; `/check verify` i `/test` dla funkcji 31 w scope.
