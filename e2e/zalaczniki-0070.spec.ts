import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
  client,
  inquiryAttachment,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  sessions,
  users,
} from "@/lib/db/schema";
import { deletePrivateObject } from "@/lib/storage/private-r2-client";

// Spec 0070 zadania 20 do 23 (AC-28 do AC-34): pliki inwestora w prawdziwej przeglądarce,
// z prawdziwym prywatnym magazynem R2 dev. Uruchamiać z DATABASE_URL i kluczami R2:
// node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/zalaczniki-0070.spec.ts
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n/Type /Page\nendobj\n%%EOF", "latin1");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("spec 0070: pliki inwestora", () => {
  const id = crypto.randomUUID().slice(0, 8);
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const matchedUserId = crypto.randomUUID();
  const matchedProducerId = crypto.randomUUID();
  const strangerUserId = crypto.randomUUID();
  const strangerProducerId = crypto.randomUUID();
  const tokens = { admin: crypto.randomUUID(), client: crypto.randomUUID(), matched: crypto.randomUUID(), stranger: crypto.randomUUID() };
  const guestEmail = `e2e-att-guest-${id}@example.test`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: adminUserId, email: `e2e-att-admin-${id}@example.test`, phone: "+48000000981", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-att-client-${id}@example.test`, phone: "+48000000982", role: "client", emailVerified: new Date() },
      { id: matchedUserId, email: `e2e-att-pm-${id}@example.test`, phone: "+48000000983", role: "producer", emailVerified: new Date() },
      { id: strangerUserId, email: `e2e-att-ps-${id}@example.test`, phone: "+48000000984", role: "producer", emailVerified: new Date() },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values([
      { id: matchedProducerId, userId: matchedUserId, nip: `EA${matchedProducerId.slice(0, 9)}`, name: "E2E Att Matched", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: strangerProducerId, userId: strangerUserId, nip: `EB${strangerProducerId.slice(0, 9)}`, name: "E2E Att Stranger", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: matchedProducerId, userId: matchedUserId },
      { producerId: strangerProducerId, userId: strangerUserId },
    ]);
    await db.insert(producerCapacityProfile).values({ producerId: matchedProducerId, volumeVerificationStatus: "approved" });
    await db.insert(product).values({ producerId: matchedProducerId, family: "dom", status: "published", name: "E2E Att match product" });
    await db.insert(sessions).values(
      Object.entries({
        [tokens.admin]: adminUserId,
        [tokens.client]: clientUserId,
        [tokens.matched]: matchedUserId,
        [tokens.stranger]: strangerUserId,
      }).map(([sessionToken, userId]) => ({ sessionToken, userId, expires: new Date(Date.now() + 3600_000) })),
    );
  });

  test.afterAll(async () => {
    const requests = await db.select({ id: projectRequest.id }).from(projectRequest).where(eq(projectRequest.contactEmail, guestEmail));
    for (const request of requests) {
      const files = await db.select({ key: inquiryAttachment.r2Key }).from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, request.id));
      for (const file of files) await deletePrivateObject(file.key).catch(() => undefined);
      await db.delete(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, request.id));
      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, request.id));
      await db.delete(projectRequest).where(eq(projectRequest.id, request.id));
    }
    await db.delete(sessions).where(inArray(sessions.sessionToken, Object.values(tokens)));
    await db.delete(product).where(eq(product.producerId, matchedProducerId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, matchedProducerId));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [matchedProducerId, strangerProducerId]));
    await db.delete(producer).where(inArray(producer.id, [matchedProducerId, strangerProducerId]));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, clientUserId, matchedUserId]));
    await db.delete(users).where(inArray(users.id, [adminUserId, clientUserId, matchedUserId, strangerUserId]));
  });

  test("guest uploads, producer downloads, admin hides, client deletes, state locks the owner out", async ({ page, context }) => {
    test.setTimeout(300_000);
    const as = async (token: string | null) => {
      await context.clearCookies();
      if (token) {
        await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const }]);
      }
    };

    // --- Gość składa zapytanie i wgrywa pliki (AC-28, AC-29, AC-32) ---
    await as(null);
    await page.goto("/pl/project-request");
    await page.getByLabel(/imię i nazwisko/i).fill("E2E Gość");
    await page.getByLabel(/e-mail/i).fill(guestEmail);
    await page.getByRole("button", { name: "Dalej" }).click();
    await page.getByRole("button", { name: "Wybierz…" }).first().click();
    await page.getByRole("option", { name: "Polska" }).click();
    await page.getByRole("button", { name: "Wybierz…" }).first().click();
    await page.getByRole("option", { name: "Resort" }).click();
    await page.getByLabel("Dom", { exact: true }).check();
    await page.getByRole("button", { name: "Dalej" }).click();
    await page.getByLabel(/liczba domów/i).fill("12");
    await page.getByRole("button", { name: "Wyślij zapytanie" }).click();

    await expect(page.getByRole("heading", { name: "Pliki do zapytania" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("inquiry-attachment-input")).toBeDisabled();
    await expect(page.getByText(/Nie dołączaj plików z Twoimi danymi kontaktowymi/)).toBeVisible();
    await page.getByLabel("W plikach nie ma moich danych kontaktowych").check();
    await page.getByTestId("inquiry-attachment-input").setInputFiles([
      { name: "Rzut parteru.pdf", mimeType: "application/pdf", buffer: PDF },
      { name: "Elewacja.png", mimeType: "image/png", buffer: PNG },
      { name: "podstep.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html>nie pdf</html>") },
    ]);
    await expect(page.getByText("Wgrano", { exact: true })).toHaveCount(2, { timeout: 60_000 });
    await expect(page.getByText("Nie wgrano: Dozwolone są tylko pliki PDF, JPEG, PNG lub WebP.")).toBeVisible();

    const [request] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, guestEmail));
    const requestId = request.id;
    const stored = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, requestId));
    expect(stored.map((row) => row.filename).sort()).toEqual(["Elewacja.png", "Rzut parteru.pdf"]);
    expect(stored.every((row) => row.uploadedByKind === "guest" && row.uploadedByUserId === null)).toBe(true);
    expect(request.attachmentsChangedAt).not.toBeNull();

    // Klient dostaje zapytanie na konto (jak przy logowaniu tym samym e mailem).
    await db.update(projectRequest).set({ clientId }).where(eq(projectRequest.id, requestId));

    // --- Dopasowany producent widzi i pobiera plik, obcy nie (AC-30, AC-31) ---
    await as(tokens.matched);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.getByRole("heading", { name: "Pliki inwestora" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Rzut parteru.pdf")).toBeVisible();
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: "Pobierz" }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Elewacja\.png|Rzut parteru\.pdf/);

    await as(tokens.stranger);
    // Producent bez zatwierdzenia wolumenowego (niedopasowany) jest odsyłany z tego zapytania.
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page).not.toHaveURL(new RegExp(requestId), { timeout: 30_000 });
    await expect(page.getByText("Rzut parteru.pdf")).toHaveCount(0);

    // --- Admin widzi autora, ukrywa plik z powodem (AC-31, AC-32) ---
    await as(tokens.admin);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    await expect(page.getByRole("heading", { name: "Pliki inwestora" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Gość").first()).toBeVisible();
    const pdfRow = page.getByRole("listitem").filter({ hasText: "Rzut parteru.pdf" });
    await pdfRow.getByRole("button", { name: "Ukryj" }).click();
    await pdfRow.getByRole("button", { name: "Ukryj plik" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Podaj powód ukrycia pliku." })).toBeVisible();
    await pdfRow.getByLabel(/Powód ukrycia/).fill("telefon w stopce rysunku");
    await pdfRow.getByRole("button", { name: "Ukryj plik" }).click();
    await expect(pdfRow.getByText("Ukryty przez ModularHub")).toBeVisible({ timeout: 30_000 });

    // Producent traci ukryty plik przy następnym odczycie.
    await as(tokens.matched);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.getByText("Elewacja.png")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Rzut parteru.pdf")).toHaveCount(0);

    // Klient widzi ukryty plik z oznaczeniem i powodem.
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText("Ukryty przez ModularHub")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Powód: telefon w stopce rysunku")).toBeVisible();

    // --- Znacznik zmiany po ofercie producenta, klient usuwa plik (AC-33) ---
    await db.insert(projectQuote).values({
      projectRequestId: requestId,
      producerId: matchedProducerId,
      totalPriceCents: 100000,
      submittedAt: new Date(Date.now() - 120_000),
    });
    const pngRow = page.getByRole("listitem").filter({ hasText: "Elewacja.png" });
    await pngRow.getByRole("button", { name: "Usuń" }).click();
    await expect(page.getByText("Elewacja.png")).toHaveCount(0, { timeout: 30_000 });
    const deleted = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, requestId));
    expect(deleted.find((row) => row.filename === "Elewacja.png")?.deletedByKind).toBe("client");

    await as(tokens.matched);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.getByText("Pliki zmieniono po złożeniu Twojej oferty")).toBeVisible({ timeout: 60_000 });

    // --- Po publikacji podsumowania klient nie zmienia plików, admin tak (AC-28, AC-33) ---
    await db.update(projectRequest).set({ summaryPublishedAt: new Date() }).where(eq(projectRequest.id, requestId));
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(/Pliki można zmieniać do terminu składania ofert/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Usuń" })).toHaveCount(0);

    await as(tokens.admin);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    await expect(pdfRow.getByRole("button", { name: "Usuń" })).toBeVisible({ timeout: 60_000 });
  });
});
