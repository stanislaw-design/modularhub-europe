// Jedyne miejsce, które buduje adres serwisu (spec 0073 AC-12). Layout, sitemapa,
// robots i JSON-LD wołają getSiteUrl() zamiast czytać NEXT_PUBLIC_SITE_URL.
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Produkcja bez adresu wskazałaby localhost w metadanych i sitemapie: lepiej przerwać build.
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production (canonical URLs, sitemap and robots would point to localhost). Set it in the Vercel Production environment.",
    );
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
