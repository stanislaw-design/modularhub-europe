import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Dwuliterowy segment, który next intl nie rozpozna jako pl/en/nl (np. "de"),
// więc jego własna logika potraktowałaby go jako brak locale i doklejiłaby
// domyślny prefiks przed nim (/pl/de/klient) zamiast go zastąpić. AC-3 chce
// zamiany, nie doklejenia: /de/klient -> /pl/klient.
const UNRECOGNIZED_LOCALE_SEGMENT = /^[a-z]{2}$/;

// Stare, polskie segmenty ścieżek klienta i producenta (spec 0036 AC-5) i ich
// nowe, angielskie odpowiedniki, zgodnie z tabelą tras w spec 0036 `## Decision`.
// Dopasowanie jest zakotwiczone na całej ścieżce po prefiksie języka (nie
// podmiana słowa gdziekolwiek w adresie) i sprawdzane od najdłuższego do
// najkrótszego wpisu w każdej tabeli, żeby np. "klient/panel/zapytania"
// wygrało przed samym "klient" (spec 0036 Feature design). Panel
// administracyjny dostaje własne wpisy dopiero w swoim kroku budowy (spec 0036
// Build plan, krok 3): dodawanie ich tu przed faktycznym przeniesieniem tamtej
// trasy przekierowywałoby na jeszcze nieistniejącą stronę.
const OLD_CUSTOMER_ROUTES: readonly [oldPrefix: string, newPrefix: string][] = [
  ["klient/panel/zapytania", "panel/inquiries"],
  ["klient/panel/ulubione", "panel/favorites"],
  ["klient/panel/profil", "panel/profile"],
  ["klient/wyniki", "results"],
  ["klient/zapytanie", "inquiry"],
  ["klient/dzialka", "plot"],
  ["klient/projekt", "project"],
  ["klient/realizacja", "fulfillment"],
  ["klient/rejestracja", "registration"],
  ["logowanie", "login"],
  // Bezsegmentowy "/klient" (usunięcie segmentu, nie zamiana słowa): musi być
  // ostatni, żeby nie złapać żadnego z dłuższych wpisów wyżej pierwszy.
  ["klient", ""],
];

const OLD_PRODUCER_ROUTES: readonly [oldPrefix: string, newPrefix: string][] = [
  ["producent/panel/zapytania", "producer/panel/inquiries"],
  ["producent/panel/produkty", "producer/panel/products"],
  ["producent/panel/projekt", "producer/panel/project"],
  ["producent/panel", "producer/panel"],
  ["producent/rejestracja", "producer/registration"],
  ["producent/realizacje", "producer/fulfillments"],
  ["producent/realizacja", "producer/fulfillment"],
  ["producent/domykanie-luk", "producer/gap-closure"],
  ["producent/gotowosc-eksportowa", "producer/export-readiness"],
  ["producent/weryfikacja-firmy", "producer/company-verification"],
  // Bezsegmentowy "/producent": musi być ostatni, patrz uwaga przy "klient" wyżej.
  ["producent", "producer"],
];

// Jedyny wpis w całej tabeli tras (spec 0036 `## Decision`), gdzie zmieniony
// segment leży PO dynamicznym id, nie tylko przed nim: samo dopasowanie
// prefiksu (jak w OLD_PRODUCER_ROUTES) nie umie przepisać "edytuj" na "edit"
// za nieznaną wartością id, więc dostaje własną, jawną regułę sprawdzaną przed
// ogólną tabelą.
const PRODUCT_EDIT_OLD_PATH = /^producent\/panel\/produkty\/([^/]+)\/edytuj$/;

function redirectOldPrefixedRoute(
  request: NextRequest,
  locale: string,
  restPath: string,
  routes: readonly [oldPrefix: string, newPrefix: string][],
): NextResponse | null {
  for (const [oldPrefix, newPrefix] of routes) {
    const isExactMatch = restPath === oldPrefix;
    const isNestedMatch = restPath.startsWith(`${oldPrefix}/`);
    if (!isExactMatch && !isNestedMatch) continue;

    const remainder = restPath.slice(oldPrefix.length);
    const newRestPath = `${newPrefix}${remainder}`;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${newRestPath ? `/${newRestPath}` : ""}`;
    return NextResponse.redirect(url, 308);
  }
  return null;
}

function redirectOldRoute(request: NextRequest, locale: string, restPath: string): NextResponse | null {
  const productEditMatch = restPath.match(PRODUCT_EDIT_OLD_PATH);
  if (productEditMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/producer/panel/products/${productEditMatch[1]}/edit`;
    return NextResponse.redirect(url, 308);
  }

  return (
    redirectOldPrefixedRoute(request, locale, restPath, OLD_CUSTOMER_ROUTES) ??
    redirectOldPrefixedRoute(request, locale, restPath, OLD_PRODUCER_ROUTES)
  );
}

const OLD_INTERNAL_ROUTES: readonly [oldPrefix: string, newPrefix: string][] = [
  ["internal/zapytania", "internal/inquiries"],
  ["internal/produkty", "internal/products"],
];

function renamedInternalPath(restPath: string): string {
  for (const [oldPrefix, newPrefix] of OLD_INTERNAL_ROUTES) {
    if (restPath === oldPrefix) return newPrefix;
    if (restPath.startsWith(`${oldPrefix}/`)) return `${newPrefix}${restPath.slice(oldPrefix.length)}`;
  }
  return restPath;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (first && UNRECOGNIZED_LOCALE_SEGMENT.test(first) && !routing.locales.includes(first as (typeof routing.locales)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${rest.length ? `/${rest.join("/")}` : ""}`;
    return NextResponse.redirect(url);
  }

  if (first && routing.locales.includes(first as (typeof routing.locales)[number]) && rest.length > 0) {
    const oldRouteRedirect = redirectOldRoute(request, first, rest.join("/"));
    if (oldRouteRedirect) return oldRouteRedirect;
  }

  // Panel administratora (app/[locale]/internal/...) zostaje wyłącznie po
  // polsku (spec 0028 AC-1): wejście pod /en|nl/internal/... przekierowuje na
  // ten sam adres pod /pl/internal/..., zamiast wyrenderować się po
  // angielsku/niderlandzku. Stare polskie segmenty (zapytania, produkty)
  // przekierowują na nowe angielskie (spec 0036 AC-4, AC-5) w tym samym
  // skoku co blokada języka, żeby /en/internal/zapytania trafiło od razu na
  // /pl/internal/inquiries, nie przez pośredni /pl/internal/zapytania (spec
  // 0036 Feature design).
  if (first && routing.locales.includes(first as (typeof routing.locales)[number]) && rest[0] === "internal") {
    const restPath = rest.join("/");
    const newRestPath = renamedInternalPath(restPath);
    const isOldSegment = newRestPath !== restPath;
    const needsLocaleFix = first !== routing.defaultLocale;
    if (isOldSegment || needsLocaleFix) {
      const url = request.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}/${newRestPath}`;
      return isOldSegment ? NextResponse.redirect(url, 308) : NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
