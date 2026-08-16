import { describe, expect, it } from "vitest";
import { producerInquiries } from "./fixtures/producer-inquiries";
import { getProducerInquiries, getProducerInquiryById } from "./producer-inquiries";

describe("getProducerInquiries", () => {
  it("returns every fixture inquiry", async () => {
    const inquiries = await getProducerInquiries();

    expect(inquiries).toEqual(producerInquiries);
  });

  it("returns at least one inquiry per delivery country in the fixture", async () => {
    const inquiries = await getProducerInquiries();
    const countries = new Set(inquiries.map((inquiry) => inquiry.deliveryCountry));

    expect(countries).toEqual(new Set(["PL", "DE", "NL"]));
  });
});

describe("getProducerInquiryById", () => {
  it("returns the matching inquiry for a known id", async () => {
    const inquiry = await getProducerInquiryById("inq-001");

    expect(inquiry?.id).toBe("inq-001");
    expect(inquiry?.projectId).toBe("prj-modulor-family-90");
  });

  it("returns null for an unknown id", async () => {
    const inquiry = await getProducerInquiryById("does-not-exist");

    expect(inquiry).toBeNull();
  });
});
