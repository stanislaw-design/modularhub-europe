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
  productComplianceAssessment,
  productCountryEligibility,
  productTimelineStage,
  productTranslation,
  productVariant,
  referenceTextTranslation,
  users,
} from "@/lib/db/schema";
import { getProducerById } from "./producers";
import { getEligibilityByCountry, getProductComplianceAssessments, getProjectById, getProjects } from "./projects";

// Spec 0067 AC-2, AC-3, AC-4, AC-6, AC-7: tlumaczenia producenta, certyfikatow
// i czterech pol produktu, z fallbackiem na polski per pole. Dev DB.
describe.skipIf(!process.env.DATABASE_URL)("lib/data: translations (spec 0067)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const certificationId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  // Unikalne teksty, żeby słownik (po dokładnym polskim tekście) nie kolidował z prawdziwymi danymi.
  const suffix = crypto.randomUUID().slice(0, 8);
  const reasonPl = `Powód zgodności ${suffix}`;
  const partyPl = `Odpowiedzialny ${suffix}`;
  const startsPl = `Start etapu ${suffix}`;

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
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      completionStandard: "katalogowy",
      priceMinCents: 1000000,
      isDefault: true,
      sortOrder: 1,
    });
    await db.insert(productTimelineStage).values({
      productVariantId: variantId,
      stageKey: "montaz",
      durationMinDays: 3,
      durationMaxDays: 5,
      startsFromLabel: startsPl,
      responsibleParty: partyPl,
    });
    await db.insert(productCountryEligibility).values({
      productId,
      countryCode: "DE",
      status: "conditional",
      reason: reasonPl,
    });
    await db.insert(productComplianceAssessment).values({
      productId,
      countryCode: "DE",
      rule: `Przepis ${suffix}`,
      status: "conditional",
      reason: reasonPl,
    });
    await db.insert(referenceTextTranslation).values([
      { sourcePl: reasonPl, locale: "en", translated: "Reason EN" },
      { sourcePl: reasonPl, locale: "de", translated: "Grund DE" },
      { sourcePl: partyPl, locale: "de", translated: "Verantwortlich DE" },
      { sourcePl: startsPl, locale: "de", translated: "Start DE" },
    ]);
    await db.insert(productTranslation).values([
      { productId, locale: "nl", roofType: "Zadeldak", constructionSystem: "Stalen frame" },
      // Tylko jedno pole przetlumaczone, reszta po polsku.
      { productId, locale: "en", roofType: "Gable", constructionSystem: "" },
    ]);
  });

  afterAll(async () => {
    await db.delete(referenceTextTranslation).where(inArray(referenceTextTranslation.sourcePl, [reasonPl, partyPl, startsPl]));
    await db.delete(productComplianceAssessment).where(eq(productComplianceAssessment.productId, productId));
    await db.delete(productCountryEligibility).where(eq(productCountryEligibility.productId, productId));
    await db.delete(productTimelineStage).where(eq(productTimelineStage.productVariantId, variantId));
    await db.delete(productVariant).where(eq(productVariant.id, variantId));
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

  it("translates the eligibility reason through the dictionary and keeps Polish for pl or a missing entry (AC-5, AC-6, AC-7)", async () => {
    const find = (rows: Awaited<ReturnType<typeof getEligibilityByCountry>>) => rows.find((row) => row.projectId === productId);
    expect(find(await getEligibilityByCountry("DE", "en"))?.reason).toBe("Reason EN");
    expect(find(await getEligibilityByCountry("DE", "de"))?.reason).toBe("Grund DE");
    // Brak wpisu w słowniku dla nl: polski tekst, nigdy pusty.
    expect(find(await getEligibilityByCountry("DE", "nl"))?.reason).toBe(reasonPl);
    expect(find(await getEligibilityByCountry("DE"))?.reason).toBe(reasonPl);
  });

  it("translates the compliance assessment reason through the dictionary (AC-5, AC-6)", async () => {
    expect((await getProductComplianceAssessments(productId, "de"))[0]?.reason).toBe("Grund DE");
    expect((await getProductComplianceAssessments(productId, "nl"))[0]?.reason).toBe(reasonPl);
    expect((await getProductComplianceAssessments(productId))[0]?.reason).toBe(reasonPl);
  });

  it("translates the timeline stage responsible party and start label through the dictionary (AC-5, AC-6)", async () => {
    const de = await getProjectById(productId, "de");
    expect(de?.variants[0]?.timelineStages[0]).toMatchObject({ responsibleParty: "Verantwortlich DE", startsFromLabel: "Start DE" });
    const nl = await getProjectById(productId, "nl");
    expect(nl?.variants[0]?.timelineStages[0]).toMatchObject({ responsibleParty: partyPl, startsFromLabel: startsPl });
  });

  it("returns Polish product fields for pl (AC-7)", async () => {
    const pl = await getProjectById(productId, "pl");
    expect(pl).toMatchObject({ roofType: "Dwuspadowy", constructionSystem: "Szkielet stalowy" });
  });
});
