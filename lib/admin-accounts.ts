import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { adminInviteExpiresAt, isAdminInviteExpired } from "@/lib/admin-invite";
import { db } from "@/lib/db/client";
import { pendingRegistration, users } from "@/lib/db/schema";

// Spec 0077 część D AC-34: odczyt listy administratorów i otwartych zaproszeń dla /internal/admins.
// Dane osobowe pracowników (imię, e mail, telefon) widzą tylko admini, ekran ma własną bramkę roli.

export interface AdminAccountRow {
  id: string;
  name: string | null;
  email: string;
  since: Date;
  blockedAt: Date | null;
  blockedReason: string | null;
}

export interface AdminInviteRow {
  email: string;
  name: string;
  sentAt: Date;
  validUntil: Date;
  expired: boolean;
}

export async function getAdminAccounts(): Promise<{ active: AdminAccountRow[]; blocked: AdminAccountRow[] }> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      since: users.createdAt,
      blockedAt: users.blockedAt,
      blockedReason: users.blockedReason,
    })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.deletedAt)))
    .orderBy(asc(users.createdAt));
  return { active: rows.filter((row) => !row.blockedAt), blocked: rows.filter((row) => row.blockedAt) };
}

export async function getOpenAdminInvites(now: Date = new Date()): Promise<AdminInviteRow[]> {
  const rows = await db
    .select({ email: pendingRegistration.email, payload: pendingRegistration.payload, createdAt: pendingRegistration.createdAt })
    .from(pendingRegistration)
    .where(eq(pendingRegistration.role, "admin"))
    .orderBy(desc(pendingRegistration.createdAt));
  return rows.map((row) => ({
    email: row.email,
    name: row.payload.name,
    sentAt: row.createdAt,
    validUntil: adminInviteExpiresAt(row.createdAt),
    expired: isAdminInviteExpired(row.createdAt, now),
  }));
}
