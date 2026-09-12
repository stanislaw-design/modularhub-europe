"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("LoginForm");
  const [state, formAction, isPending] = useActionState(requestLogin, initialState);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
        <Heading level="h1">{t("checkInboxHeading")}</Heading>
        <Text tone="muted">{t("checkInboxBody")}</Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level="h1">{t("heading")}</Heading>
      <Text tone="muted">{t("intro")}</Text>
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
              {t("unknownEmail")}
            </p>
            <Stack direction="row" gap={2}>
              <Link
                href={`/${locale}/registration?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
              >
                {t("registerAsClient")}
              </Link>
              <Link
                href={`/${locale}/producer/registration?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
              >
                {t("registerAsProducer")}
              </Link>
            </Stack>
          </Stack>
        )}
        <Button type="submit" disabled={isPending} className="w-fit">
          {t("submitButton")}
        </Button>
      </form>
    </Stack>
  );
}
