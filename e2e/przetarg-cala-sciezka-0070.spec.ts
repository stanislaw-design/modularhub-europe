import { expect, test } from "@playwright/test";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
  client,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  producerMember,
  product,
  projectNotificationLog,
  projectQuote,
  projectRequest,
  sessions,
  users,
} from "@/lib/db/schema";

// Spec 0070 zadanie 18 (AC-1 do AC-17, AC-25): cała ścieżka przetargu przez prawdziwą
// przeglądarkę. Klient składa zapytanie kreatorem, dopasowany producent je widzi i wycenia,
// niedopasowany nie, klient nie widzi oferty przed publikacją, administrator publikuje, klient
// wybiera ofertę bez zatwierdzonego B2B (wybór czeka), administrator zatwierdza B2B, strony
// zostają połączone, a producent widzi kontakt inwestora. Na końcu zadanie cykliczne:
// odmowa bez sekretu oraz (gdy CRON_SECRET jest ustawiony dla serwera i testu) jedno
// przypomnienie mimo dwóch uruchomień. Szczegółowe zachowania pojedynczych kroków pokrywają
// pozostałe pliki *-0070.spec.ts; ten plik pilnuje, że kroki łączą się ze sobą.
test.describe("spec 0070: cała ścieżka przetargu", () => {
  const matchedUserId = crypto.randomUUID();
  const strangerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const matchedId = crypto.randomUUID();
  const strangerId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const tokens = { matched: crypto.randomUUID(), stranger: crypto.randomUUID(), admin: crypto.randomUUID(), client: crypto.randomUUID() };
  const clientEmail = `e2e-sciezka-client-${clientUserId}@example.test`;
  const matchedName = `E2E Sciezka ${matchedId.slice(0, 6)}`;
  let requestId = "";

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: matchedUserId, email: `e2e-sciezka-prod-${matchedUserId}@example.test`, phone: "+48000000961", role: "producer", emailVerified: new Date() },
      { id: strangerUserId, email: `e2e-sciezka-obcy-${strangerUserId}@example.test`, phone: "+48000000962", role: "producer", emailVerified: new Date() },
      { id: adminUserId, email: `e2e-sciezka-admin-${adminUserId}@example.test`, phone: "+48000000963", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: clientEmail, phone: "+48000000964", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values([
      { id: matchedId, userId: matchedUserId, nip: `E74${matchedId.slice(0, 8)}`, name: matchedName, countryCode: "PL", technology: "szkielet-drewniany" },
      { id: strangerId, userId: strangerUserId, nip: `E75${strangerId.slice(0, 8)}`, name: "E2E Sciezka Obcy", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: matchedId, userId: matchedUserId },
      { producerId: strangerId, userId: strangerUserId },
    ]);
    // Dopasowany: zatwierdzony wolumen, kraj PL, opublikowany dom. Obcy: bez zatwierdzenia wolumenowego.
    await db.insert(producerCapacityProfile).values([
      { producerId: matchedId, volumeVerificationStatus: "approved" },
      { producerId: strangerId, volumeVerificationStatus: "not_submitted" },
    ]);
    await db.insert(producerDeliveryCountry).values({ producerId: matchedId, countryCode: "PL" });
    await db.insert(product).values([
      { producerId: matchedId, family: "dom", status: "published", name: "E2E sciezka dom" },
      { producerId: strangerId, family: "dom", status: "published", name: "E2E sciezka obcy dom" },
    ]);
    // Klient z danymi firmy czekającymi na zatwierdzenie B2B: wybór oferty ma poczekać.
    await db.insert(client).values({
      id: clientId,
      userId: clientUserId,
      b2bVerificationStatus: "pending",
      companyName: "E2E Sciezka Sp. z o.o.",
      nip: `E2E${clientId.slice(0, 7)}`,
    });
    const userByKey = { matched: matchedUserId, stranger: strangerUserId, admin: adminUserId, client: clientUserId };
    await db.insert(sessions).values(
      (Object.keys(tokens) as (keyof typeof tokens)[]).map((key) => ({
        sessionToken: tokens[key],
        userId: userByKey[key],
        expires: new Date(Date.now() + 3600_000),
      })),
    );
  });

  test.afterAll(async () => {
    if (requestId) {
      await db.delete(projectNotificationLog).where(eq(projectNotificationLog.projectRequestId, requestId));
      await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, requestId));
      await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    }
    await db.delete(sessions).where(inArray(sessions.sessionToken, Object.values(tokens)));
    await db.delete(product).where(inArray(product.producerId, [matchedId, strangerId]));
    await db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, matchedId));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, [matchedId, strangerId]));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [matchedId, strangerId]));
    await db.delete(producer).where(inArray(producer.id, [matchedId, strangerId]));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(auditLog).where(
      or(inArray(auditLog.actorUserId, [adminUserId, clientUserId, matchedUserId, strangerUserId]), eq(auditLog.recordId, clientId)),
    );
    await db.delete(users).where(inArray(users.id, [matchedUserId, strangerUserId, adminUserId, clientUserId]));
  });

  test("request, quote, publication, choice waiting on B2B, approval, connection, scheduled job", async ({ page, context, request }) => {
    test.setTimeout(420_000);
    const as = async (token: string | null) => {
      await context.clearCookies();
      if (token) {
        await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const }]);
      }
    };

    // --- Klient składa zapytanie kreatorem, zalogowany tym samym adresem (zapytanie trafia na jego konto) ---
    await as(tokens.client);
    await page.goto("/pl/project-request");
    await page.getByLabel(/imię i nazwisko/i).fill("E2E Inwestor Sciezka");
    await page.getByLabel(/e-mail/i).fill(clientEmail);
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

    const [created] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, clientEmail));
    requestId = created.id;
    expect(created.clientId).toBe(clientId);
    expect(created.unitCount).toBe(12);
    expect(created.status).toBe("open");
    // AC-9: termin 14 dni od złożenia.
    const days = (created.deadlineAt.getTime() - created.createdAt.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThan(14.1);

    // --- Niedopasowany producent nie widzi zapytania (AC-10), dopasowany wycenia ---
    await as(tokens.stranger);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page).not.toHaveURL(new RegExp(requestId), { timeout: 30_000 });

    await as(tokens.matched);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.locator("#quote-total-price")).toBeVisible({ timeout: 60_000 });
    await page.locator("#quote-total-price").fill("900000");
    await page.locator("#quote-scope-included").fill("Dom w stanie deweloperskim");
    await page.locator("#quote-valid-until").fill("2099-12-31");
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });
    const [quote] = await db.select().from(projectQuote).where(eq(projectQuote.projectRequestId, requestId));
    expect(quote.publishedToClientAt).toBeNull();

    // --- AC-13: klient nie widzi oferty przed publikacją ---
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.locator("main")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(matchedName)).toHaveCount(0);

    // --- AC-14: administrator publikuje podsumowanie ---
    await as(tokens.admin);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    const publish = page.getByRole("button", { name: "Opublikuj podsumowanie" });
    await expect(publish).toBeDisabled({ timeout: 60_000 });
    await page.getByRole("checkbox").check();
    await publish.click();
    await expect(page.getByText("U klienta od")).toBeVisible({ timeout: 30_000 });
    const [published] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
    expect(published.status).toBe("published");

    // --- AC-15, AC-16: klient widzi porównanie i wybiera; B2B niezatwierdzone, więc wybór czeka (AC-17) ---
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(matchedName).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Wybierz tę ofertę" }).click();
    await expect(page.getByText(/Czekamy na potwierdzenie danych firmy/)).toBeVisible({ timeout: 15_000 });
    const [waiting] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
    expect(waiting.selectedQuoteId).toBe(quote.id);
    expect(waiting.status).toBe("published");
    const [stillMasked] = await db.select().from(projectQuote).where(eq(projectQuote.id, quote.id));
    expect(stillMasked.contactRevealedAt).toBeNull();

    // Producent nie widzi jeszcze kontaktu inwestora (AC-22).
    await as(tokens.matched);
    await page.goto("/pl/producer/panel/board-quotes");
    await expect(page.getByText(/Kontakt inwestora/)).toHaveCount(0, { timeout: 30_000 });

    // --- AC-4, AC-17: administrator zatwierdza B2B klienta, wybór łączy strony ---
    await as(tokens.admin);
    await page.goto("/pl/internal/clients/b2b-verification");
    const row = page.getByRole("row").filter({ hasText: clientEmail });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole("button", { name: "Zatwierdź" }).click();
    await expect(page.getByRole("row").filter({ hasText: clientEmail })).toHaveCount(0, { timeout: 30_000 });
    await expect.poll(async () => {
      const [connected] = await db.select().from(projectQuote).where(eq(projectQuote.id, quote.id));
      return connected.contactRevealedAt !== null && connected.status === "accepted";
    }, { timeout: 30_000 }).toBe(true);
    const [connectedRequest] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
    expect(connectedRequest.status).toBe("accepted");

    // Klient widzi komunikat o połączeniu, producent kontakt inwestora.
    await as(tokens.client);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(/Strony zostały połączone/)).toBeVisible({ timeout: 60_000 });
    await as(tokens.matched);
    await page.goto("/pl/producer/panel/board-quotes");
    await expect(page.getByText(/Kontakt inwestora/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(clientEmail)).toBeVisible();

    // --- AC-25: zadanie cykliczne jest chronione sekretem ---
    const denied = await request.get("/api/cron/large-orders-reminders");
    expect(denied.status()).toBe(401);
    const wrong = await request.get("/api/cron/large-orders-reminders", { headers: { authorization: "Bearer zly-sekret" } });
    expect(wrong.status()).toBe(401);
  });

  // Przypomnienia dla zapytania bez wyboru: nowe zapytanie z terminem za dwa dni. Wymaga
  // CRON_SECRET po stronie serwera i testu (np. `CRON_SECRET=e2e npm run test:e2e`), bo
  // lokalny serwer dziedziczy środowisko procesu Playwright.
  test("scheduled job sends one reminder per producer even when it runs twice", async ({ request }) => {
    test.skip(!process.env.CRON_SECRET, "Ustaw CRON_SECRET dla serwera i testu, żeby wywołać zadanie cykliczne.");
    test.setTimeout(120_000);
    await assertDevOrStagingDatabase();

    const [reminded] = await db
      .insert(projectRequest)
      .values({
        contactName: "E2E Przypomnienie",
        contactEmail: `e2e-sciezka-przyp-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 12,
        status: "open",
        deadlineAt: new Date(Date.now() + 48 * 3_600_000),
      })
      .returning({ id: projectRequest.id });
    try {
      const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
      const first = await request.get("/api/cron/large-orders-reminders", { headers });
      expect(first.status()).toBe(200);
      const logged = await db.select().from(projectNotificationLog).where(eq(projectNotificationLog.projectRequestId, reminded.id));
      expect(logged.some((entry) => entry.kind.startsWith("reminder_3d:") && entry.producerId === matchedId)).toBe(true);

      const second = await request.get("/api/cron/large-orders-reminders", { headers });
      expect(second.status()).toBe(200);
      const again = await db.select().from(projectNotificationLog).where(eq(projectNotificationLog.projectRequestId, reminded.id));
      expect(again).toHaveLength(logged.length);
    } finally {
      await db.delete(projectNotificationLog).where(eq(projectNotificationLog.projectRequestId, reminded.id));
      await db.delete(projectRequest).where(eq(projectRequest.id, reminded.id));
    }
  });
});
