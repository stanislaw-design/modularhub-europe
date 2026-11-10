import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Bez tego pliku /robots.txt trafiał do trasy app/[locale] (proxy.ts pomija adresy z kropką,
// więc "robots.txt" był traktowany jako język) i kończył błędem enuma w Sentry i logach.
// Sitemapa (app/sitemap.ts) obejmuje stałe strony publiczne; strony produktów też (spec 0073).
// Panele i API nie mają być indeksowane; adresy mają prefiks języka, stąd wzorce z gwiazdką.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // GPTBot (trening modeli OpenAI) potrafił zrobić ok. 65 tys. żądań na dobę na dwie strony
      // produktów i generował większość Fast Origin Transfer. Szuka i odpowiada na pytania
      // inny bot (OAI-SearchBot, ChatGPT-User), więc widoczność w ChatGPT zostaje.
      { userAgent: "GPTBot", disallow: "/" },
      // Crawlery AI Mety: meta-externalagent młócił /registration we wszystkich językach,
      // meta-webindexer pobierał zdjęcia przez /_next/image. facebookexternalhit (podglądy
      // linków po udostępnieniu) zostaje dozwolony.
      { userAgent: "meta-externalagent", disallow: "/" },
      { userAgent: "meta-webindexer", disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/internal/", "/*/panel/", "/*/producer/panel/", "/*/login", "/*/registration"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
