import { getSiteUrl } from "@/lib/site-url";

// Dane strukturalne strony głównej (spec 0073 AC-14): Organization i WebSite w jednym
// bloku JSON-LD. Logo wskazuje icon.svg (wyszukiwarki wolą raster, patrz Follow up spec 0073).
export function HomeStructuredData({ locale }: { locale: string }) {
  const url = getSiteUrl();
  const email = process.env.SUPPORT_REPLY_TO_EMAIL;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: "ModularHub Europe",
        url,
        logo: `${url}/icon.svg`,
        ...(email ? { contactPoint: { "@type": "ContactPoint", contactType: "customer support", email } } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: "ModularHub Europe",
        url,
        inLanguage: locale,
        publisher: { "@id": `${url}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Znak "<" zamieniony, żeby treść nie mogła zamknąć znacznika <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
