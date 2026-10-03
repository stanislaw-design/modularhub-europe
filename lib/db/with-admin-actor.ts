import { sql } from "drizzle-orm";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import { db } from "@/lib/db/client";

// Spec 0064 (atrybucja audytu panelu admina): the one place that sets
// app.actor_user_id for the audit trigger (drizzle/0048_message_audit_trigger.sql,
// drizzle/0026_case_channels_messages.sql) to read. The session setting only
// lives for one transaction, and this driver (drizzle-orm/neon-http) makes
// every standalone db.update()/db.insert() its own transaction (see
// lib/db/AGENTS.md), so the setting has to travel in the same db.batch([...])
// call as the write(s) it should apply to. set_config(...) is used instead of
// a literal SET LOCAL because Postgres does not accept a bound parameter
// inside a SET/SET LOCAL statement.
//
// The set_config call's own result is always dropped before returning, so a
// caller migrated to use this helper sees the exact same result array (same
// length, same indices) it would have gotten from db.batch(statements)
// directly.
export async function withAdminActor<U extends BatchItem<"pg">, T extends readonly [U, ...U[]]>(
  actorUserId: string,
  statements: T,
): Promise<BatchResponse<T>> {
  const results = await db.batch([
    db.execute(sql`select set_config('app.actor_user_id', ${actorUserId}, true)`),
    ...statements,
  ]);
  return results.slice(1) as unknown as BatchResponse<T>;
}
