"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { producer } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import { producerCompanyInputSchema, type ProducerCompanyFormInput } from "@/lib/producer-company";

export interface UpdateProducerCompanyResult {
  ok: boolean;
  error?: string;
  fieldErrors?: { name?: string; technology?: string };
}

const UNAUTHORIZED_ERROR = "Musisz być zalogowany jako producent.";

// Spec 0074 AC-11, AC-15: producent zmienia nazwę i technologię własnej firmy. producerId
// pochodzi z sesji (requireProducerActor), nigdy z danych formularza; NIP, kraj i status
// weryfikacji nie są w tym zapisie. Zapis idzie przez withAdminActor, więc wiersz audit_log
// niesie actor_user_id producenta (spec 0064). Błąd walidacji wraca do formularza, bez wyjątku.
export async function updateProducerCompany(input: ProducerCompanyFormInput): Promise<UpdateProducerCompanyResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = producerCompanyInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: NonNullable<UpdateProducerCompanyResult["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "name" || field === "technology") && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  try {
    await withAdminActor(actor.userId, [
      db
        .update(producer)
        .set({ name: parsed.data.name, technology: parsed.data.technology, updatedAt: new Date() })
        .where(eq(producer.id, actor.producerId)),
    ]);
  } catch (error) {
    captureError(error, { path: "updateProducerCompany", userId: actor.userId });
    return { ok: false, error: "Nie udało się zapisać danych firmy. Spróbuj ponownie." };
  }

  revalidatePath("/[locale]/producer/panel", "layout");
  return { ok: true };
}
