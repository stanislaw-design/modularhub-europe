import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/data/types";

export type ProductAltKind = "house" | "sauna" | "spa" | "container" | "outdoorTv";

type AltProject = Pick<Project, "family" | "spaSubcategory" | "name" | "producerName">;

// Rodzina (i dla spa-modulowe podkategoria) decyduje o rzeczowniku w alcie, żeby
// sauna nie dostawała opisu "dom modułowy" (SEO obrazów, nazwa produktu to nie
// wszystko, co wyszukiwarka czyta z <img alt>).
export function getProductAltKind(project: Pick<Project, "family" | "spaSubcategory">): ProductAltKind {
  switch (project.family) {
    case "spa-modulowe":
      return project.spaSubcategory === "sauna" ? "sauna" : "spa";
    case "kontenery-modulowe":
      return "container";
    case "outdoor-tv":
      return "outdoorTv";
    default:
      return "house";
  }
}

// project.name często zaczyna się od nazwy producenta ("Wooden Dream House
// Loki"); w alcie producent występuje osobno ("Loki – Wooden Dream House"), więc
// prefiks zdejmujemy, żeby nazwa się nie powtarzała.
export function getProductModelName(name: string, producerName: string): string {
  const trimmedName = name.trim();
  const trimmedProducer = producerName.trim();
  if (trimmedProducer && trimmedName.toLowerCase().startsWith(`${trimmedProducer.toLowerCase()} `)) {
    const model = trimmedName.slice(trimmedProducer.length).trim();
    if (model) return model;
  }
  return trimmedName;
}

// Jedno źródło tekstu alt dla zdjęć produktu (galeria, karty, OG): np.
// "Sauna ogrodowa Loki – Wooden Dream House". Galeria dokleja do niego
// ", zdjęcie N" dla zdjęć poza okładką.
export async function getProductAltSubject(project: AltProject, locale?: string): Promise<string> {
  const t = locale ? await getTranslations({ locale, namespace: "ProductAlt" }) : await getTranslations("ProductAlt");
  return t("subject", {
    kind: t(`kind.${getProductAltKind(project)}`),
    model: getProductModelName(project.name, project.producerName),
    producer: project.producerName,
  });
}
