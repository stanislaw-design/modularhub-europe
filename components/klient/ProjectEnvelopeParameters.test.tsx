import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProductEnvelopeParameter } from "@/lib/data/types";
import { ProjectEnvelopeParameters } from "./ProjectEnvelopeParameters";

const declared: ProductEnvelopeParameter = {
  element: "wall",
  quantity: "u_value",
  value: 0.22,
  method: "calculation",
  methodNote: "EN ISO 6946",
  asOfDate: "2026-10-01",
  confirmed: false,
  confirmedAt: null,
};
const confirmed: ProductEnvelopeParameter = {
  element: "window",
  quantity: "u_value",
  value: 0.9,
  method: "lab_test",
  methodNote: null,
  asOfDate: "2026-09-15",
  confirmed: true,
  confirmedAt: new Date("2026-10-02T10:00:00Z"),
};

describe("ProjectEnvelopeParameters (spec 0075)", () => {
  it("renders nothing without rows (AC-11, AC-15)", async () => {
    const { container } = render(await ProjectEnvelopeParameters({ parameters: [], locale: "pl" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows value, unit, method, date and the declaration state as text (AC-11, AC-17)", async () => {
    render(await ProjectEnvelopeParameters({ parameters: [declared], locale: "pl" }));
    expect(screen.getByRole("heading", { name: "Izolacja przegród" })).toBeInTheDocument();
    expect(screen.getByText(/U 0,22 W\/m²K/)).toBeInTheDocument();
    expect(screen.getByText(/Obliczenia \(EN ISO 6946\)/)).toBeInTheDocument();
    expect(screen.getByText(/Stan na dzień \d/)).toBeInTheDocument();
    expect(screen.getByText("Deklaracja producenta, niepotwierdzona")).toBeInTheDocument();
    expect(screen.queryByText("Potwierdzone przez platformę")).not.toBeInTheDocument();
  });

  it("marks a confirmed row and explains what was checked (AC-11)", async () => {
    render(await ProjectEnvelopeParameters({ parameters: [confirmed], locale: "pl" }));
    expect(screen.getByText(/Uw 0,90 W\/m²K/)).toBeInTheDocument();
    expect(screen.getAllByText("Potwierdzone przez platformę").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/To nie jest certyfikat ani badanie\./).length).toBeGreaterThan(0);
  });

  it("offers a native details control with the explanation (AC-12, AC-17)", async () => {
    const { container } = render(await ProjectEnvelopeParameters({ parameters: [declared], locale: "pl" }));
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Co to znaczy?")).toBeInTheDocument();
    expect(container.querySelector("details summary")).not.toBeNull();
  });

  it("shows the foundation line only when it is set (AC-11)", async () => {
    const { unmount } = render(
      await ProjectEnvelopeParameters({ parameters: [declared], foundationStatus: "temporary", locale: "pl" }),
    );
    expect(screen.getByText("Posadowienie: tymczasowe")).toBeInTheDocument();
    unmount();
    render(await ProjectEnvelopeParameters({ parameters: [declared], foundationStatus: null, locale: "pl" }));
    expect(screen.queryByText(/Posadowienie:/)).not.toBeInTheDocument();
  });

  it("shows the 50 m² note only for 40 to 60 m² (AC-14)", async () => {
    const first = render(await ProjectEnvelopeParameters({ parameters: [declared], floorAreaM2: 52, locale: "pl" }));
    expect(screen.getByText(/Próg 50 m²/)).toBeInTheDocument();
    first.unmount();
    const second = render(await ProjectEnvelopeParameters({ parameters: [declared], floorAreaM2: 120, locale: "pl" }));
    expect(screen.queryByText(/Próg 50 m²/)).not.toBeInTheDocument();
    second.unmount();
    render(await ProjectEnvelopeParameters({ parameters: [declared], floorAreaM2: null, locale: "pl" }));
    expect(screen.queryByText(/Próg 50 m²/)).not.toBeInTheDocument();
  });

  it("always shows the disclaimer and never claims compliance (AC-11)", async () => {
    const { container } = render(await ProjectEnvelopeParameters({ parameters: [declared, confirmed], locale: "pl" }));
    expect(screen.getByText(/nie zastępują obliczeń projektanta/)).toBeInTheDocument();
    const text = (container.textContent ?? "").toLowerCase();
    for (const phrase of ["zgodne z", "zgodny z", "spełnia przepisy"]) expect(text).not.toContain(phrase);
  });
});
