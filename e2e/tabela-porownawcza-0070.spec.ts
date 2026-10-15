import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  client,
  document,
  producer,
  producerCertification,
  producerCertificationTranslation,
  projectQuote,
  projectRequest,
  sessions,
  users,
} from "@/lib/db/schema";

// Spec 0070 zadanie 12 (AC-15): tabela porównawcza opublikowanych ofert na /panel/quotes.
test.describe("spec 0070: tabela porównawcza ofert", () => {
  const ids = {
    clientUser: crypto.randomUUID(),
    userA: crypto.randomUUID(),
    userB: crypto.randomUUID(),
    client: crypto.randomUUID(),
    producerA: crypto.randomUUID(),
    producerB: crypto.randomUUID(),
    request: crypto.randomUUID(),
    quoteA: crypto.randomUUID(),
    quoteB: crypto.randomUUID(),
    quoteOld: crypto.randomUUID(),
    cert: crypto.randomUUID(),
    token: crypto.randomUUID(),
  };
  const nameA = `Tabela Alfa ${ids.producerA.slice(0, 5)}`;
  const nameB = `Tabela Beta ${ids.producerB.slice(0, 5)}`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: ids.clientUser, email: `e2e-tab-c-${ids.clientUser}@example.test`, phone: "+48000000971", role: "client", emailVerified: new Date() },
      { id: ids.userA, email: `e2e-tab-a-${ids.userA}@example.test`, phone: "+48000000972", role: "producer", emailVerified: new Date() },
      { id: ids.userB, email: `e2e-tab-b-${ids.userB}@example.test`, phone: "+48000000973", role: "producer", emailVerified: new Date() },
    ]);
    await db.insert(producer).values([
      { id: ids.producerA, userId: ids.userA, nip: `T1${ids.producerA.slice(0, 8)}`, name: nameA, countryCode: "PL", technology: "szkielet-drewniany" },
      { id: ids.producerB, userId: ids.userB, nip: `T2${ids.producerB.slice(0, 8)}`, name: nameB, countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(client).values({ id: ids.client, userId: ids.clientUser, b2bVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: ids.request,
      clientId: ids.client,
      contactName: "E2E Tabela",
      contactEmail: `e2e-tab-${ids.request}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "published",
    });
    const now = new Date();
    await db.insert(projectQuote).values([
      {
        id: ids.quoteA,
        projectRequestId: ids.request,
        producerId: ids.producerA,
        totalPriceCents: 90_000_000,
        unitPriceCents: 7_500_000,
        status: "active",
        publishedToClientAt: now,
        priceTaxMode: "net",
        vatRatePercent: "23.0",
        scopeIncluded: "Dom w stanie deweloperskim",
        paymentPlan: "30/60/10",
        validUntil: "2099-12-31",
        proposedLeadTimeWeeks: 14,
        advisorNote: "Komentarz doradcy E2E",
        logistics: {
          transport: { mode: "amount", amountCents: 1_200_000 },
          assembly: { mode: "range", amountCents: 500_000, maxAmountCents: 800_000 },
          crane: { mode: "tbd" },
        },
      },
      { id: ids.quoteB, projectRequestId: ids.request, producerId: ids.producerB, totalPriceCents: 80_000_000, status: "active", publishedToClientAt: now, priceTaxMode: "gross", scopeIncluded: "Dom w stanie surowym", validUntil: "2099-12-31" },
      { id: ids.quoteOld, projectRequestId: ids.request, producerId: ids.producerB, totalPriceCents: 70_000_000, status: "superseded", publishedToClientAt: now, scopeIncluded: "STARA WERSJA E2E" },
    ]);
    await db.insert(document).values({ r2Key: `e2e-tab-${ids.quoteA}.pdf`, filename: "oferta.pdf", mimeType: "application/pdf", sizeBytes: 100, purpose: "project_quote_pdf", ownerUserId: ids.userA, projectQuoteId: ids.quoteA });
    await db.insert(producerCertification).values({ id: ids.cert, producerId: ids.producerA, name: "Certyfikat Tabela" });
    await db.insert(producerCertificationTranslation).values({ certificationId: ids.cert, locale: "en", name: "Table certificate" });
    await db.insert(sessions).values({ sessionToken: ids.token, userId: ids.clientUser, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.sessionToken, ids.token));
    await db.delete(document).where(eq(document.projectQuoteId, ids.quoteA));
    await db.delete(producerCertificationTranslation).where(eq(producerCertificationTranslation.certificationId, ids.cert));
    await db.delete(producerCertification).where(eq(producerCertification.id, ids.cert));
    await db.delete(projectQuote).where(inArray(projectQuote.id, [ids.quoteA, ids.quoteB, ids.quoteOld]));
    await db.delete(projectRequest).where(eq(projectRequest.id, ids.request));
    await db.delete(client).where(eq(client.id, ids.client));
    await db.delete(producer).where(inArray(producer.id, [ids.producerA, ids.producerB]));
    await db.delete(users).where(inArray(users.id, [ids.clientUser, ids.userA, ids.userB]));
  });

  test("AC-15: a column per producer, 'brak danych' instead of zero, PDF attachments, no contact data", async ({ page, context }) => {
    test.setTimeout(180_000);
    await context.addCookies([{ name: "authjs.session-token", value: ids.token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/pl/panel/quotes");
    const table = page.getByRole("table");
    await expect(table).toBeVisible({ timeout: 120_000 });

    await expect(page.getByRole("columnheader", { name: new RegExp(nameA) })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: new RegExp(nameB) })).toBeVisible();
    await expect(table).toContainText("cena netto, VAT 23%");
    await expect(table).toContainText("cena brutto");
    await expect(table).toContainText("do wyceny");
    await expect(table).toContainText("brak danych");
    await expect(table).toContainText("Komentarz doradcy E2E");
    await expect(table).not.toContainText("STARA WERSJA E2E");
    expect(await table.innerText()).not.toMatch(/(^|\s)0 €/);
    expect(await page.locator("main").innerText()).not.toMatch(/@|tel:|www\./i);
    await expect(page.getByText(`Oferta producenta ${nameA} (PDF)`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pobierz PDF" })).toHaveCount(1);
  });

  test("AC-15, AC-26: translates the certificate name and the labels for another language", async ({ page, context }) => {
    test.setTimeout(180_000);
    await context.addCookies([{ name: "authjs.session-token", value: ids.token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/en/panel/quotes");
    const table = page.getByRole("table");
    await expect(table).toBeVisible({ timeout: 120_000 });
    await expect(table).toContainText("Table certificate");
    await expect(table).toContainText("Total price");
    await expect(table).toContainText("no data");
  });
});
