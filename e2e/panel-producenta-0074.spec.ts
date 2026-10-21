import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
  bulkProductInquiry,
  client,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  sessions,
  users,
} from "@/lib/db/schema";

// Spec 0074, główna ścieżka panelu producenta: pulpit, zapytania, tablica, produkty, ustawienia.
test.describe("spec 0074: redesign panelu producenta", () => {
  const producerUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const inquiryId = crypto.randomUUID();
  const token = crypto.randomUUID();
  const companyName = `E2E Panel ${producerId.slice(0, 6)}`;
  const newCompanyName = `${companyName} Zmieniona`;
  const productName = `E2E produkt panelu ${productId.slice(0, 6)}`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: producerUserId, email: `e2e-0074-p-${producerUserId}@example.test`, phone: "+48000000981", role: "producer", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-0074-c-${clientUserId}@example.test`, phone: "+48000000982", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `E74${producerId.slice(0, 8)}`,
      name: companyName,
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: productName });
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(bulkProductInquiry).values({
      id: inquiryId,
      clientId,
      productId,
      contactName: "E2E Inwestor 0074",
      contactEmail: `e2e-0074-investor-${inquiryId}@example.test`,
      contactPhone: "+48000000983",
      unitCount: 5,
      deliveryCountryCode: "PL",
      status: "open",
    });
    await db.insert(sessions).values({ sessionToken: token, userId: producerUserId, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [producerUserId, clientUserId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, clientUserId]));
  });

  test("pulpit, zapytania, tablica, produkty i ustawienia", async ({ page, context }) => {
    test.setTimeout(240_000);
    await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);

    // Pulpit: blok reakcji z zapytaniem czekającym na ofertę (AC-3) i menu z pięcioma pozycjami (AC-1).
    await page.goto("/pl/producer/panel");
    await expect(page.getByRole("heading", { name: "Pulpit" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Wymaga Twojej reakcji")).toBeVisible();
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: /Zapytania/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Ustawienia firmy/ })).toBeVisible();

    // Zapytania: wspólna lista, stara lista przekierowuje (AC-7, AC-8), brak kontaktu klienta.
    await page.goto("/pl/producer/panel/product-inquiries");
    await expect(page).toHaveURL(/\/pl\/producer\/panel\/inquiries/, { timeout: 60_000 });
    await expect(page.getByRole("link", { name: productName })).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(/E2E Inwestor 0074|\+48000000983/);

    // Tablica: wspólny pasek zakładek i przełącznik krajów dostawy (AC-9).
    await page.goto("/pl/producer/panel/board");
    const tabs = page.getByRole("navigation", { name: "Tablica ogłoszeń" });
    await expect(tabs.getByRole("link", { name: /Dostępne ogłoszenia/ })).toHaveAttribute("aria-current", "page", { timeout: 60_000 });
    await tabs.getByRole("link", { name: /Moje wyceny/ }).click();
    await expect(page).toHaveURL(/board-quotes/, { timeout: 60_000 });
    await expect(page.getByRole("navigation", { name: "Tablica ogłoszeń" }).getByRole("link", { name: /Moje wyceny/ })).toHaveAttribute("aria-current", "page", { timeout: 60_000 });

    // Produkty: produkt bez zdjęcia jest niekompletny (AC-10).
    await page.goto("/pl/producer/panel/products");
    const row = page.getByRole("row", { name: new RegExp(productName) });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.getByText("Brak zdjęć")).toBeVisible();
    await expect(row.getByRole("link", { name: "Uzupełnij" })).toBeVisible();

    // Ustawienia: zmiana nazwy firmy, bez statusu weryfikacji (AC-11).
    await page.goto("/pl/producer/panel/settings");
    await expect(page.getByText("Status weryfikacji")).toHaveCount(0);
    const nameInput = page.getByLabel(/Nazwa firmy/);
    await expect(nameInput).toBeVisible({ timeout: 60_000 });
    await nameInput.fill("A");
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 30_000 });
    await nameInput.fill(newCompanyName);
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(page.getByText("Zapisano.")).toBeVisible({ timeout: 30_000 });
    const [saved] = await db.select().from(producer).where(eq(producer.id, producerId));
    expect(saved.name).toBe(newCompanyName);
  });
});
