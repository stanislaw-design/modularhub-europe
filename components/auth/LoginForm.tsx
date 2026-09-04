"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Heading, Input, Label, Stack, Text } from "@/components/ui";
import { requestLogin, type LoginActionState } from "@/lib/auth-registration";

interface LoginFormProps {
  locale: string;
  callbackUrl: string;
}

const initialState: LoginActionState = { status: "idle" };

export function LoginForm({ locale, callbackUrl }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(requestLogin, initialState);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1">Sprawdź swoją skrzynkę</Heading>
        <Text tone="muted">
          Wysłaliśmy link logowania na podany adres e mail. Kliknij go, żeby się zalogować — link jest
          ważny przez 24 godziny.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level="h1">Zaloguj się</Heading>
      <Text tone="muted">Podaj adres e mail, na który wyślemy link logowania. Bez hasła.</Text>
      <form action={formAction} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Stack gap={1}>
          <Label htmlFor="login-email" required>
            E-mail
          </Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" required />
        </Stack>
        {state.status === "error" && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {state.message}
          </p>
        )}
        {state.status === "unknown-email" && (
          <Stack gap={2}>
            <p className="font-sans text-body text-status-blocked" role="alert">
              Nie znaleźliśmy konta na ten adres e mail. Załóż konto, żeby się zalogować.
            </p>
            <Stack direction="row" gap={2}>
              <Link
                href={`/${locale}/klient/rejestracja?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
              >
                Zarejestruj się jako klient
              </Link>
              <Link
                href={`/${locale}/producent/rejestracja?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
              >
                Zarejestruj się jako producent
              </Link>
            </Stack>
          </Stack>
        )}
        <Button type="submit" disabled={isPending} className="w-fit">
          Wyślij link logowania
        </Button>
      </form>
    </Stack>
  );
}
