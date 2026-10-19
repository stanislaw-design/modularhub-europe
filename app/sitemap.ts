import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";

// Tylko stałe, publiczne strony klienta. Strony produktów (dynamiczne, z bazy)
// świadomie poza pierwszą wersją: dojdą razem z resztą SEO (scope, funkcja 20).
const PUBLIC_PATHS = ["", "/results", "/verified-manufacturers", "/sauna", "/project-request", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((code) => [code, `${base}/${code}${path}`])),
      },
    })),
  );
}
