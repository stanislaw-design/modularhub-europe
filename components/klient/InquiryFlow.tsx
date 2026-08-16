"use client";

import { type FormEvent, useState } from "react";
import { Button, Heading, Input, Label, Stack, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import type { InquiryContact } from "@/lib/inquiry";
import { InquiryConfirmationCard } from "./InquiryConfirmationCard";

interface InquiryFlowProps {
  projects: Project[];
  resultsHref: string;
  dzialkaHref: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pluralizeDom(count: number): string {
  return count === 1 ? "dom" : "domy";
}

export function InquiryFlow({ projects, resultsHref, dzialkaHref }: InquiryFlowProps) {
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [contact, setContact] = useState<InquiryContact>({ name: "", email: "", phone: "" });
  const [emailTouched, setEmailTouched] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);

  const emailValid = EMAIL_PATTERN.test(contact.email);
  const canSubmit = contact.name.trim().length > 0 && emailValid && contact.phone.trim().length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSentAt(new Date());
    setPhase("sent");
  }

  if (phase === "sent" && sentAt) {
    return (
      <Stack gap={4}>
        <Heading level="h1">Zapytanie wysłane</Heading>
        <Text tone="muted">
          Potwierdzenie zapytania o {projects.length} {pluralizeDom(projects.length)} poniżej.
        </Text>
        <Stack gap={3}>
          {projects.map((project) => (
            <InquiryConfirmationCard key={project.id} project={project} sentAt={sentAt} />
          ))}
        </Stack>
        <Stack direction="row" gap={2}>
          <Button as="a" href={dzialkaHref} className="w-fit">
            Sprawdź działkę
          </Button>
          <Button as="a" href={resultsHref} variant="secondary" className="w-fit">
            Wróć do wyników
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Heading level="h1">Zapytanie o wybrane domy</Heading>
      <Text tone="muted">
        Wysyłasz jedno zapytanie o {projects.length} {pluralizeDom(projects.length)}:{" "}
        {projects.map((project) => project.name).join(", ")}. Podaj dane kontaktowe, żeby producenci
        mogli się z Tobą skontaktować.
      </Text>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-brand-3" noValidate>
        <Stack gap={1}>
          <Label htmlFor="inquiry-name" required>
            Imię i nazwisko
          </Label>
          <Input
            id="inquiry-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={contact.name}
            onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-email" required>
            E-mail
          </Label>
          <Input
            id="inquiry-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            invalid={emailTouched && contact.email.length > 0 && !emailValid}
            aria-describedby={emailTouched && contact.email.length > 0 && !emailValid ? "inquiry-email-error" : undefined}
            value={contact.email}
            onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
            onBlur={() => setEmailTouched(true)}
          />
          {emailTouched && contact.email.length > 0 && !emailValid && (
            <p id="inquiry-email-error" className="font-sans text-body text-status-blocked">
              Podaj prawidłowy adres e-mail.
            </p>
          )}
        </Stack>
        <Stack gap={1}>
          <Label htmlFor="inquiry-phone" required>
            Telefon
          </Label>
          <Input
            id="inquiry-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={contact.phone}
            onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </Stack>
        <Button type="submit" disabled={!canSubmit} className="w-fit">
          Wyślij zapytanie
        </Button>
      </form>
    </Stack>
  );
}
