"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { tv } from "@/lib/tv";

// `anchor` (Headless UI v2's Floating UI integration, see MenuItems below)
// takes over positioning, including flipping the panel above the trigger
// when there isn't room below (e.g. the language row near the bottom of the
// slide-out menu) — the manual `absolute`/`left-0`/`right-0` classes this
// used before couldn't do that.
const panel = tv({
  base: "z-50 w-36 overflow-hidden rounded-data border border-brand-steel bg-brand-warm-white py-1 shadow-md focus:outline-none data-[closed]:opacity-0 data-[closed]:scale-95 transition duration-100 ease-out [--anchor-gap:4px]",
  variants: {
    surface: {
      v3: "",
      v5: "border-brand-v5-line bg-brand-v5-surface",
    },
  },
  defaultVariants: {
    surface: "v3",
  },
});

const option = tv({
  base: "flex w-full cursor-default items-center justify-between gap-brand-1 px-brand-2 py-brand-1 text-left text-body text-brand-foundation-navy data-[focus]:bg-brand-passage-blue/10",
  variants: {
    surface: {
      v3: "",
      v5: "text-brand-v5-ink data-[focus]:bg-brand-v5-amber/10",
    },
  },
  defaultVariants: {
    surface: "v3",
  },
});

interface LanguageSwitcherProps {
  locale: string;
  surface?: "v3" | "v5";
  align?: "start" | "end";
  triggerClassName?: string;
}

// `useSearchParams` opts a statically rendered page into client rendering
// unless the component calling it sits behind its own Suspense boundary
// (Next.js requirement) — the trigger fallback below keeps the same markup
// shape (no layout shift) while search params are resolved on the client.
function LanguageSwitcherTrigger({ locale, triggerClassName = "" }: LanguageSwitcherProps) {
  const t = useTranslations("LanguageSwitcher");
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-1 whitespace-nowrap text-body font-medium opacity-50 ${triggerClassName}`}
      title={t("changeLanguage")}
    >
      {locale.toUpperCase()}
      <ChevronDown className="size-4 shrink-0" />
    </span>
  );
}

function LanguageSwitcherMenu({ locale, surface, align, triggerClassName = "" }: LanguageSwitcherProps) {
  const t = useTranslations("LanguageSwitcher");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.toString();
  const target = query ? `${pathname}?${query}` : pathname;

  function switchTo(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(target, { locale: nextLocale });
    });
  }

  return (
    <Menu as="div">
      <MenuButton
        disabled={isPending}
        aria-label={t("changeLanguage")}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-body font-medium disabled:cursor-default disabled:opacity-50 ${triggerClassName}`}
      >
        {locale.toUpperCase()}
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </MenuButton>
      <MenuItems transition anchor={align === "start" ? "bottom start" : "bottom end"} className={panel({ surface })}>
        {routing.locales.map((code) => (
          <MenuItem key={code}>
            <button type="button" onClick={() => switchTo(code)} className={option({ surface })}>
              <span>{t(code)}</span>
              {code === locale && (
                <Check
                  className={`size-4 shrink-0 ${surface === "v5" ? "text-brand-v5-amber-strong" : "text-brand-passage-blue"}`}
                  aria-hidden="true"
                />
              )}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  return (
    <Suspense fallback={<LanguageSwitcherTrigger {...props} />}>
      <LanguageSwitcherMenu {...props} />
    </Suspense>
  );
}
