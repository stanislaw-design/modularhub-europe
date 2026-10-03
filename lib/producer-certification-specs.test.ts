import { describe, expect, it } from "vitest";
import { producerCertificationInputSchema } from "@/lib/producer-certification-specs";

describe("producerCertificationInputSchema", () => {
  it("trims the name and turns an empty issuer into null", () => {
    const parsed = producerCertificationInputSchema.parse({ name: "  CE  ", issuer: "   " });
    expect(parsed).toEqual({ name: "CE", issuer: null });
  });

  it("keeps a provided issuer", () => {
    const parsed = producerCertificationInputSchema.parse({ name: "ISO 9001", issuer: "TÜV" });
    expect(parsed.issuer).toBe("TÜV");
  });

  it("rejects an empty name", () => {
    expect(producerCertificationInputSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 200 characters", () => {
    expect(producerCertificationInputSchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });
});
