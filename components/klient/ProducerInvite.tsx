import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface ProducerInviteProps {
  locale: string;
}

// Wąski pasek na stronie głównej, który kieruje producentów na /producer.
// Strona główna mówi do inwestora, ale producentów dziś brakuje bardziej niż
// zleceń, więc wejście dla nich musi być widoczne, nie tylko w stopce.
// v5-night/v5-paper zostają stałe w obu motywach (patrz AGENTS.md).
export async function ProducerInvite({ locale }: ProducerInviteProps) {
  const t = await getTranslations("ProducerInvite");
  return (
    <section className="full-bleed bg-brand-v5-night text-brand-v5-paper">
      <div className="mx-auto flex max-w-[2000px] flex-col gap-brand-3 px-[3%] py-brand-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-h3 font-bold tracking-tight">{t("heading")}</h2>
          <p className="text-body text-brand-v5-paper/75">{t("body")}</p>
        </div>
        <Link
          href={`/${locale}/producer`}
          className="focus-ring inline-flex shrink-0 items-center gap-1 self-start rounded-v5-pill bg-brand-v5-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong md:self-auto"
        >
          {t("cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
