import type { MetadataRoute } from "next";

// Bez tego pliku /robots.txt trafiał do trasy app/[locale] (proxy.ts pomija adresy z kropką,
// więc "robots.txt" był traktowany jako język) i kończył błędem enuma w Sentry i logach.
// Sitemapy tu jeszcze nie ma (SEO podstawowe jest osobną funkcją w scope), więc nie ma linii Sitemap.
// Panele i API nie mają być indeksowane; adresy mają prefiks języka, stąd wzorce z gwiazdką.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/internal/", "/*/panel/", "/*/producer/panel/", "/*/login"],
    },
  };
}
