import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// R2_PUBLIC_DOMAIN nie jest jeszcze ustawione (kubełek R2 to ręczny krok poza
// kodem, spec 0031 Follow-up); wzorzec jest dodawany dopiero, gdy domena
// istnieje, żeby build nie wymagał zmiennej, której jeszcze nie ma.
const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN;

const nextConfig: NextConfig = {
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
