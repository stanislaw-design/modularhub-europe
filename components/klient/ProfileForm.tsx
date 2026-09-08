"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { Button, Input, Label, Stack } from "@/components/ui";
import { updateProfile } from "@/lib/profile-actions";

interface ProfileFormProps {
  email: string;
  initialName: string;
  initialPhone: string;
}

// E mail podglądowy, bez edycji (spec 0024 AC-7, Key invariants). Błąd
// zapisu pokazuje komunikat w miejscu z przyciskiem ponów, bez utraty
// wprowadzonych danych (AC-8): pola formularza zostają w lokalnym stanie
// niezależnie od wyniku zapisu.
export function ProfileForm({ email, initialName, initialPhone }: ProfileFormProps) {
  const t = useTranslations("ProfileForm");
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateProfile(name, phone);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate>
      <Stack gap={1}>
        <Label htmlFor="profile-email" surface="v5">
          E-mail
        </Label>
        <Input id="profile-email" type="email" value={email} disabled readOnly surface="v5" />
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="profile-name" required surface="v5">
          {t("nameLabel")}
        </Label>
        <Input
          id="profile-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          surface="v5"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="profile-phone" required surface="v5">
          {t("phoneLabel")}
        </Label>
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          surface="v5"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Stack>
      {error && (
        <p className="font-sans text-body text-status-blocked" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="font-sans text-body text-status-approved" role="status">
          {t("savedMessage")}
        </p>
      )}
      <Button type="submit" disabled={isPending} surface="v5" className="w-fit">
        {isPending ? t("savingLabel") : error ? t("retryLabel") : t("saveLabel")}
      </Button>
    </form>
  );
}
