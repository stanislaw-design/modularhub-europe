import { expect, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevDatabase } from "@/lib/db/dev-database-guard";
import {
  client,
  document,
  producer,
  producerCapacityProfile,
  producerMember,
  projectQuote,
  projectRequest,
  sessions,
  users,
} from "@/lib/db/schema";

function fakePdfBuffer(bodyBytes: number): Buffer {
  const header = Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1");
  const footer = Buffer.from("\nendobj\n%%EOF", "latin1");
  return Buffer.concat([header, Buffer.alloc(Math.max(0, bodyBytes), "A"), footer]);
}

// Spec 0063 AC-12: Next.js 16 caps every server action's request body at 1 MB
// by default; next.config.ts raises experimental.serverActions.bodySizeLimit
// to cover this. That fix only proves itself under a REAL multipart HTTP
// request through a browser -- calling uploadProjectQuotePdf directly from a
// Vitest test bypasses the transport layer entirely and would hide a
// regression here (lib/project-quote-actions.test.ts covers everything else
// about this action; this file exists only for the one thing it can't
// cover). Session auth is a real database session row (strategy: "database"
// in auth.ts), the same mechanism the magic link sign in produces, not a mock.
test.describe("spec 0063: PDF wyceny over 1 MB through a real browser request (AC-12)", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();

  test.beforeAll(async () => {
    await assertDevDatabase();

    await db.insert(users).values({
      id: producerUserId,
      email: `e2e-pdf-quote-${producerUserId}@example.test`,
      phone: "+48000000099",
      role: "producer",
      emailVerified: new Date(),
    });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `E2E${producerId.slice(0, 7)}`,
      name: "E2E PDF Quote Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    // AC-13's guard requires volumeVerificationStatus = 'approved' before a
    // producer may quote a project_request at all (spec 0062 AC-13).
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: projectRequestId,
      contactName: "E2E PDF Quote Investor",
      contactEmail: `e2e-pdf-quote-investor-${projectRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCountMin: 12,
      status: "open",
    });
    // A direct database session row, the same shape the Drizzle adapter
    // writes for a real magic link sign in (session: { strategy: "database" }
    // in auth.ts) -- session.js looks this up by the raw cookie value, no
    // hashing, so setting the cookie to this exact token authenticates.
    await db.insert(sessions).values({ sessionToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    await db.delete(document).where(eq(document.ownerUserId, producerUserId));
    await db.delete(projectQuote).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producerId)));
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  test("submitting a quote with a >1 MB PDF reaches the server action, past the transport limit", async ({ page, context }) => {
    await context.addCookies([
      { name: "authjs.session-token", value: sessionToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
    ]);

    // Valid PDF signature/trailer (validateDocumentPdf, lib/storage/document-pdf-validation.ts),
    // padded well past the default 1 MB Next.js server action body limit.
    const oneMb = 1024 * 1024;
    const header = Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1");
    const footer = Buffer.from("\nendobj\n%%EOF", "latin1");
    const padding = Buffer.alloc(oneMb + 200 * 1024, "A");
    const pdfBuffer = Buffer.concat([header, padding, footer]);

    await page.goto(`/pl/producer/panel/board/${projectRequestId}`);
    await expect(page.getByText("Podaj wycenę na to zapytanie.")).toBeVisible();

    await page.locator("#quote-total-price").fill("500000");
    await page.locator("#quote-pdf-file").setInputFiles({
      name: "wycena-e2e.pdf",
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();

    // The quote itself never depends on R2 (submitProjectQuote has no storage
    // call), so this always resolves once the request lands -- proving the
    // multipart POST was NOT rejected at the transport layer (a rejected
    // request would never reach this far).
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });

    // What happens next to the PDF itself depends on whether the private R2
    // bucket (spec 0063 Build plan #1, a manual Cloudflare step) has been
    // provisioned yet in this environment:
    const filenameVisible = page.getByText("wycena-e2e.pdf");
    const storageErrorVisible = page.getByRole("alert").filter({ hasText: "Nie udało się wgrać pliku do magazynu" });
    await expect(filenameVisible.or(storageErrorVisible)).toBeVisible({ timeout: 15_000 });

    if (await storageErrorVisible.isVisible()) {
      test.info().annotations.push({
        type: "known-gap",
        description:
          "Private R2 bucket not provisioned yet (spec 0063 Build plan #1): the >1 MB request reached uploadProjectQuotePdf and failed only at the storage call, which proves AC-12's transport fix works. Full success assertion will hold once PRIVATE_R2_BUCKET_NAME is configured.",
      });
    } else {
      await expect(filenameVisible).toBeVisible();
    }
  });
});

// Regression guard for a /check verify finding (2026-10-03): Next.js 16's
// proxy.ts (middleware) buffers the whole request body with its OWN default
// 10 MB cap (experimental.proxyClientMaxBodySize), completely independent of
// experimental.serverActions.bodySizeLimit above. A file between that old 10
// MB proxy cap and the spec's 20 MB app limit used to crash the page with an
// uncaught "Unexpected end of form" instead of saving the quote -- the test
// above only ever sends ~1.2 MB, too small to reach this second, lower
// ceiling, which is exactly how the regression went unnoticed. next.config.ts
// now sets proxyClientMaxBodySize too; this test pins that fix in place.
test.describe("spec 0063 regression: a file between 10MB and 20MB must not crash the page (proxyClientMaxBodySize)", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();

  test.beforeAll(async () => {
    await assertDevDatabase();
    await db.insert(users).values({
      id: producerUserId,
      email: `e2e-pdf-quote-15mb-${producerUserId}@example.test`,
      phone: "+48000000094",
      role: "producer",
      emailVerified: new Date(),
    });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `E2E${producerId.slice(0, 7)}`,
      name: "E2E PDF Quote 15MB Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: projectRequestId,
      contactName: "E2E PDF Quote 15MB Investor",
      contactEmail: `e2e-pdf-quote-15mb-investor-${projectRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCountMin: 12,
      status: "open",
    });
    await db.insert(sessions).values({ sessionToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    await db.delete(document).where(eq(document.ownerUserId, producerUserId));
    await db.delete(projectQuote).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producerId)));
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
  });

  test("a 15MB PDF saves the quote and uploads successfully, no page crash", async ({ page, context }) => {
    await context.addCookies([
      { name: "authjs.session-token", value: sessionToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
    ]);

    await page.goto(`/pl/producer/panel/board/${projectRequestId}`);
    await page.locator("#quote-total-price").fill("333000");
    await page.locator("#quote-pdf-file").setInputFiles({
      name: "pietnascie-mb.pdf",
      mimeType: "application/pdf",
      buffer: fakePdfBuffer(15 * 1024 * 1024),
    });
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();

    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("pietnascie-mb.pdf")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Coś poszło nie tak.")).not.toBeVisible();
  });
});

// AC-7, AC-9, AC-11: the download button on both the client's and the
// producer's own quote screens, proven through a real browser click (not a
// direct call to getProjectQuotePdfUrl), including that it survives the
// quote moving from `active` to `accepted` -- in contrast to the investor
// contact (spec 0062), which stays masked until acceptance.
test.describe("spec 0063: download button on client and producer quote screens", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const producerSessionToken = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const clientSessionToken = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();

  test.beforeAll(async () => {
    await assertDevDatabase();
    await db.insert(users).values([
      { id: producerUserId, email: `e2e-pdf-download-${producerUserId}@example.test`, phone: "+48000000093", role: "producer", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-pdf-download-${clientUserId}@example.test`, phone: "+48000000092", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `E2E${producerId.slice(0, 7)}`,
      name: "E2E PDF Download Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: projectRequestId,
      clientId,
      contactName: "E2E PDF Download Investor",
      contactEmail: `e2e-pdf-download-investor-${projectRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCountMin: 12,
      status: "open",
    });
    await db.insert(sessions).values([
      { sessionToken: producerSessionToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: clientSessionToken, userId: clientUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(document).where(eq(document.ownerUserId, producerUserId));
    await db.delete(projectQuote).where(and(eq(projectQuote.projectRequestId, projectRequestId), eq(projectQuote.producerId, producerId)));
    await db.delete(sessions).where(eq(sessions.sessionToken, producerSessionToken));
    await db.delete(sessions).where(eq(sessions.sessionToken, clientSessionToken));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
    await db.delete(users).where(eq(users.id, clientUserId));
  });

  // One self-contained test, not split across dependent tests: each step
  // (producer submits, client downloads and accepts, producer downloads from
  // their own screen) needs the previous step's real server state, so
  // splitting it would make the later tests depend on run order.
  test("client downloads the PDF, accepts the quote, and both the client and producer screens keep working afterwards", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);

    await context.addCookies([
      { name: "authjs.session-token", value: producerSessionToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
    ]);
    await page.goto(`/pl/producer/panel/board/${projectRequestId}`);
    await page.locator("#quote-total-price").fill("420000");
    await page.locator("#quote-pdf-file").setInputFiles({ name: "oferta.pdf", mimeType: "application/pdf", buffer: fakePdfBuffer(2048) });
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("oferta.pdf")).toBeVisible({ timeout: 15_000 });

    await context.clearCookies();
    await context.addCookies([
      { name: "authjs.session-token", value: clientSessionToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
    ]);
    await page.goto("/pl/panel/quotes");
    const clientDownloadButton = page.getByRole("button", { name: "Pobierz PDF" });
    await expect(clientDownloadButton).toBeVisible();
    const [clientDownload] = await Promise.all([page.waitForEvent("download"), clientDownloadButton.click()]);
    expect(clientDownload.suggestedFilename()).toBe("oferta.pdf");

    // AcceptQuoteButton only flips its own local label; the status column is
    // server rendered, so a reload is needed to see the persisted status --
    // the point of this test is that the download button survives it either way.
    await page.getByRole("button", { name: "Akceptuj" }).click();
    await expect(page.getByText("Zaakceptowano")).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page.getByText("Zaakceptowana")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Pobierz PDF" })).toBeVisible();

    await context.clearCookies();
    await context.addCookies([
      { name: "authjs.session-token", value: producerSessionToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
    ]);
    await page.goto("/pl/producer/panel/board-quotes");
    const producerDownloadButton = page.getByRole("button", { name: "Pobierz PDF" }).first();
    await expect(producerDownloadButton).toBeVisible();
    const [producerDownload] = await Promise.all([page.waitForEvent("download"), producerDownloadButton.click()]);
    expect(producerDownload.suggestedFilename()).toBe("oferta.pdf");
  });
});
