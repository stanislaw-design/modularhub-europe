import { expect, test } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { product } from "@/lib/db/schema";

// Spec 0084: formularz zapytania dopasowany do rodziny produktu (AC-1, AC-3, AC-9).
// Karty po wysłaniu (AC-4, AC-5) pokrywa lib/cases/create.test.ts, bo wiadomości są niezmienne
// i test przeglądarki nie powinien zostawiać po sobie spraw w bazie.
test.describe("spec 0084: formularz zapytania według rodziny", () => {
  test("sauna: neutralne etykiety, bez użytkowania i metrażu, linia o pytaniach doradcy (AC-1, AC-3)", async ({ page }) => {
    const [sauna] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.family, "spa-modulowe"), eq(product.status, "published"), isNull(product.deletedAt)))
      .limit(1);
    test.skip(!sauna, "brak opublikowanej sauny w bazie");

    await page.goto(`/pl/inquiry?projects=${sauna.id}`);
    await expect(page.getByText("Wybrany produkt", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Miejsce montażu lub dostawy")).toBeVisible();
    await expect(page.getByText("Kraj dostawy")).toBeVisible();
    await expect(page.getByText("Adres działki", { exact: true })).toHaveCount(0);
    await expect(page.getByText("metraż do ustalenia")).toHaveCount(0);
    await expect(page.getByText("Po wysłaniu doradca zada Ci kilka krótkich pytań o produkt.")).toBeVisible();
  });

  test("dom: formularz jak dotąd plus jedna linia informacyjna (AC-9)", async ({ page }) => {
    const [house] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.family, "dom"), eq(product.status, "published"), isNull(product.deletedAt)))
      .limit(1);
    test.skip(!house, "brak opublikowanego domu w bazie");
    await page.goto(`/pl/inquiry?projects=${house.id}`);
    await expect(page.getByText("Wybrane domy", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Adres działki", { exact: true })).toBeVisible();
    await expect(page.getByText("Po wysłaniu doradca zada Ci kilka krótkich pytań o produkt.")).toBeVisible();
  });
});
