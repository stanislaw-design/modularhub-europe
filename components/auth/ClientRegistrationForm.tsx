"use client";

import { Landmark, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Card, Checkbox, Heading, Input, Label, Stack, Text } from "@/components/ui";
import { registerClient, type RegistrationActionState } from "@/lib/auth-registration";

interface ClientRegistrationFormProps {
  locale: string;
  callbackUrl: string;
}

const initialState: RegistrationActionState = { status: "idle" };

function SectionHeading({ icon: Icon, children }: { icon: typeof User; children: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-brand-v5-amber-strong" aria-hidden="true" />
      <Text as="span" variant="label" surface="v5">
        {children}
      </Text>
    </div>
  );
}

export function ClientRegistrationForm({ locale, callbackUrl }: ClientRegistrationFormProps) {
  const t = useTranslations("ClientRegistrationForm");
  const [state, formAction, isPending] = useActionState(registerClient, initialState);
  // Checkbox "Jestem inwestorem" (spec 0040 AC-6): steruje tylko wymaganiem
  // pól NIP/nazwa firmy, nie ich widocznością (zawsze widoczne).
  const [isInvestor, setIsInvestor] = useState(false);

  if (state.status === "sent") {
    return (
      <Stack gap={3}>
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
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading level="h1" surface="v5">
          {t("heading")}
        </Heading>
        <Text tone="muted" surface="v5">
          {t("intro")}
        </Text>
      </Stack>
      <Card surface="v5" padding="lg" className="p-brand-3 shadow-sm sm:p-brand-4">
        <form action={formAction} className="flex flex-col gap-brand-4" noValidate>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-2 lg:gap-brand-6">
            <Stack gap={2}>
              <SectionHeading icon={User}>{t("sectionContactHeading")}</SectionHeading>
              <Stack gap={1}>
                <Label htmlFor="client-reg-name" required surface="v5">
                  {t("nameLabel")}
                </Label>
                <Input id="client-reg-name" name="name" type="text" autoComplete="name" required surface="v5" />
              </Stack>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="client-reg-email" required surface="v5">
                    E-mail
                  </Label>
                  <Input id="client-reg-email" name="email" type="email" autoComplete="email" required surface="v5" />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="client-reg-phone" required surface="v5">
                    {t("phoneLabel")}
                  </Label>
                  <Input id="client-reg-phone" name="phone" type="tel" autoComplete="tel" required surface="v5" />
                </Stack>
              </div>
            </Stack>

            <Stack gap={2} className="lg:border-l lg:border-brand-v5-line lg:pl-brand-5">
              <SectionHeading icon={Landmark}>{t("sectionInvestorHeading")}</SectionHeading>
              <label
                htmlFor="client-reg-investor"
                className={`flex cursor-pointer items-start gap-brand-2 rounded-v5-card border p-brand-3 transition-colors ${
                  isInvestor ? "border-brand-v5-amber bg-brand-v5-amber/5" : "border-brand-v5-line hover:border-brand-v5-muted"
                }`}
              >
                <Checkbox
                  id="client-reg-investor"
                  name="isInvestor"
                  surface="v5"
                  checked={isInvestor}
                  onChange={(event) => setIsInvestor(event.target.checked)}
                  className="mt-0.5"
                />
                <Stack gap={1}>
                  <Text as="span" surface="v5" className="font-medium">
                    {t("investorLabel")}
                  </Text>
                  <Text tone="muted" surface="v5">
                    {t("investorDescription")}
                  </Text>
                </Stack>
              </label>
              <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2">
                <Stack gap={1}>
                  <Label htmlFor="client-reg-nip" required={isInvestor} surface="v5">
                    NIP
                  </Label>
                  <Input id="client-reg-nip" name="nip" type="text" required={isInvestor} surface="v5" />
                </Stack>
                <Stack gap={1}>
                  <Label htmlFor="client-reg-company-name" required={isInvestor} surface="v5">
                    {t("companyNameLabel")}
                  </Label>
                  <Input
                    id="client-reg-company-name"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    required={isInvestor}
                    surface="v5"
                  />
                </Stack>
              </div>
            </Stack>
          </div>

          {state.status === "error" && (
            <p className="font-sans text-body text-status-blocked" role="alert">
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending} surface="v5" size="lg" className="w-full sm:w-fit sm:self-end">
            {t("submitButton")}
          </Button>
        </form>
      </Card>
      <Text tone="muted" surface="v5">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={`/${locale}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="focus-ring rounded-data font-medium text-brand-v5-ink underline"
        >
          {t("loginLink")}
        </Link>
      </Text>
    </Stack>
  );
}
