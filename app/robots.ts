import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Bez tego pliku /robots.txt trafiał do trasy app/[locale] (proxy.ts pomija adresy z kropką,
// więc "robots.txt" był traktowany jako język) i kończył błędem enuma w Sentry i logach.
// Sitemapa (app/sitemap.ts) obejmuje stałe strony publiczne; strony produktów też (spec 0073).
// Panele i API nie mają być indeksowane; adresy mają prefiks języka, stąd wzorce z gwiazdką.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/internal/", "/*/panel/", "/*/producer/panel/", "/*/login"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
