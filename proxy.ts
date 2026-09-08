import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Dwuliterowy segment, który next intl nie rozpozna jako pl/en/nl (np. "de"),
// więc jego własna logika potraktowałaby go jako brak locale i doklejiłaby
// domyślny prefiks przed nim (/pl/de/klient) zamiast go zastąpić. AC-3 chce
// zamiany, nie doklejenia: /de/klient -> /pl/klient.
const UNRECOGNIZED_LOCALE_SEGMENT = /^[a-z]{2}$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (first && UNRECOGNIZED_LOCALE_SEGMENT.test(first) && !routing.locales.includes(first as (typeof routing.locales)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${rest.length ? `/${rest.join("/")}` : ""}`;
    return NextResponse.redirect(url);
  }

  // Panel administratora (app/[locale]/internal/zapytania) zostaje wyłącznie
  // po polsku (spec 0028 AC-1): wejście pod /en|nl/internal/... przekierowuje
  // na ten sam adres pod /pl/internal/..., zamiast wyrenderować się po
  // angielsku/niderlandzku.
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number]) &&
    first !== routing.defaultLocale &&
    rest[0] === "internal"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/${rest.join("/")}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
