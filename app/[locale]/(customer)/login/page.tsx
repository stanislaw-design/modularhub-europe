import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container, Stack } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LogowaniePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ locale }, { callbackUrl }] = await Promise.all([params, searchParams]);
  // Only ever redirect to a relative in-app path (open redirect protection,
  // per Auth.js's own "validate redirects" guidance).
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : `/${locale}`;

  return (
    <Container className="py-brand-6">
      <Stack gap={5} className="mx-auto max-w-md">
        <Link
          href={`/${locale}`}
          aria-label="ModularHub Europe — strona główna"
          className="focus-ring mx-auto rounded-data"
        >
          <BrandLogo className="text-base" />
        </Link>
        <LoginForm locale={locale} callbackUrl={safeCallbackUrl} />
      </Stack>
    </Container>
  );
}
