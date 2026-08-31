import { describe, expect, it } from "vitest";
import { getProducerById } from "./producers";

describe("getProducerById", () => {
  it("returns the matching producer for a known id (spec 0020)", async () => {
    const producer = await getProducerById("prod-modulor");
    expect(producer?.name).toBe("Modulor Systems Sp. z o.o.");
  });

  it("returns null for an unknown id instead of throwing (spec 0020)", async () => {
    expect(await getProducerById("does-not-exist")).toBeNull();
  });

  it("returns null for an empty id", async () => {
    expect(await getProducerById("")).toBeNull();
  });
});
