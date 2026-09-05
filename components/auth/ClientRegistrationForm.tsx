"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Heading, Input, Label, Stack, Text } from "@/components/ui";
import { registerClient, type RegistrationActionState } from "@/lib/auth-registration";

interface ClientRegistrationFormProps {
  locale: string;
  callbackUrl: string;
}

const initialState: RegistrationActionState = { status: "idle" };

export function ClientRegistrationForm({ locale, callbackUrl }: ClientRegistrationFormProps) {
  const [state, formAction, isPending] = useActionState(registerClient, initialState);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1" surface="v5">
          Sprawdź swoją skrzynkę
        </Heading>
        <Text tone="muted" surface="v5">
          Wysłaliśmy link logowania na podany adres e mail. Kliknij go, żeby dokończyć zakładanie konta
          — link jest ważny przez 24 godziny.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        Załóż konto klienta
      </Heading>
      <Text tone="muted" surface="v5">
        Podaj swoje dane, żeby wysyłać zapytania do producentów. Bez hasła — logujesz się linkiem
        wysłanym e mailem.
      </Text>
      <form action={formAction} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Stack gap={1}>
          <Label htmlFor="client-reg-name" required surface="v5">
            Imię i nazwisko
          </Label>
          <Input id="client-reg-name" name="name" type="text" autoComplete="name" required surface="v5" />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="client-reg-email" required surface="v5">
            E-mail
          </Label>
          <Input id="client-reg-email" name="email" type="email" autoComplete="email" required surface="v5" />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="client-reg-phone" required surface="v5">
            Telefon
          </Label>
          <Input id="client-reg-phone" name="phone" type="tel" autoComplete="tel" required surface="v5" />
        </Stack>
        {state.status === "error" && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={isPending} surface="v5" className="w-fit">
          Załóż konto
        </Button>
      </form>
      <Text tone="muted" surface="v5">
        Masz już konto?{" "}
        <Link
          href={`/${locale}/logowanie?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="focus-ring rounded-data font-medium text-brand-v5-ink underline"
        >
          Zaloguj się
        </Link>
      </Text>
    </Stack>
  );
}
