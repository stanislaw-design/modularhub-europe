import type { MetadataRoute } from "next";

// Bez tego pliku /robots.txt trafiał do trasy app/[locale] (proxy.ts pomija adresy z kropką,
// więc "robots.txt" był traktowany jako język) i kończył błędem enuma w Sentry i logach.
// Sitemapa (app/sitemap.ts) obejmuje stałe strony publiczne; strony produktów dojdą w funkcji 20 scope.
// Panele i API nie mają być indeksowane; adresy mają prefiks języka, stąd wzorce z gwiazdką.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/internal/", "/*/panel/", "/*/producer/panel/", "/*/login"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
