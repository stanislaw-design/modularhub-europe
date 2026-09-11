import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markOfferDecisionViewedByProducer } from "@/lib/offer-actions";
import { MarkOfferDecisionViewed } from "./MarkOfferDecisionViewed";

vi.mock("@/lib/offer-actions", () => ({
  markOfferDecisionViewedByProducer: vi.fn(),
}));

const mockedMark = vi.mocked(markOfferDecisionViewedByProducer);

beforeEach(() => {
  mockedMark.mockReset();
});

describe("MarkOfferDecisionViewed", () => {
  it("calls markOfferDecisionViewedByProducer with the given inquiryId after mount, and renders nothing", async () => {
    const { container } = render(<MarkOfferDecisionViewed inquiryId="inq-1" />);

    await waitFor(() => {
      expect(mockedMark).toHaveBeenCalledWith("inq-1");
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("calls it again when the inquiryId prop changes", async () => {
    const { rerender } = render(<MarkOfferDecisionViewed inquiryId="inq-1" />);
    await waitFor(() => expect(mockedMark).toHaveBeenCalledWith("inq-1"));

    rerender(<MarkOfferDecisionViewed inquiryId="inq-2" />);

    await waitFor(() => {
      expect(mockedMark).toHaveBeenCalledWith("inq-2");
    });
  });
});
