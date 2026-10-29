"use server";

import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/lib/db/client";
import { isAdminInviteExpired } from "@/lib/admin-invite";
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

// Spec 0077 D AC-37: wiersz pending_registration z rolą admin należy do zaproszenia. Publiczna
// rejestracja go nie nadpisuje, bo inaczej każdy mógłby zamienić zaproszenie w konto klienta
// (a adresu nie dałoby się już zaprosić). Zwracamy ten sam ogólny błąd, co przy każdej innej
// porażce, żeby nie zdradzać, że adres jest zaproszony.
const REGISTRATION_BLOCKED_MESSAGE = "Nie udało się rozpocząć rejestracji. Spróbuj ponownie lub skontaktuj się z nami.";

async function hasAdminInvite(email: string): Promise<boolean> {
  const [pending] = await db
    .select({ role: pendingRegistration.role })
    .from(pendingRegistration)
    .where(and(eq(pendingRegistration.email, email), eq(pendingRegistration.role, "admin")));
  return Boolean(pending);
}

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

  if (await hasAdminInvite(email)) return { status: "error", message: REGISTRATION_BLOCKED_MESSAGE };

  const payload: PendingRegistrationPayload = { name, phone, nip: nip || undefined, companyName: companyName || undefined };
  // setWhere to druga warstwa na wyścig: zaproszenie admina mogło powstać po sprawdzeniu wyżej.
  const written = await db
    .insert(pendingRegistration)
    .values({ email, role: "client", payload })
    .onConflictDoUpdate({
      target: pendingRegistration.email,
      set: { role: "client", payload, createdAt: new Date() },
      setWhere: ne(pendingRegistration.role, "admin"),
    })
    .returning({ email: pendingRegistration.email });
  if (written.length === 0) return { status: "error", message: REGISTRATION_BLOCKED_MESSAGE };

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

  if (await hasAdminInvite(email)) return { status: "error", message: REGISTRATION_BLOCKED_MESSAGE };

  const payload: PendingRegistrationPayload = {
    name,
    phone,
    nip,
    countryCode,
    productionScale: productionScale as PendingRegistrationPayload["productionScale"],
  };
  const written = await db
    .insert(pendingRegistration)
    .values({ email, role: "producer", payload })
    .onConflictDoUpdate({
      target: pendingRegistration.email,
      set: { role: "producer", payload, createdAt: new Date() },
      setWhere: ne(pendingRegistration.role, "admin"),
    })
    .returning({ email: pendingRegistration.email });
  if (written.length === 0) return { status: "error", message: REGISTRATION_BLOCKED_MESSAGE };

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
      .select({ role: pendingRegistration.role, createdAt: pendingRegistration.createdAt })
      .from(pendingRegistration)
      .where(eq(pendingRegistration.email, email));
    if (!pending) {
      return { status: "unknown-email" };
    }
    // Spec 0077 D AC-36: wygasłe zaproszenie admina nie tworzy konta, więc nie wysyłamy linku,
    // który skończyłby się błędem w createUser (admin wysyła zaproszenie ponownie).
    if (pending.role === "admin" && isAdminInviteExpired(pending.createdAt)) {
      return { status: "unknown-email" };
    }
  }

  const result = await sendMagicLink(email, callbackUrl);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "sent" };
}
