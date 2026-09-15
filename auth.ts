import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accounts,
  client,
  pendingRegistration,
  producer,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "client" | "producer" | "admin";
      phone: string;
    } & DefaultSession["user"];
  }
}

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...baseAdapter,
    // Auth.js's default createUser has no concept of role/phone and would
    // violate the NOT NULL constraint on users.role (no default, on purpose,
    // spec 0018). Confirming a magic link for an unknown user reads the data
    // the registration form staged in pending_registration, creates
    // users+client/producer from it, then deletes the staging row (spec 0023
    // Key invariants). requestLogin (lib/auth-registration.ts) guarantees this
    // row exists before ever calling signIn for an email with no users row.
    async createUser(userData) {
      const email = userData.email;
      if (!email) {
        throw new Error("Auth.js tried to create a user without an email.");
      }

      const [pending] = await db
        .select()
        .from(pendingRegistration)
        .where(eq(pendingRegistration.email, email));

      if (!pending) {
        throw new Error(
          "Brak oczekującej rejestracji dla tego adresu e mail. Zarejestruj się najpierw."
        );
      }

      const payload = pending.payload;

      const [createdUser] = await db
        .insert(users)
        .values({
          email,
          name: payload.name,
          phone: payload.phone,
          role: pending.role,
          emailVerified: userData.emailVerified ?? new Date(),
        })
        .returning();

      if (pending.role === "client") {
        // Checkbox "Jestem inwestorem" (spec 0040): oba pola wypełnione ->
        // b2bVerificationStatus 'pending', dokładnie ten sam mechanizm co
        // submitClientB2bDetails (spec 0037).
        const isInvestor = Boolean(payload.nip && payload.companyName);
        await db.insert(client).values({
          userId: createdUser.id,
          nip: payload.nip,
          companyName: payload.companyName,
          b2bVerificationStatus: isInvestor ? "pending" : "not_submitted",
        });
      } else if (pending.role === "producer" && payload.nip && payload.countryCode) {
        await db.insert(producer).values({
          userId: createdUser.id,
          nip: payload.nip,
          name: payload.name,
          countryCode: payload.countryCode,
          productionScale: payload.productionScale,
        });
      }

      await db.delete(pendingRegistration).where(eq(pendingRegistration.email, email));

      return {
        id: createdUser.id,
        email: createdUser.email,
        emailVerified: createdUser.emailVerified,
        name: createdUser.name,
        image: createdUser.image,
      };
    },
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? "ModularHub Europe <logowanie@modularhub.eu>",
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      const dbUser = user as unknown as typeof users.$inferSelect;
      session.user.id = user.id;
      session.user.role = dbUser.role;
      session.user.phone = dbUser.phone;
      return session;
    },
  },
  events: {
    // AC-7 (spec 0037): powiązanie project_request/bulk_product_inquiry z
    // kontem po e mailu, na każdym udanym logowaniu klienta (idempotentne,
    // patrz lib/project-quote-actions.ts linkRequestsToClientOnLogin).
    // Import wewnątrz handlera, nie na górze pliku: unika cyklu
    // auth.ts -> project-quote-actions.ts -> auth.ts (signIn).
    async signIn({ user }) {
      const dbUser = user as unknown as typeof users.$inferSelect;
      if (dbUser.role !== "client" || !dbUser.email) return;
      const { getClientIdForUser } = await import("@/lib/db/queries");
      const { linkRequestsToClientOnLogin } = await import("@/lib/project-quote-actions");
      const clientId = await getClientIdForUser(dbUser.id);
      if (clientId) await linkRequestsToClientOnLogin(dbUser.email, clientId);
    },
  },
});
