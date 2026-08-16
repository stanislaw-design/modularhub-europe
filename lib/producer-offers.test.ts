import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredOffer, saveOffer, type StoredProducerOffer } from "./producer-offers";

const offer: StoredProducerOffer = {
  housePriceEur: 125000,
  installationPriceEur: 9500,
  submittedAt: "2026-08-16T09:31:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getStoredOffer", () => {
  it("is null for an inquiry with no saved offer", () => {
    expect(getStoredOffer("inq-001")).toBeNull();
  });

  it("returns the saved offer for its inquiry id", () => {
    saveOffer("inq-001", offer);

    expect(getStoredOffer("inq-001")).toEqual(offer);
  });

  it("does not return an unrelated inquiry's offer", () => {
    saveOffer("inq-001", offer);

    expect(getStoredOffer("inq-002")).toBeNull();
  });

  it("treats corrupted JSON in storage as no saved offers", () => {
    window.localStorage.setItem("producent:zapytania:oferty", "{not json");

    expect(getStoredOffer("inq-001")).toBeNull();
  });

  it("treats an array value in storage as no saved offers", () => {
    window.localStorage.setItem("producent:zapytania:oferty", JSON.stringify(["oops"]));

    expect(getStoredOffer("inq-001")).toBeNull();
  });
});

describe("saveOffer", () => {
  it("keeps offers for multiple inquiries side by side", () => {
    const otherOffer: StoredProducerOffer = { ...offer, housePriceEur: 200000 };
    saveOffer("inq-001", offer);
    saveOffer("inq-002", otherOffer);

    expect(getStoredOffer("inq-001")).toEqual(offer);
    expect(getStoredOffer("inq-002")).toEqual(otherOffer);
  });

  it("overwrites a previous offer for the same inquiry", () => {
    saveOffer("inq-001", offer);
    const updated: StoredProducerOffer = { ...offer, housePriceEur: 130000 };
    saveOffer("inq-001", updated);

    expect(getStoredOffer("inq-001")).toEqual(updated);
  });

  it("fails soft when storage write throws", () => {
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveOffer("inq-001", offer)).not.toThrow();
  });
});
