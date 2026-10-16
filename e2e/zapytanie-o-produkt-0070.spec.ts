import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
  bulkProductInquiry,
  client,
  producer,
  producerMember,
  product,
  projectQuote,
  sessions,
  users,
} from "@/lib/db/schema";

// Spec 0070 zadanie 14 (AC-21, AC-22): zapytanie o konkretny produkt przechodzi tę samą
// bramkę, termin i wybór co przetarg. Producent produktu widzi je i wycenia, cudzy producent
// nie, termin blokuje ofertę, administrator publikuje, klient wybiera jedyną ofertę.
test.describe("spec 0070: zapytanie o produkt", () => {
  const ownerUserId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const tokens = { owner: crypto.randomUUID(), other: crypto.randomUUID(), admin: crypto.randomUUID(), client: crypto.randomUUID() };
  const ownerName = `E2E Produkt ${ownerId.slice(0, 6)}`;
  const productName = `E2E zapytany produkt ${productId.slice(0, 6)}`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: ownerUserId, email: `e2e-pi-owner-${ownerUserId}@example.test`, phone: "+48000000991", role: "producer", emailVerified: new Date() },
      { id: otherUserId, email: `e2e-pi-other-${otherUserId}@example.test`, phone: "+48000000992", role: "producer", emailVerified: new Date() },
      { id: adminUserId, email: `e2e-pi-admin-${adminUserId}@example.test`, phone: "+48000000993", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-pi-client-${clientUserId}@example.test`, phone: "+48000000994", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values([
      { id: ownerId, userId: ownerUserId, nip: `E72${ownerId.slice(0, 8)}`, name: ownerName, countryCode: "PL", technology: "szkielet-drewniany" },
      { id: otherId, userId: otherUserId, nip: `E73${otherId.slice(0, 8)}`, name: "E2E Cudzy producent", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: ownerId, userId: ownerUserId },
      { producerId: otherId, userId: otherUserId },
    ]);
    await db.insert(product).values({ id: productId, producerId: ownerId, family: "dom", status: "published", name: productName });
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(bulkProductInquiry).values({
      id: inquiryId,
      clientId,
      productId,
      contactName: "E2E Inwestor Produkt",
      contactEmail: `e2e-pi-investor-${inquiryId}@example.test`,
      contactPhone: "+48000000995",
      unitCount: 7,
      deliveryCountryCode: "PL",
      status: "open",
    });
    const userByKey = { owner: ownerUserId, other: otherUserId, admin: adminUserId, client: clientUserId };
    await db.insert(sessions).values(
      (Object.keys(tokens) as (keyof typeof tokens)[]).map((key) => ({
        sessionToken: tokens[key],
        userId: userByKey[key],
        expires: new Date(Date.now() + 3600_000),
      })),
    );
  });

  test.afterAll(async () => {
    await db.update(bulkProductInquiry).set({ selectedQuoteId: null }).where(eq(bulkProductInquiry.id, inquiryId));
    await db.delete(projectQuote).where(eq(projectQuote.producerId, ownerId));
    await db.delete(sessions).where(inArray(sessions.sessionToken, Object.values(tokens)));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [ownerId, otherId]));
    await db.delete(producer).where(inArray(producer.id, [ownerId, otherId]));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, ownerUserId, clientUserId]));
    await db.delete(users).where(inArray(users.id, [ownerUserId, otherUserId, adminUserId, clientUserId]));
  });

  test("owner quotes, other producer is blocked, deadline locks, admin publishes, client selects the single offer", async ({ page, context }) => {
    test.setTimeout(240_000);
    const as = async (token: string) => {
      await context.clearCookies();
      await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
    };

    // Cudzy producent: lista pusta, szczegół 404 (AC-21, AC-22).
    await as(tokens.other);
    await page.goto("/pl/producer/panel/product-inquiries");
    await expect(page.getByText("Brak zapytań o Twoje produkty.")).toBeVisible({ timeout: 60_000 });
    const foreign = await page.goto(`/pl/producer/panel/product-inquiries/${inquiryId}`);
    expect(foreign?.status()).toBe(404);

    // Producent produktu: widzi zapytanie bez kontaktu i składa ofertę.
    await as(tokens.owner);
    await page.goto("/pl/producer/panel/product-inquiries");
    await page.getByRole("link", { name: productName }).click();
    await expect(page.locator("#quote-total-price")).toBeVisible({ timeout: 60_000 });
    expect(await page.locator("main").innerText()).not.toMatch(/e2e-pi-investor|\+48000000995/);
    await page.locator("#quote-total-price").fill("700000");
    await page.locator("#quote-scope-included").fill("Dom w stanie deweloperskim");
    await page.locator("#quote-valid-until").fill("2099-12-31");
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });
    const [quote] = await db.select().from(projectQuote).where(eq(projectQuote.producerId, ownerId));
    expect(quote).toMatchObject({ bulkProductInquiryId: inquiryId, status: "active", publishedToClientAt: null });

    // AC-12: po terminie formularz znika.
    await db.update(bulkProductInquiry).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(bulkProductInquiry.id, inquiryId));
    await page.goto(`/pl/producer/panel/product-inquiries/${inquiryId}`);
    await expect(page.getByText("Termin składania ofert minął")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#quote-total-price")).toHaveCount(0);
    await db.update(bulkProductInquiry).set({ deadlineAt: new Date(Date.now() + 5 * 86_400_000) }).where(eq(bulkProductInquiry.id, inquiryId));

    // AC-13: klient nie widzi nieopublikowanej oferty.
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(ownerName)).toHaveCount(0);

    // AC-14, AC-21: administrator publikuje to samo podsumowanie.
    await as(tokens.admin);
    await page.goto(`/pl/internal/large-orders/${inquiryId}?kind=product`);
    const publish = page.getByRole("button", { name: "Opublikuj podsumowanie" });
    await expect(publish).toBeDisabled({ timeout: 60_000 });
    await page.getByRole("checkbox").check();
    await publish.click();
    await expect(page.getByText("U klienta od")).toBeVisible({ timeout: 30_000 });

    // AC-15, AC-16, AC-17: tabela z jedną kolumną, wybór łączy strony (B2B zatwierdzone).
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByRole("columnheader", { name: new RegExp(ownerName) })).toHaveCount(1, { timeout: 60_000 });
    await page.getByRole("button", { name: "Wybierz tę ofertę" }).click();
    await expect
      .poll(
        async () => {
          const [row] = await db
            .select({ s: bulkProductInquiry.status, q: bulkProductInquiry.selectedQuoteId })
            .from(bulkProductInquiry)
            .where(eq(bulkProductInquiry.id, inquiryId));
          return `${row.s}:${row.q === quote.id}`;
        },
        { timeout: 30_000 },
      )
      .toBe("accepted:true");
  });
});
