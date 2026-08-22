import type { Metadata } from "next";
import "../globals.css";
import { locales } from "../i18n";
import { manrope, inter, ibmPlexMono } from "../fonts";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "ModularHub Europe",
  description: "One project. Different rules. One clear path.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html
      lang={locale}
      className={`h-full antialiased ${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
