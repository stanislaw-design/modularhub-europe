"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/lib/db/client";
import { pendingRegistration, producer, users } from "@/lib/db/schema";
import { PRODUCER_PRODUCTION_SCALES } from "@/lib/producer-production-scale";
import type { PendingRegistrationPayload } from "@/lib/auth-shared";

export interface RegistrationActionState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export interface LoginActionState {
  status: "idle" | "sent" | "unknown-email" | "error";
  message?: string;
}

const productionScaleValues = PRODUCER_PRODUCTION_SCALES.map((option) => option.value) as [
  string,
  ...string[],
];

// Checkbox "Jestem inwestorem" (spec 0040 AC-6): NIP/nazwa firmy są zawsze
// opcjonalne w Zod, ale wymagane (superRefine) gdy checkbox zaznaczony.
// Odznaczony (klient prywatny) → oba pola opcjonalne, jak dziś.
const clientSchema = z
  .object({
    name: z.string().trim().min(1, "Podaj imię i nazwisko."),
    email: z.email("Podaj prawidłowy adres e mail."),
    phone: z.string().trim().min(5, "Podaj numer telefonu."),
    isInvestor: z.boolean(),
    nip: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
    callbackUrl: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (!data.isInvestor) return;
    if (!data.nip) {
      ctx.addIssue({ code: "custom", message: "Podaj NIP.", path: ["nip"] });
    }
    if (!data.companyName) {
      ctx.addIssue({ code: "custom", message: "Podaj nazwę firmy.", path: ["companyName"] });
    }
  });

const producerSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę firmy."),
  email: z.email("Podaj prawidłowy adres e mail."),
  phone: z.string().trim().min(5, "Podaj numer telefonu."),
  nip: z.string().trim().min(1, "Podaj NIP."),
  countryCode: z.enum(["PL", "DE", "NL"], "Wybierz kraj."),
  productionScale: z.enum(productionScaleValues, "Wybierz skalę produkcji."),
  callbackUrl: z.string().min(1),
});

const loginSchema = z.object({
  email: z.email("Podaj prawidłowy adres e mail."),
  callbackUrl: z.string().min(1),
});

async function sendMagicLink(email: string, callbackUrl: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await signIn("resend", { email, redirect: false, redirectTo: callbackUrl });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Nie udało się wysłać e maila logowania. Spróbuj ponownie." };
    }
    throw error;
  }
}

// Rejestracja NIE zapisuje od razu do users/client. Staguje dane w
// pending_registration (kluczowane e mailem); users+client powstają dopiero
// przy pierwszym udanym logowaniu (auth.ts createUser, spec 0023 Key invariants).
export async function registerClient(
  _prevState: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    isInvestor: formData.get("isInvestor") === "on",
    nip: formData.get("nip"),
    companyName: formData.get("companyName"),
    callbackUrl: formData.get("callbackUrl"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const { name, email, phone, nip, companyName, callbackUrl } = parsed.data;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser) {
    return { status: "error", message: "Ten adres e mail ma już założone konto. Zaloguj się zamiast rejestracji." };
  }

  const payload: PendingRegistrationPayload = { name, phone, nip: nip || undefined, companyName: companyName || undefined };
  await db
    .insert(pendingRegistration)
    .values({ email, role: "client", payload })
    .onConflictDoUpdate({
      target: pendingRegistration.email,
      set: { role: "client", payload, createdAt: new Date() },
    });

  const result = await sendMagicLink(email, callbackUrl);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "sent" };
}

export async function registerProducer(
  _prevState: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  const parsed = producerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    nip: formData.get("nip"),
    countryCode: formData.get("countryCode"),
    productionScale: formData.get("productionScale"),
    callbackUrl: formData.get("callbackUrl"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const { name, email, phone, nip, countryCode, productionScale, callbackUrl } = parsed.data;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser) {
    return { status: "error", message: "Ten adres e mail ma już założone konto. Zaloguj się zamiast rejestracji." };
  }

  const [existingProducer] = await db.select({ id: producer.id }).from(producer).where(eq(producer.nip, nip));
  if (existingProducer) {
    return { status: "error", message: "Ten NIP jest już zarejestrowany na platformie." };
  }

  const payload: PendingRegistrationPayload = {
    name,
    phone,
    nip,
    countryCode,
    productionScale: productionScale as PendingRegistrationPayload["productionScale"],
  };
  await db
    .insert(pendingRegistration)
    .values({ email, role: "producer", payload })
    .onConflictDoUpdate({
      target: pendingRegistration.email,
      set: { role: "producer", payload, createdAt: new Date() },
    });

  const result = await sendMagicLink(email, callbackUrl);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "sent" };
}

// Wysyła link logowania tylko dla e maila ze znanym kontem (users) lub
// oczekującą rejestracją (pending_registration); w przeciwnym razie prosi o
// rejestrację zamiast wywoływać signIn, co ochroniłoby przed domyślnym
// zachowaniem adaptera próbującym utworzyć pusty wiersz users (spec 0023 AC-11).
export async function requestLogin(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    callbackUrl: formData.get("callbackUrl"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Podaj prawidłowy adres e mail." };
  }
  const { email, callbackUrl } = parsed.data;

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!existingUser) {
    const [pending] = await db
      .select({ email: pendingRegistration.email })
      .from(pendingRegistration)
      .where(eq(pendingRegistration.email, email));
    if (!pending) {
      return { status: "unknown-email" };
    }
  }

  const result = await sendMagicLink(email, callbackUrl);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "sent" };
}
