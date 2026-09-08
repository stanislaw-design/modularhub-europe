import { Menu, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import logoHorizontalCompactV2 from "@/assets/brand/logo/v2/horizontal/logo-horizontal-compact-v2.svg";
import { Container, LanguageSwitcher } from "@/components/ui";

interface ProducerHeaderProps {
  locale: string;
}

export async function ProducerHeader({ locale }: ProducerHeaderProps) {
  const t = await getTranslations("ProducerHeader");

  return (
    <header className="border-b border-brand-steel">
      <Container className="flex items-center justify-between py-brand-2">
        <Link href={`/${locale}/producent`} className="focus-ring rounded-data">
          <Image
            src={logoHorizontalCompactV2}
            alt="ModularHub Europe"
            className="h-8 w-auto"
            preload
          />
        </Link>
        <div className="flex items-center gap-brand-3">
          <Link
            href={`/${locale}/klient`}
            className="focus-ring rounded-data text-body font-medium text-brand-foundation-navy hover:underline"
          >
            {t("imClient")}
          </Link>
          <LanguageSwitcher locale={locale} surface="v3" triggerClassName="flex text-brand-foundation-navy" />
          <button
            type="button"
            disabled
            aria-label={t("menu")}
            className="flex size-10 items-center justify-center rounded-full bg-brand-steel/40 text-brand-foundation-navy disabled:cursor-default"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled
            aria-label={t("account")}
            className="flex size-10 items-center justify-center rounded-full bg-brand-foundation-navy text-brand-warm-white disabled:cursor-default"
          >
            <User className="size-4" aria-hidden="true" />
          </button>
        </div>
      </Container>
    </header>
  );
}
