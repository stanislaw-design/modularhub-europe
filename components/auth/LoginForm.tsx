"use client";

import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import Link from "next/link";
import { Button, Card, Heading, Input, Label, Stack, Text } from "@/components/ui";
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
      <Stack gap={3} align="center" className="text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <Heading level="h1" surface="v5">
          {t("checkInboxHeading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {t("checkInboxBody")}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Stack gap={2} align="center" className="text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <Stack gap={1} align="center">
          <Heading level="h1" surface="v5">
            {t("heading")}
          </Heading>
          <Text tone="muted" surface="v5">
            {t("intro")}
          </Text>
        </Stack>
      </Stack>
      <Card surface="v5" padding="lg" className="shadow-sm">
        <form action={formAction} className="flex flex-col gap-brand-3" noValidate>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Stack gap={1}>
            <Label htmlFor="login-email" required surface="v5">
              E-mail
            </Label>
            <Input id="login-email" name="email" type="email" autoComplete="email" required surface="v5" />
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
                  href={`/${locale}/registration?role=client&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
                >
                  {t("registerAsClient")}
                </Link>
                <Link
                  href={`/${locale}/registration?role=producer&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="focus-ring rounded-data text-body font-medium text-brand-v5-amber-strong underline"
                >
                  {t("registerAsProducer")}
                </Link>
              </Stack>
            </Stack>
          )}
          <Button type="submit" disabled={isPending} surface="v5">
            {t("submitButton")}
          </Button>
          <Link
            href={`/${locale}/registration?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="focus-ring mx-auto w-fit rounded-data text-body font-medium text-brand-v5-amber-strong underline"
          >
            {t("createAccount")}
          </Link>
        </form>
      </Card>
    </Stack>
  );
}
