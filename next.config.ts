import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// R2_PUBLIC_DOMAIN nie jest jeszcze ustawione (kubełek R2 to ręczny krok poza
// kodem, spec 0031 Follow-up); wzorzec jest dodawany dopiero, gdy domena
// istnieje, żeby build nie wymagał zmiennej, której jeszcze nie ma.
const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN;

const nextConfig: NextConfig = {
  // Next.js 16 domyślnie odrzuca akcje serwerowe powyżej 1 MB na poziomie
  // transportu, zanim walidacja pliku w kodzie akcji w ogóle zobaczy bajty
  // (spec 0063 AC-12). 24mb daje zapas na narzut multipart ponad limit 20 MB
  // PDF-a wyceny (lib/project-quote-actions.ts uploadProjectQuotePdf);
  // globalne dla każdej akcji serwerowej, nie tylko tej jednej.
  //
  // Osobny, niezależny limit: `proxy.ts` (nowa nazwa middleware w Next.js 16)
  // bufferuje całe body żądania do odczytu, z własnym domyślnym limitem 10 MB
  // (`proxyClientMaxBodySize`, następca przestarzałego `middlewareClientMaxBodySize`).
  // Matcher w proxy.ts łapie prawie każdą trasę, w tym tę z uploadem PDF-a, więc
  // bez podniesienia TEGO limitu żądanie powyżej 10 MB jest ucinane w połowie,
  // zanim w ogóle dotrze do akcji serwerowej (spec 0063, znalezione przez
  // /check verify: plik 10-20 MB wywalał nieprzechwycony "Unexpected end of
  // form" zamiast zapisać wycenę i pokazać błąd tylko przy polu pliku).
  experimental: {
    serverActions: {
      bodySizeLimit: "24mb",
    },
    proxyClientMaxBodySize: "24mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "domihaus.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "konfigurator.dampol-investment.com",
        pathname: "/static/thumbnail/shop-configurator-option/**",
      },
      ...(r2PublicDomain
        ? [
            {
              protocol: "https" as const,
              hostname: r2PublicDomain,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sentryUrl: process.env.SENTRY_URL,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
