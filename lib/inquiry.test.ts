import { describe, expect, it } from "vitest";
import { parseInquiryProjectIds } from "./inquiry";

const knownIds = new Set(["id1", "id2", "id3", "id4"]);

describe("parseInquiryProjectIds", () => {
  it("returns the parsed ids for a single valid id (AC-5)", () => {
    expect(parseInquiryProjectIds("id1", knownIds)).toEqual(["id1"]);
  });

  it("returns the parsed ids for 2 to 3 valid ids (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,id2", knownIds)).toEqual(["id1", "id2"]);
    expect(parseInquiryProjectIds("id1,id2,id3", knownIds)).toEqual(["id1", "id2", "id3"]);
  });

  it("returns null when raw is undefined (AC-5)", () => {
    expect(parseInquiryProjectIds(undefined, knownIds)).toBeNull();
  });

  it("returns null when raw is an empty string (AC-5)", () => {
    expect(parseInquiryProjectIds("", knownIds)).toBeNull();
  });

  it("returns null when raw is given as an array (repeated query param) (AC-5)", () => {
    expect(parseInquiryProjectIds(["id1", "id2"], knownIds)).toBeNull();
  });

  it("drops duplicate ids before checking the 1 to 3 bound (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,id1,id2", knownIds)).toEqual(["id1", "id2"]);
  });

  it("drops ids not present in knownIds (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,unknown-id,id2", knownIds)).toEqual(["id1", "id2"]);
  });

  it("cleans a mix of duplicates and unknown ids down to the valid set (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,id1,id2,unknown-id", knownIds)).toEqual(["id1", "id2"]);
  });

  it("returns null when nothing valid remains after cleaning (AC-5)", () => {
    expect(parseInquiryProjectIds("unknown-a,unknown-b", knownIds)).toBeNull();
  });

  it("returns null when more than 3 valid ids remain after dedupe (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,id2,id3,id4", knownIds)).toBeNull();
  });

  it("returns null when knownIds is empty regardless of raw (AC-5)", () => {
    expect(parseInquiryProjectIds("id1,id2", new Set())).toBeNull();
  });
});
