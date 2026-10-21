import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect: (...args: unknown[]) => redirectMock(...args) }));

import ProducerProductInquiriesRedirect from "./page";

beforeEach(() => redirectMock.mockReset());

// Spec 0074 AC-8.
describe("ProducerProductInquiriesRedirect", () => {
  it("sends the old list address to the merged inquiries list", async () => {
    await ProducerProductInquiriesRedirect({ params: Promise.resolve({ locale: "pl" }) });
    expect(redirectMock).toHaveBeenCalledWith("/pl/producer/panel/inquiries");
  });
});
