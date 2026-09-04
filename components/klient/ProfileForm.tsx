"use client";

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
        setError(result.error ?? "Nie udało się zapisać zmian. Spróbuj ponownie.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate>
      <Stack gap={1}>
        <Label htmlFor="profile-email">E-mail</Label>
        <Input id="profile-email" type="email" value={email} disabled readOnly />
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="profile-name" required>
          Imię i nazwisko
        </Label>
        <Input
          id="profile-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Stack>
      <Stack gap={1}>
        <Label htmlFor="profile-phone" required>
          Telefon
        </Label>
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
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
          Zapisano zmiany.
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Zapisywanie…" : error ? "Ponów zapis" : "Zapisz zmiany"}
      </Button>
    </form>
  );
}
