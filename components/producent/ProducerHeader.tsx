import { LogOut, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/auth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container, LanguageSwitcher } from "@/components/ui";
import { signOutAction } from "@/lib/auth-session-actions";

interface ProducerHeaderProps {
  locale: string;
}

// Menu konta na sesji (spec 0032 Build plan zadanie 7): zastępuje dwa dawne,
// zawsze wyłączone przyciski. Brak sesji producenta (gość albo inna rola) ->
// link do logowania zamiast panelu, ten sam wzorzec co SiteHeader (klient).
export async function ProducerHeader({ locale }: ProducerHeaderProps) {
  const [session, t] = await Promise.all([auth(), getTranslations("ProducerHeader")]);
  const isProducerSession = session?.user.role === "producer";

  return (
    <header className="border-b border-brand-steel">
      <Container className="flex items-center justify-between py-brand-2">
        <Link
          href={`/${locale}/producer`}
          aria-label="ModularHub Europe"
          className="focus-ring rounded-data"
        >
          <BrandLogo className="text-[0.78rem]" />
        </Link>
        <div className="flex items-center gap-brand-3">
          <Link
            href={`/${locale}`}
            className="focus-ring rounded-data text-body font-medium text-brand-foundation-navy hover:underline"
          >
            {t("imClient")}
          </Link>
          <LanguageSwitcher locale={locale} surface="v3" triggerClassName="flex text-brand-foundation-navy" />
          {isProducerSession ? (
            <>
              <Link
                href={`/${locale}/producer/panel`}
                aria-label={t("account")}
                className="focus-ring flex size-10 items-center justify-center rounded-full bg-brand-foundation-navy text-brand-warm-white"
              >
                <User className="size-4" aria-hidden="true" />
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="focus-ring flex items-center gap-1 rounded-data text-body font-medium text-brand-foundation-navy hover:underline"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href={`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/producer/panel`)}`}
              className="focus-ring rounded-data text-body font-medium text-brand-foundation-navy hover:underline"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
