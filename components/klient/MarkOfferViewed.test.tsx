import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markOfferViewedByClient } from "@/lib/offer-actions";
import { MarkOfferViewed } from "./MarkOfferViewed";

vi.mock("@/lib/offer-actions", () => ({
  markOfferViewedByClient: vi.fn(),
}));

const mockedMark = vi.mocked(markOfferViewedByClient);

beforeEach(() => {
  mockedMark.mockReset();
});

describe("MarkOfferViewed", () => {
  it("calls markOfferViewedByClient with the given inquiryId after mount, and renders nothing", async () => {
    const { container } = render(<MarkOfferViewed inquiryId="inq-1" />);

    await waitFor(() => {
      expect(mockedMark).toHaveBeenCalledWith("inq-1");
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("calls it again when the inquiryId prop changes", async () => {
    const { rerender } = render(<MarkOfferViewed inquiryId="inq-1" />);
    await waitFor(() => expect(mockedMark).toHaveBeenCalledWith("inq-1"));

    rerender(<MarkOfferViewed inquiryId="inq-2" />);

    await waitFor(() => {
      expect(mockedMark).toHaveBeenCalledWith("inq-2");
    });
  });
});
