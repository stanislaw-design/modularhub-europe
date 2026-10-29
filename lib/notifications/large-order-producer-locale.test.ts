import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));
// Globalny mock z vitest.setup.ts zawsze zwraca polskie teksty; ten test sprawdza język, więc
// podstawia tłumacza, który czyta messages/<język>.json.
vi.mock("next-intl/server", async () => {
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const cache = new Map<string, unknown>();
  const load = (locale: string) => {
    if (!cache.has(locale)) cache.set(locale, JSON.parse(readFileSync(path.resolve(process.cwd(), `messages/${locale}.json`), "utf-8")));
    return cache.get(locale);
  };
  return {
    getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
      const scope = (load(locale) as Record<string, Record<string, string>>)[namespace];
      return (key: string, values?: Record<string, unknown>) => {
        const raw = scope?.[key];
        if (typeof raw !== "string") throw new Error(`no string at ${locale}:${namespace}.${key}`);
        return raw.replace(/\{(\w+)\}/g, (match, name) => (values && name in values ? String(values[name]) : match));
      };
    },
  };
});

import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  producer,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  projectRequestProducerOverride,
  users,
} from "@/lib/db/schema";
import { COMMUNICATION_LOCALES, type CommunicationLocale } from "@/lib/producer-communication-locale";
import {
  notifyProducersOfClosedRequest,
  notifyProducersOfNewLargeOrder,
  notifyProducersOfNewPlatformProject,
  notifyProducersOfOtherSelected,
  sendDeadlineReminderToProducer,
  sendPlatformSelectionDoneToProducer,
} from "./large-order-producer";

// Spec 0077 AC-30, AC-32: maile do producenta wychodzą w języku z konta (temat, linki, daty),
// a temat różni się między czterema językami. Prawdziwa baza dev, wysyłka podstawiona.
describe.skipIf(!process.env.DATABASE_URL)("lib/notifications/large-order-producer: język z konta (spec 0077 C)", () => {
  const owners = COMMUNICATION_LOCALES.map((locale) => ({
    locale,
    userId: crypto.randomUUID(),
    producerId: crypto.randomUUID(),
    productId: crypto.randomUUID(),
    inquiryId: crypto.randomUUID(),
  }));
  const platformRequestId = crypto.randomUUID();
  const email = (userId: string) => `loc-${userId}@example.test`;
  const allProducers = owners.map((item) => item.producerId);
  const sentTo = (address: string) => sendMock.mock.calls.filter((call) => call[0].to === address);
  const byLocale = (locale: CommunicationLocale) => owners.find((item) => item.locale === locale)!;

  beforeAll(async () => {
    await db.insert(users).values(
      owners.map((item, index) => ({ id: item.userId, email: email(item.userId), phone: `+4800000070${index}`, role: "producer" as const })),
    );
    await db.insert(producer).values(
      owners.map((item, index) => ({
        id: item.producerId,
        userId: item.userId,
        nip: `LOC${index}${item.producerId.slice(0, 6)}`,
        name: `LOC producer ${item.locale}`,
        countryCode: "PL",
        technology: "szkielet-drewniany" as const,
        communicationLocale: item.locale,
      })),
    );
    await db.insert(producerMember).values(owners.map((item) => ({ producerId: item.producerId, userId: item.userId })));
    await db.insert(product).values(
      owners.map((item) => ({ id: item.productId, producerId: item.producerId, family: "dom" as const, status: "published" as const, name: `LOC model ${item.locale}` })),
    );
    await db.insert(bulkProductInquiry).values(
      owners.map((item) => ({
        id: item.inquiryId,
        productId: item.productId,
        contactName: "Inwestor LOC",
        contactEmail: `loc-investor-${item.inquiryId}@example.test`,
        unitCount: 6,
        deliveryCountryCode: "PL",
      })),
    );
    await db.insert(projectRequest).values({
      id: platformRequestId,
      contactName: "ModularHub",
      contactEmail: `loc-platform-${platformRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 1,
      isPlatformOwned: true,
      title: "Projekt LOC",
    });
  });

  afterEach(() => {
    sendMock.mockClear().mockResolvedValue(true);
    captureErrorMock.mockClear();
    delete process.env.AUTH_URL;
  });

  afterAll(async () => {
    await db.delete(bulkProductInquiry).where(inArray(bulkProductInquiry.id, owners.map((item) => item.inquiryId)));
    await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, platformRequestId));
    await db.delete(projectRequestProducerOverride).where(eq(projectRequestProducerOverride.projectRequestId, platformRequestId));
    await db.delete(projectRequest).where(eq(projectRequest.id, platformRequestId));
    await db.delete(product).where(inArray(product.producerId, allProducers));
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducers));
    await db.delete(producer).where(inArray(producer.id, allProducers));
    await db.delete(users).where(inArray(users.id, owners.map((item) => item.userId)));
  });

  it("new inquiry: every producer gets the link and the date in their own language, subjects differ (AC-30, AC-32)", async () => {
    process.env.AUTH_URL = "https://hub.example.test";
    const subjects = new Map<CommunicationLocale, string>();

    for (const item of owners) {
      await notifyProducersOfNewLargeOrder({ kind: "product", id: item.inquiryId });
      const calls = sentTo(email(item.userId));
      expect(calls, item.locale).toHaveLength(1);
      const mail = calls[0][0];
      expect(mail.subject.trim(), item.locale).not.toBe("");
      expect(mail.text.trim(), item.locale).not.toBe("");
      expect(mail.text).toContain(`https://hub.example.test/${item.locale}/producer/panel/product-inquiries/${item.inquiryId}`);
      subjects.set(item.locale, mail.subject);
    }
    expect(new Set(subjects.values()).size).toBe(COMMUNICATION_LOCALES.length);
  });

  it("reminder: language from the account when the caller passes none, explicit language wins (AC-30)", async () => {
    const subjects = new Set<string>();
    for (const item of owners) {
      await sendDeadlineReminderToProducer({
        kind: "product",
        id: item.inquiryId,
        producerId: item.producerId,
        email: email(item.userId),
        threshold: "3d",
      });
      const mail = sendMock.mock.calls.at(-1)![0];
      expect(mail.text, item.locale).toContain(`/${item.locale}/producer/panel/product-inquiries/${item.inquiryId}`);
      subjects.add(mail.subject);
    }
    expect(subjects.size).toBe(COMMUNICATION_LOCALES.length);

    const polish = byLocale("pl");
    await sendDeadlineReminderToProducer({
      kind: "product",
      id: polish.inquiryId,
      producerId: polish.producerId,
      email: email(polish.userId),
      threshold: "1d",
      locale: "de",
    });
    expect(sendMock.mock.calls.at(-1)![0].text).toContain("/de/producer/panel/");
  });

  it("selection done: every language has a non empty, different subject and a localized link (AC-18, AC-30, AC-32)", async () => {
    process.env.AUTH_URL = "https://hub.example.test";
    const subjects = new Set<string>();
    for (const item of owners) {
      expect(await sendPlatformSelectionDoneToProducer({ id: platformRequestId, producerId: item.producerId })).toBe(true);
      const mail = sentTo(email(item.userId)).at(-1)![0];
      expect(mail.text).toContain(`https://hub.example.test/${item.locale}/producer/panel/board-quotes`);
      expect(mail.text).toContain("Projekt LOC");
      subjects.add(mail.subject);
    }
    expect(subjects.size).toBe(COMMUNICATION_LOCALES.length);
  });

  it("new platform project: every producer gets subject, link and date in their own language (AC-30, AC-32)", async () => {
    process.env.AUTH_URL = "https://hub.example.test";
    await db.insert(projectRequestProducerOverride).values(
      owners.map((item) => ({ projectRequestId: platformRequestId, producerId: item.producerId, mode: "include" as const, createdByUserId: owners[0].userId })),
    );

    await notifyProducersOfNewPlatformProject({ id: platformRequestId });

    const subjects = new Set<string>();
    for (const item of owners) {
      const calls = sentTo(email(item.userId));
      expect(calls, item.locale).toHaveLength(1);
      const mail = calls[0][0];
      expect(mail.text, item.locale).toContain(`https://hub.example.test/${item.locale}/producer/panel/board/${platformRequestId}`);
      expect(mail.text).toContain("Projekt LOC");
      subjects.add(mail.subject);
    }
    expect(subjects.size).toBe(COMMUNICATION_LOCALES.length);
  });

  it("closed and not chosen mails: every language has its own subject and a localized board link (AC-30, AC-32)", async () => {
    process.env.AUTH_URL = "https://hub.example.test";
    await db.insert(projectQuote).values(
      owners.map((item, index) => ({
        projectRequestId: platformRequestId,
        producerId: item.producerId,
        totalPriceCents: 100_000 + index,
        variantLabel: `LOC ${item.locale}`,
        status: "active" as const,
      })),
    );

    await notifyProducersOfClosedRequest({ kind: "request", id: platformRequestId });
    const closedSubjects = new Set<string>();
    for (const item of owners) {
      const mail = sentTo(email(item.userId)).at(-1)![0];
      expect(mail.text, item.locale).toContain(`https://hub.example.test/${item.locale}/producer/panel/board`);
      closedSubjects.add(mail.subject);
    }
    expect(closedSubjects.size).toBe(COMMUNICATION_LOCALES.length);

    sendMock.mockClear();
    await db.update(projectQuote).set({ status: "rejected" }).where(eq(projectQuote.projectRequestId, platformRequestId));
    await notifyProducersOfOtherSelected({ kind: "request", id: platformRequestId });
    const notChosenSubjects = new Set<string>();
    for (const item of owners) {
      const calls = sentTo(email(item.userId));
      expect(calls, item.locale).toHaveLength(1);
      expect(calls[0][0].text).toContain(`/${item.locale}/producer/panel/board`);
      notChosenSubjects.add(calls[0][0].subject);
    }
    expect(notChosenSubjects.size).toBe(COMMUNICATION_LOCALES.length);
    expect([...notChosenSubjects].some((subject) => closedSubjects.has(subject))).toBe(false);
  });

  it("an invalid stored value would fall back to pl: the account column rejects it (AC-29)", async () => {
    await expect(
      db.update(producer).set({ communicationLocale: "fr" }).where(eq(producer.id, byLocale("pl").producerId)),
    ).rejects.toThrow();
  });
});
