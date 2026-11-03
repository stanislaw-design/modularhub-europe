import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-registration", () => ({ registerProducer: vi.fn() }));

import { ProducerRegistrationForm } from "./ProducerRegistrationForm";

// Spec 0079 AC-18: zgoda na pomiar maili jest osobnym polem, niezaznaczonym i nieobowiązkowym.
describe("ProducerRegistrationForm: zgoda na pomiar otwarć i kliknięć", () => {
  it("renders an unchecked, optional checkbox that is separate from any terms field", () => {
    render(<ProducerRegistrationForm locale="pl" callbackUrl="/pl/producer/panel" countries={[]} />);

    const checkbox = screen.getByRole("checkbox", { name: /pomiar otwarć i kliknięć w mailach/i });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBeRequired();
    expect(checkbox).toHaveAttribute("name", "emailTrackingConsent");
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });
});
