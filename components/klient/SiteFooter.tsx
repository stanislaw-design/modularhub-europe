import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui";

interface SiteFooterProps {
  locale: string;
  contactEmail?: string;
}

interface FooterLink {
  labelKey: string;
  href: string;
}

interface FooterColumn {
  key: string;
  titleKey: string;
  links: FooterLink[];
}

// Te same etykiety co w menu nagłówka (namespace SiteHeader, klucze nav.*):
// stopka nie ma własnej kopii nazw, więc obie nawigacje nie rozjadą się w
// tłumaczeniach. Kolejność grup jak w menu, bez grup zależnych od roli.
function buildColumns(locale: string): FooterColumn[] {
  return [
    {
      key: "catalog",
      titleKey: "nav.groups.catalog",
      links: [
        { labelKey: "nav.catalog.houses", href: `/${locale}/results?family=dom` },
        { labelKey: "nav.catalog.saunas", href: `/${locale}/sauna` },
        { labelKey: "nav.catalog.outdoorTv", href: `/${locale}/results?family=outdoor-tv` },
        { labelKey: "nav.catalog.containers", href: `/${locale}/results?family=kontenery-modulowe` },
      ],
    },
    {
      key: "orders",
      titleKey: "nav.groups.orders",
      links: [
        { labelKey: "nav.orders.largeOrder", href: `/${locale}/project-request` },
        { labelKey: "nav.orders.modularProjects", href: `/${locale}/modularprojects` },
        { labelKey: "nav.orders.verifiedManufacturers", href: `/${locale}/verified-manufacturers` },
      ],
    },
    {
      key: "platform",
      titleKey: "nav.groups.platform",
      links: [
        { labelKey: "nav.platform.howItWorks", href: `/${locale}#jak-to-dziala` },
        { labelKey: "nav.platform.faq", href: `/${locale}#faq` },
        { labelKey: "nav.platform.contact", href: `/${locale}/contact` },
      ],
    },
  ];
}

const linkClass =
  "focus-ring inline-flex min-h-11 items-center py-1 rounded-data text-body text-brand-v5-paper/85 transition-colors hover:text-brand-v5-amber lg:min-h-9";

const joinClass =
  "focus-ring flex min-h-11 items-center justify-between gap-brand-1 rounded-marketing border border-brand-v5-paper/30 px-brand-2 py-1 text-body font-medium text-brand-v5-paper transition-colors hover:border-brand-v5-amber hover:text-brand-v5-amber";

// Stała ciemna powierzchnia (v5-night, v5-paper i amber nie odwracają się w
// trybie ciemnym, patrz komentarz w app/globals.css), więc stopka wygląda tak
// samo w obu motywach i zamyka stronę ciężką, czytelną podstawą.
export async function SiteFooter({ locale, contactEmail }: SiteFooterProps) {
  const t = await getTranslations({ locale, namespace: "SiteFooter" });
  const tNav = await getTranslations({ locale, namespace: "SiteHeader" });
  const columns = buildColumns(locale);
  // Inwestor to klient z weryfikacją firmy (B2B): osobnej roli konta nie ma,
  // więc zakłada zwykłe konto klienta i od razu trafia do weryfikacji firmy.
  const joinLinks = [
    { key: "producer", href: `/${locale}/registration?role=producer` },
    {
      key: "investor",
      href: `/${locale}/registration?role=client&callbackUrl=${encodeURIComponent(`/${locale}/panel/verification`)}`,
    },
    { key: "client", href: `/${locale}/registration?role=client` },
  ];
  const year = new Date().getFullYear();

  return (
    <footer
      id="site-footer"
      className="relative isolate overflow-hidden bg-brand-v5-night pb-[6.5vw] text-brand-v5-paper"
    >
      {/* Znak wodny: sam kontur (wypełnienie w kolorze tła z paint-order, żeby
          nie prześwitywały wewnętrzne przecięcia konturów czcionki zmiennej), bardzo niska widoczność, pod treścią. Rozmiar
          w vw, żeby napis zawsze zajmował szerokość stopki; dekoracja, więc
          poza drzewem dostępności i bez kliknięć. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 translate-y-[12%] select-none text-center text-[8.6vw] leading-none font-extrabold tracking-[-0.04em] font-display text-brand-v5-night opacity-[0.22] [paint-order:stroke_fill] [-webkit-text-stroke:3px_var(--brand-v5-paper)]"
      >
        MODULARHUBEUROPE
      </span>
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-brand-3 border-b border-brand-v5-paper/15 py-brand-6 md:flex-row md:items-end md:justify-between md:gap-brand-6">
          <div className="max-w-3xl">
            <p className="text-h3 font-extrabold leading-tight tracking-tight sm:text-h2">
              {t("ctaHeading")}
            </p>
            <p className="mt-brand-1 max-w-[60ch] text-body text-brand-v5-paper/75">{t("ctaText")}</p>
          </div>
          <Button
            as="a"
            href={`/${locale}/project-request`}
            surface="v5"
            size="lg"
            className="shrink-0 self-start md:self-auto"
          >
            {t("ctaButton")}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-brand-3 gap-y-brand-5 py-brand-6 lg:grid-cols-12 lg:gap-x-brand-6">
          <div className="col-span-2 flex flex-col gap-brand-3 lg:col-span-4">
            <Link
              href={`/${locale}`}
              aria-label="ModularHub Europe"
              className="focus-ring self-start rounded-data"
            >
              <BrandLogo tone="light" className="text-[0.62rem] sm:text-[0.72rem]" />
            </Link>
            <p className="max-w-[40ch] text-body text-brand-v5-paper/75">{t("about")}</p>
            <ul className="flex flex-col gap-1 text-data text-brand-v5-paper/75">
              <li>{t("markets")}</li>
              {contactEmail && (
                <li>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="focus-ring break-all rounded-data font-medium text-brand-v5-paper underline decoration-brand-v5-paper/30 underline-offset-4 hover:text-brand-v5-amber hover:decoration-brand-v5-amber"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <nav
            aria-label={t("navLabel")}
            className="col-span-2 grid grid-cols-2 gap-x-brand-3 gap-y-brand-5 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.6fr)] lg:col-span-8 lg:col-start-5"
          >
            {columns.map((column) => (
              <div key={column.key}>
                <h2 className="mb-brand-1 text-data font-semibold text-brand-v5-paper/65">
                  {tNav(column.titleKey)}
                </h2>
                <ul className="flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.labelKey}>
                      <Link href={link.href} className={linkClass}>
                        {tNav(link.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <h2 className="mb-brand-1 text-data font-semibold text-brand-v5-paper/65">
                {t("joinHeading")}
              </h2>
              <ul className="flex flex-col gap-brand-1">
                {joinLinks.map((link) => (
                  <li key={link.key}>
                    <Link href={link.href} className={joinClass}>
                      {t(`join.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t border-brand-v5-paper/15 py-brand-3 text-data text-brand-v5-paper/65 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights", { year })}</p>
          <Link
            href={`/${locale}/privacy`}
            className="focus-ring inline-flex min-h-11 items-center rounded-data hover:text-brand-v5-amber sm:min-h-9"
          >
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
