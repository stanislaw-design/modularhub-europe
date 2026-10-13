"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { projectRequestProducerOverride } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { captureError } from "@/lib/observability";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const setProducerOverrideSchema = z.object({
  projectRequestId: z.uuid(),
  producerId: z.uuid(),
  mode: z.enum(["include", "exclude", "none"]),
});

// Spec 0070 AC-10: administrator dodaje (`include`) albo wyklucza (`exclude`)
// producenta wyjątkiem od reguły dopasowania, albo zdejmuje wyjątek (`none`).
// Wyjątki dotyczą tylko zapytania wolnego (project_request). Wyjątek `exclude`
// blokuje nowe wersje oferty, ale nie usuwa już złożonej (index.md, Dopasowanie).
// Zmiana idzie przez withAdminActor, więc trafia do dziennika audytu (AC-22).
export async function setProducerOverride(
  projectRequestId: string,
  producerId: string,
  mode: "include" | "exclude" | "none",
): Promise<ActionResult> {
  const parsed = setProducerOverrideSchema.safeParse({ projectRequestId, producerId, mode });
  if (!parsed.success) return { ok: false, error: "Sprawdź dane wyjątku." };

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  try {
    if (parsed.data.mode === "none") {
      await withAdminActor(adminId, [
        db
          .delete(projectRequestProducerOverride)
          .where(
            and(
              eq(projectRequestProducerOverride.projectRequestId, parsed.data.projectRequestId),
              eq(projectRequestProducerOverride.producerId, parsed.data.producerId),
            ),
          ),
      ]);
    } else {
      await withAdminActor(adminId, [
        db
          .insert(projectRequestProducerOverride)
          .values({
            projectRequestId: parsed.data.projectRequestId,
            producerId: parsed.data.producerId,
            mode: parsed.data.mode,
            createdByUserId: adminId,
          })
          .onConflictDoUpdate({
            target: [projectRequestProducerOverride.projectRequestId, projectRequestProducerOverride.producerId],
            set: { mode: parsed.data.mode, createdByUserId: adminId, createdAt: new Date() },
          }),
      ]);
    }
  } catch (error) {
    if (getPgErrorCode(error) === "23503") return { ok: false, error: "Nie znaleziono zapytania albo producenta." };
    captureError(error, { path: "setProducerOverride", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać wyjątku. Spróbuj ponownie." };
  }
  return { ok: true };
}
