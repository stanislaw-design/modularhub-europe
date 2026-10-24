import type { MetadataRoute } from "next";
import { getModularProjects } from "@/lib/data/modularprojects";
import { getSitemapProducts } from "@/lib/data/projects";
import { routing } from "@/lib/i18n/routing";
import { captureError } from "@/lib/observability/errors";
import { resolveProductHref } from "@/lib/product-family-groups";
import { getSiteUrl } from "@/lib/site-url";

// Treść zmienia się wolno, a roboty wołają często: baza jest czytana raz na dobę (spec 0073 AC-13).
export const revalidate = 86400;

const PUBLIC_PATHS = ["", "/results", "/producers", "/verified-manufacturers", "/sauna", "/project-request", "/contact", "/modularprojects"];

function localizedEntry(
  base: string,
  pathFor: (locale: string) => string,
  lastModified?: Date,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((code) => [code, `${base}${pathFor(code)}`]));
  return routing.locales.map((locale) => ({
    url: `${base}${pathFor(locale)}`,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticEntries = PUBLIC_PATHS.flatMap((path) => localizedEntry(base, (locale) => `/${locale}${path}`));
  // Wpisy ModularProjects leżą w kodzie, więc nie zależą od bazy (spec 0076 AC-11).
  const modularProjects = await getModularProjects(routing.defaultLocale);
  const modularProjectEntries = modularProjects.flatMap((project) =>
    localizedEntry(base, (locale) => `/${locale}/modularprojects/${project.slug}`, new Date(project.publishedAt)),
  );
  const fixedEntries = [...staticEntries, ...modularProjectEntries];

  try {
    const products = await getSitemapProducts();
    const productEntries = products.flatMap((item) =>
      localizedEntry(
        base,
        (locale) => resolveProductHref(item.family, item.id, locale, item.slug, item.spaSubcategory),
        item.updatedAt,
      ),
    );
    return [...fixedEntries, ...productEntries];
  } catch (error) {
    // Baza niedostępna (np. limit Neon) nie może dawać 500 dla robotów: oddajemy same stałe strony.
    captureError(error, { area: "sitemap", section: "products" });
    return fixedEntries;
  }
}
