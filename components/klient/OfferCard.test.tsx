import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { respondToOffer } from "@/lib/offer-actions";
import type { ClientOfferSummary } from "@/lib/db/queries";
import { OfferCard } from "./OfferCard";

vi.mock("@/lib/offer-actions", () => ({
  respondToOffer: vi.fn(),
}));

const mockedRespondToOffer = vi.mocked(respondToOffer);

// Built with the same formatter the component uses. pl-PL grouping renders a
// narrow no-break space (U+202F); Testing Library's getByText normalizes the
// DOM's text (collapsing it to a regular space) but does NOT normalize the
// string matcher you pass in, so the matcher has to be pre-normalized too.
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
function eur(cents: number): string {
  return `${priceFormatter.format(cents / 100)} €`.replace(/\s/g, " ");
}

function makeOffer(overrides: Partial<ClientOfferSummary> = {}): ClientOfferSummary {
  return {
    id: "offer-1",
    producerId: "prod-1",
    producerName: "Testowy Producent",
    status: "active",
    transportPriceCents: 320000,
    installationPriceCents: 180000,
    submittedAt: new Date("2026-01-01T10:00:00Z"),
    clientViewedAt: null,
    items: [{ productId: "prod-item-1", productName: "Dom Testowy", housePriceCents: 4500000 }],
    ...overrides,
  };
}

beforeEach(() => {
  mockedRespondToOffer.mockReset();
});

describe("OfferCard", () => {
  it("shows producer name, per-product price, transport, installation and the correct total", () => {
    render(<OfferCard offer={makeOffer()} />);

    expect(screen.getByText("Testowy Producent")).toBeInTheDocument();
    expect(screen.getByText(eur(4500000))).toBeInTheDocument(); // house price
    expect(screen.getByText(eur(320000))).toBeInTheDocument(); // transport
    expect(screen.getByText(eur(180000))).toBeInTheDocument(); // installation
    expect(screen.getByText(eur(5000000))).toBeInTheDocument(); // total = 45000 + 3200 + 1800
  });

  it("shows accept/reject buttons only while the offer is active", () => {
    render(<OfferCard offer={makeOffer({ status: "active" })} />);

    expect(screen.getByRole("button", { name: "Przyjmij ofertę" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Odrzuć ofertę" })).toBeInTheDocument();
  });

  // AC-9: accept/reject are final, no undo affordance once decided.
  it("shows an 'accepted' label with no buttons for an already-accepted offer", () => {
    render(<OfferCard offer={makeOffer({ status: "accepted" })} />);

    expect(screen.getByText("Przyjęta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Przyjmij ofertę" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Odrzuć ofertę" })).not.toBeInTheDocument();
  });

  it("shows a 'rejected' label with no buttons for an already-rejected offer", () => {
    render(<OfferCard offer={makeOffer({ status: "rejected" })} />);

    expect(screen.getByText("Odrzucona")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Przyjmij ofertę" })).not.toBeInTheDocument();
  });

  it("calls respondToOffer(offerId, 'accepted') and shows the accepted state on success", async () => {
    const user = userEvent.setup();
    mockedRespondToOffer.mockResolvedValue({ ok: true });
    render(<OfferCard offer={makeOffer({ id: "offer-42" })} />);

    await user.click(screen.getByRole("button", { name: "Przyjmij ofertę" }));

    await waitFor(() => {
      expect(mockedRespondToOffer).toHaveBeenCalledWith("offer-42", "accepted");
    });
    await waitFor(() => {
      expect(screen.getByText("Przyjęta")).toBeInTheDocument();
    });
  });

  it("calls respondToOffer(offerId, 'rejected') and shows the rejected state on success", async () => {
    const user = userEvent.setup();
    mockedRespondToOffer.mockResolvedValue({ ok: true });
    render(<OfferCard offer={makeOffer({ id: "offer-42" })} />);

    await user.click(screen.getByRole("button", { name: "Odrzuć ofertę" }));

    await waitFor(() => {
      expect(mockedRespondToOffer).toHaveBeenCalledWith("offer-42", "rejected");
    });
    await waitFor(() => {
      expect(screen.getByText("Odrzucona")).toBeInTheDocument();
    });
  });

  // AC-19: a race error keeps the card actionable, doesn't silently succeed.
  it("shows the server's race error and keeps the buttons when respondToOffer resolves ok:false", async () => {
    const user = userEvent.setup();
    mockedRespondToOffer.mockResolvedValue({ ok: false, error: "Ta oferta nie jest już aktywna — mogła zostać właśnie zastąpiona lub jej stan się zmienił. Odśwież stronę." });
    render(<OfferCard offer={makeOffer()} />);

    await user.click(screen.getByRole("button", { name: "Przyjmij ofertę" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/nie jest już aktywna/);
    });
    expect(screen.getByRole("button", { name: "Przyjmij ofertę" })).toBeInTheDocument();
  });

  it("renders multiple product lines when the offer covers more than one product", () => {
    const offer = makeOffer({
      items: [
        { productId: "p1", productName: "Dom Alfa", housePriceCents: 3000000 },
        { productId: "p2", productName: "Dom Beta", housePriceCents: 2000000 },
      ],
    });
    render(<OfferCard offer={offer} />);

    expect(screen.getByText("Dom Alfa")).toBeInTheDocument();
    expect(screen.getByText("Dom Beta")).toBeInTheDocument();
    expect(screen.getByText(eur(3000000))).toBeInTheDocument();
    expect(screen.getByText(eur(2000000))).toBeInTheDocument();
  });
});
