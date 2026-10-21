import { describe, expect, it } from "vitest";
import {
  deriveProductInquiryStatus,
  deriveShortlistStatus,
  parseInquiryListFilter,
  sortMergedInquiries,
  type MergedInquiryRow,
} from "./producer-inquiry-list";

// Spec 0074 AC-7: statusy scalonej listy, filtr i kolejność.
describe("deriveShortlistStatus", () => {
  it("maps the inquiry status when the producer has no decided offer", () => {
    expect(deriveShortlistStatus("open", null)).toBe("needs-offer");
    expect(deriveShortlistStatus("offered", "active")).toBe("offered");
    expect(deriveShortlistStatus("closed", "superseded")).toBe("closed");
  });

  it("treats an accepted or rejected own offer as a client decision whatever the inquiry status", () => {
    expect(deriveShortlistStatus("closed", "accepted")).toBe("decision");
    expect(deriveShortlistStatus("offered", "rejected")).toBe("decision");
  });
});

describe("deriveProductInquiryStatus", () => {
  it("needs an offer only while accepting quotes without an own quote", () => {
    expect(deriveProductInquiryStatus(true, null)).toBe("needs-offer");
    expect(deriveProductInquiryStatus(false, null)).toBe("closed");
  });

  it("derives decision and offered from the own quote", () => {
    expect(deriveProductInquiryStatus(false, "accepted")).toBe("decision");
    expect(deriveProductInquiryStatus(true, "rejected")).toBe("decision");
    expect(deriveProductInquiryStatus(true, "active")).toBe("offered");
    expect(deriveProductInquiryStatus(false, "superseded")).toBe("offered");
  });
});

describe("parseInquiryListFilter", () => {
  it("accepts the known statuses and all, and rejects anything else", () => {
    expect(parseInquiryListFilter("decision")).toBe("decision");
    expect(parseInquiryListFilter("all")).toBe("all");
    expect(parseInquiryListFilter(["closed", "x"])).toBe("closed");
    expect(parseInquiryListFilter("nope")).toBeNull();
    expect(parseInquiryListFilter(undefined)).toBeNull();
  });
});

describe("sortMergedInquiries", () => {
  const row = (id: string, status: MergedInquiryRow["status"], day: number): MergedInquiryRow => ({
    id,
    source: "shortlist",
    title: id,
    countryName: "Niemcy",
    status,
    createdAt: new Date(Date.UTC(2026, 9, day)),
    href: `/x/${id}`,
    unreadDecision: false,
  });

  it("puts needs-offer first, oldest first, then the rest newest first", () => {
    const sorted = sortMergedInquiries([
      row("closed-new", "closed", 20),
      row("need-new", "needs-offer", 15),
      row("offered-old", "offered", 2),
      row("need-old", "needs-offer", 3),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["need-old", "need-new", "closed-new", "offered-old"]);
  });
});
