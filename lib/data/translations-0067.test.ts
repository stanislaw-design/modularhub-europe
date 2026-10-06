import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Ten sam obejscie co lib/data/producers.test.ts: projects.ts ciagnie
// observability (server-only / @sentry/nextjs).
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import {
  auditLog,
  producer,
  producerCertification,
  producerCertificationTranslation,
  producerTranslation,
  product,
  productTranslation,
  users,
} from "@/lib/db/schema";
import { getProducerById } from "./producers";
import { getProjectById, getProjects } from "./projects";

// Spec 0067 AC-2, AC-3, AC-4, AC-6, AC-7: tlumaczenia producenta, certyfikatow
// i czterech pol produktu, z fallbackiem na polski per pole. Dev DB.
describe.skipIf(!process.env.DATABASE_URL)("lib/data: translations (spec 0067)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const certificationId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `translations-0067-${userId}@example.test`,
      phone: "+48000000067",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `T67${producerId.slice(0, 9)}`,
      name: "Translations 0067 Producer",
      countryCode: "PL",
      technology: "modulowa-stal-lekka",
      description: "Opis po polsku",
      showroomVisitAvailable: true,
      showroomVisitNote: "Notatka po polsku",
      inquiryResponseTimeLabel: "do 24 godzin",
    });
    await db.insert(product).values({
      id: productId,
      producerId,
      family: "kontenery-modulowe",
      name: "Translations 0067 Product",
      status: "published",
      constructionSystem: "Szkielet stalowy",
      roofType: "Dwuspadowy",
      customizationScope: "Pelna",
      serviceScopeDescription: "Montaz na miejscu",
    });
    await db.insert(producerCertification).values({
      id: certificationId,
      producerId,
      name: "Certyfikat jakosci",
    });
    await db.insert(producerTranslation).values([
      {
        producerId,
        locale: "de",
        description: "Beschreibung",
        showroomVisitNote: "Hinweis",
        inquiryResponseTimeLabel: "innerhalb von 24 Stunden",
      },
      // Czesciowe tlumaczenie: puste pole i same spacje spadaja na polski.
      { producerId, locale: "en", description: "Description", showroomVisitNote: "   ", inquiryResponseTimeLabel: "" },
    ]);
    await db.insert(producerCertificationTranslation).values({
      certificationId,
      locale: "de",
      name: "Qualitaetszertifikat",
    });
    await db.insert(productTranslation).values([
      { productId, locale: "nl", roofType: "Zadeldak", constructionSystem: "Stalen frame" },
      // Tylko jedno pole przetlumaczone, reszta po polsku.
      { productId, locale: "en", roofType: "Gable", constructionSystem: "" },
    ]);
  });

  afterAll(async () => {
    await db.delete(productTranslation).where(eq(productTranslation.productId, productId));
    await db
      .delete(producerCertificationTranslation)
      .where(eq(producerCertificationTranslation.certificationId, certificationId));
    await db.delete(producerCertification).where(eq(producerCertification.id, certificationId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producerTranslation).where(eq(producerTranslation.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId, productId, certificationId]));
  });

  it("returns the translated producer description, note and response time for de (AC-2)", async () => {
    const result = await getProducerById(producerId, "de");
    expect(result).toMatchObject({
      description: "Beschreibung",
      showroomVisitNote: "Hinweis",
      inquiryResponseTimeLabel: "innerhalb von 24 Stunden",
    });
  });

  it("falls back to Polish per producer field for empty or whitespace translations (AC-6)", async () => {
    const result = await getProducerById(producerId, "en");
    expect(result).toMatchObject({
      description: "Description",
      showroomVisitNote: "Notatka po polsku",
      inquiryResponseTimeLabel: "do 24 godzin",
    });
  });

  it("keeps the Polish producer text for pl and for a locale without a translation row (AC-7)", async () => {
    expect(await getProducerById(producerId, "pl")).toMatchObject({ description: "Opis po polsku" });
    expect(await getProducerById(producerId, "nl")).toMatchObject({ description: "Opis po polsku" });
  });

  it("returns translated certification names for de and the source name otherwise (AC-4)", async () => {
    const de = await getProjectById(productId, "de");
    expect(de?.certifications?.map((c) => c.name)).toEqual(["Qualitaetszertifikat"]);
    const en = await getProjectById(productId, "en");
    expect(en?.certifications?.map((c) => c.name)).toEqual(["Certyfikat jakosci"]);
  });

  it("translates the four product fields on the detail query with per field fallback (AC-3, AC-6)", async () => {
    const nl = await getProjectById(productId, "nl");
    expect(nl).toMatchObject({
      roofType: "Zadeldak",
      constructionSystem: "Stalen frame",
      customizationScope: "Pelna",
      serviceScopeDescription: "Montaz na miejscu",
    });
    // Pusty ciag w tlumaczeniu konstrukcji daje polski tekst.
    const en = await getProjectById(productId, "en");
    expect(en).toMatchObject({ roofType: "Gable", constructionSystem: "Szkielet stalowy" });
  });

  it("translates the product fields on the list query too, because ResultCard renders constructionSystem (AC-3)", async () => {
    const list = await getProjects({ locale: "nl", family: "kontenery-modulowe" });
    const found = list.find((project) => project.id === productId);
    expect(found).toMatchObject({ roofType: "Zadeldak", constructionSystem: "Stalen frame" });
  });

  it("returns Polish product fields for pl (AC-7)", async () => {
    const pl = await getProjectById(productId, "pl");
    expect(pl).toMatchObject({ roofType: "Dwuspadowy", constructionSystem: "Szkielet stalowy" });
  });
});
