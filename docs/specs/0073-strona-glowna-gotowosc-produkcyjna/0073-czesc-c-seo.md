# 0073 część C. SEO strony głównej i adres serwisu

## Summary

Podstawowe metadane i sitemapa ze stałymi stronami są już w commicie `544e3ba`. Ta część dodaje jeden bezpieczny adres serwisu (produkcja nie ruszy z localhost), sitemapę z produktami z bazy, dane strukturalne o organizacji i obrazek do udostępniania. Kryteria AC-12 do AC-15 są w [index.md](index.md).

## Design

**Adres serwisu (AC-12)**
- Nowy `lib/site-url.ts`: `getSiteUrl(): string`.
  1. `NEXT_PUBLIC_SITE_URL`, gdy ustawione (bez końcowego ukośnika).
  2. Gdy `VERCEL_ENV === "production"` i zmiennej brak: `throw new Error(...)` z czytelnym komunikatem.
  3. Gdy `VERCEL_URL` jest ustawione (podgląd Vercela): `https://${VERCEL_URL}`.
  4. W przeciwnym razie `http://localhost:3000`.
- Podmiana w: `app/[locale]/layout.tsx` (`metadataBase`), `app/sitemap.ts`, `app/robots.ts`. JSON-LD i `openGraph.images` budują adresy przez ten helper.
- Dopisać `NEXT_PUBLIC_SITE_URL` z komentarzem do `.env.local.example`. `metadataBase` w layoucie może zostać w zasięgu modułu: lokalny `next build` ma `VERCEL_ENV` pusty, więc nie rzuca, a build na Vercelu z `VERCEL_ENV=production` bez zmiennej ma się właśnie przerwać.
- Test jednostkowy: cztery gałęzie powyżej plus końcowy ukośnik.

**Sitemapa z produktami (AC-13)**
- `app/sitemap.ts` staje się `async`. Zapytanie przez nową funkcję w `lib/data/projects.ts` (`getSitemapProducts()`): opublikowane produkty (`status = published`) z `id`, `slug`, `family`, `spaSubcategory` i daty modyfikacji (`updated_at` produktu, jeśli kolumna istnieje, inaczej brak `lastModified`).
- Adres produktu przez `resolveProductHref(family, id, locale, slug, spaSubcategory)`, dla czterech języków, z `alternates.languages` jak dla stałych stron.
- `export const revalidate = 86400` (dokumentacja Next.js dla `sitemap.ts` w `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`, potwierdzić składnię przed użyciem).
- `try/catch` wokół zapytania: przy błędzie `captureError` i zwrot samych stałych stron, bez statusu 500.
- Limit protokołu to 50 tys. adresów, a katalog liczy około stu produktów razy cztery języki. Przy przekroczeniu zadanie dla `generateSitemaps`.

**JSON-LD (AC-14)**
- Nowy `components/klient/HomeStructuredData.tsx` (komponent serwerowy) renderuje `<script type="application/ld+json">`.
- Zawartość: `Organization` (`name: "ModularHub Europe"`, `url`, `logo`, `contactPoint` z e mailem tylko gdy `SUPPORT_REPLY_TO_EMAIL` jest ustawiona) i `WebSite` (`name`, `url`, `inLanguage` równe bieżącemu językowi). Bez `SearchAction`.
- Serializacja: `JSON.stringify(data).replace(/</g, "\\u003c")`, żeby treść nie mogła zamknąć znacznika.
- Montowany tylko w `page.tsx` strony głównej.
- Logo wskazuje dziś `icon.svg` (Follow up o rastrowe logo).

**Obrazek OG (AC-15)**
- Nowy skrypt `scripts/generate-og-image.mjs` (`sharp`): kadruje `public/images/hero/klient-hero-bg.webp` do 1200 na 630 (środek, `fit: "cover"`), zapisuje `public/images/og/home.jpg` (jakość 82). Wynik jest zatwierdzony w repo, skrypt służy do powtórzenia.
- W `generateMetadata` strony głównej: `openGraph.images: [{ url: "/images/og/home.jpg", width: 1200, height: 630, alt: t("metaTitle") }]` i `twitter: { card: "summary_large_image", images: [...] }`. Strona główna ustawia to sama, bo `openGraph` strony zastępuje `openGraph` layoutu (płytkie scalenie metadanych).

**Configuration required**
- `NEXT_PUBLIC_SITE_URL`: adres serwisu, obowiązkowy w Production (AC-12). Na podglądzie opcjonalny.
- `SUPPORT_REPLY_TO_EMAIL`: już istnieje, opcjonalnie trafia do JSON-LD.

**Key invariants**
- Żaden plik poza `lib/site-url.ts` nie czyta `NEXT_PUBLIC_SITE_URL` do budowania adresów.
- JSON-LD nigdy nie zawiera danych osobowych poza publicznym adresem kontaktowym zespołu.
- Sitemapa nigdy nie zwraca 500 z powodu bazy.

**Critical test scenarios**
- `getSiteUrl` w czterech gałęziach, rzuca tylko dla produkcji bez zmiennej, verifies **AC-12**.
- Sitemapa z zamockowanymi produktami: dom, sauna i outdoor TV mają prawidłowe ścieżki, każdy w czterech językach, verifies **AC-13**.
- Sitemapa z błędem bazy zwraca stałe strony i woła `captureError`, verifies **AC-13**.
- JSON-LD: parsuje się, ma oba typy, `<` jest zamienione, brak `contactPoint` bez zmiennej e mail, verifies **AC-14**.
- Metadane strony głównej mają obrazek 1200 na 630 i kartę `summary_large_image`, verifies **AC-15**.

## Rationale (krótko)

Helper z błędem na produkcji zamienia cichą, szkodliwą pomyłkę konfiguracji w głośną i tanią awarię builda. Cache sitemapy jest jedynym cache'em w tej spec, bo roboty wywołują ją często, a jej treść zmienia się wolno.
