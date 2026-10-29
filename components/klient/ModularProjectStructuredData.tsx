import type { ResolvedModularProject } from "@/lib/data/modularprojects";
import { getSiteUrl } from "@/lib/site-url";

// JSON-LD realizacji (spec 0076 AC-11): wpis to Article, lista to CollectionPage.
// Adres serwisu tylko z getSiteUrl() (spec 0073).
type Props =
  | { kind: "article"; locale: string; project: ResolvedModularProject }
  | { kind: "collection"; locale: string; name: string; description: string; projects: ResolvedModularProject[] };

export function ModularProjectStructuredData(props: Props) {
  const base = getSiteUrl();
  const { locale } = props;

  const data =
    props.kind === "article"
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: props.project.title,
          description: props.project.lead,
          image: `${base}${props.project.cover.src}`,
          datePublished: props.project.publishedAt,
          inLanguage: locale,
          mainEntityOfPage: `${base}/${locale}/modularprojects/${props.project.slug}`,
          publisher: { "@type": "Organization", name: "ModularHub Europe", url: base },
        }
      : {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: props.name,
          description: props.description,
          inLanguage: locale,
          url: `${base}/${locale}/modularprojects`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: props.projects.map((project, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${base}/${locale}/modularprojects/${project.slug}`,
              name: project.title,
            })),
          },
        };

  return (
    <script
      type="application/ld+json"
      // Znak "<" zamieniony, żeby treść nie mogła zamknąć znacznika <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
