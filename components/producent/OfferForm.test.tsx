import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitOffer } from "@/lib/offer-actions";
import { OfferForm } from "./OfferForm";

vi.mock("@/lib/offer-actions", () => ({
  submitOffer: vi.fn(),
}));

const mockedSubmitOffer = vi.mocked(submitOffer);

const oneProduct = [{ productId: "prod-1", productName: "Dom Testowy", available: true, defaultHousePriceEur: 0 }];

beforeEach(() => {
  mockedSubmitOffer.mockReset();
});

describe("OfferForm", () => {
  it("renders one price input per product, plus transport and installation, all required", () => {
    render(<OfferForm inquiryId="inq-1" products={oneProduct} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    expect(screen.getByLabelText(/Dom Testowy/)).toBeRequired();
    expect(screen.getByLabelText(/Transport/)).toBeRequired();
    expect(screen.getByLabelText(/Montaż/)).toBeRequired();
  });

  it("marks an unavailable product with a warning, but still renders its price input", () => {
    const products = [{ productId: "prod-1", productName: "Dom Niedostępny", available: false, defaultHousePriceEur: 0 }];
    render(<OfferForm inquiryId="inq-1" products={products} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    expect(screen.getByText(/nie jest już opublikowany/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dom Niedostępny/)).toBeInTheDocument();
  });

  it("prefills each field from defaultHousePriceEur / initial transport / initial installation (revision defaults)", () => {
    const products = [{ productId: "prod-1", productName: "Dom Testowy", available: true, defaultHousePriceEur: 42000 }];
    render(<OfferForm inquiryId="inq-1" products={products} initialTransportPriceEur={3000} initialInstallationPriceEur={1500} isRevision />);

    expect(screen.getByLabelText(/Dom Testowy/)).toHaveValue(42000);
    expect(screen.getByLabelText(/Transport/)).toHaveValue(3000);
    expect(screen.getByLabelText(/Montaż/)).toHaveValue(1500);
    expect(screen.getByRole("button", { name: /poprawioną ofertę/i })).toBeInTheDocument();
  });

  // AC-15 client-side defense: the "-" keystroke itself is clamped to 0 the
  // instant it's typed (Number("-") is NaN), so a negative value can never
  // land in state even transiently; digits typed after it build a fresh
  // positive number instead of resuming a negative one.
  it("never lets a negative value land in state while typing a minus sign", async () => {
    const user = userEvent.setup();
    render(<OfferForm inquiryId="inq-1" products={oneProduct} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    const input = screen.getByLabelText(/Dom Testowy/);
    await user.clear(input);
    await user.type(input, "-");
    expect(input).toHaveValue(0);

    await user.type(input, "500");
    expect((input as HTMLInputElement).valueAsNumber).toBeGreaterThanOrEqual(0);
  });

  it("submits the entered prices for each product plus transport and installation", async () => {
    const user = userEvent.setup();
    mockedSubmitOffer.mockResolvedValue({ ok: true });
    render(<OfferForm inquiryId="inq-1" products={oneProduct} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    await user.type(screen.getByLabelText(/Dom Testowy/), "45000");
    await user.type(screen.getByLabelText(/Transport/), "3200");
    await user.type(screen.getByLabelText(/Montaż/), "1800");
    await user.click(screen.getByRole("button", { name: "Wyślij ofertę" }));

    await waitFor(() => {
      expect(mockedSubmitOffer).toHaveBeenCalledWith({
        inquiryId: "inq-1",
        items: [{ productId: "prod-1", housePriceEur: 45000 }],
        transportPriceEur: 3200,
        installationPriceEur: 1800,
      });
    });
  });

  it("shows a success message once submitOffer resolves ok:true", async () => {
    const user = userEvent.setup();
    mockedSubmitOffer.mockResolvedValue({ ok: true });
    render(<OfferForm inquiryId="inq-1" products={oneProduct} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    await user.click(screen.getByRole("button", { name: "Wyślij ofertę" }));

    await waitFor(() => {
      expect(screen.getByText("Oferta wysłana do klienta.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Wyślij ofertę" })).not.toBeInTheDocument();
  });

  it("shows the server error and keeps the form when submitOffer resolves ok:false", async () => {
    const user = userEvent.setup();
    mockedSubmitOffer.mockResolvedValue({ ok: false, error: "Klient już przyjął wcześniejszą ofertę na to zapytanie — nie można jej zastąpić." });
    render(<OfferForm inquiryId="inq-1" products={oneProduct} initialTransportPriceEur={0} initialInstallationPriceEur={0} isRevision={false} />);

    await user.click(screen.getByRole("button", { name: "Wyślij ofertę" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/już przyjął/);
    });
    expect(screen.getByRole("button", { name: "Wyślij ofertę" })).toBeInTheDocument();
  });
});
