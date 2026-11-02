import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heading } from "@/components/ui";

interface CategoryHeadingProps {
  locale: string;
  /** Nazwa kategorii: tytuł <h1> i ostatni element ścieżki nawigacji. */
  title: string;
  count: number;
}

// Wspólny nagłówek stron kategorii (sauny, domy i pozostałe rodziny): tytuł z
// licznikiem modeli po lewej, ścieżka nawigacji po prawej. Jedno miejsce, żeby
// wszystkie kategorie wyglądały tak samo.
export function CategoryHeading({ locale, title, count }: CategoryHeadingProps) {
  const t = useTranslations("CategoryHeading");
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-brand-4 gap-y-brand-1">
      <Heading level="h1" surface="v5">
        {title}:{" "}
        <span className="text-brand-v5-amber-strong">{t("modelCount", { count })}</span>
      </Heading>
      <nav aria-label={t("breadcrumbAriaLabel")}>
        <ol className="flex items-center gap-brand-1 text-data text-brand-v5-muted">
          <li>
            <Link href={`/${locale}`} className="focus-ring rounded-data underline-offset-2 hover:underline">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
    </div>
  );
}
