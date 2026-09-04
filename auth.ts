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
        await db.insert(client).values({ userId: createdUser.id });
      } else if (pending.role === "producer" && payload.nip && payload.countryCode && payload.technology) {
        await db.insert(producer).values({
          userId: createdUser.id,
          nip: payload.nip,
          name: payload.name,
          countryCode: payload.countryCode,
          technology: payload.technology,
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
});
