import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ refresh: refreshMock }) };
});

const updateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/producer-company-actions", () => ({
  updateProducerCompany: (...args: unknown[]) => updateMock(...args),
}));

import { ProducerCompanyForm } from "./ProducerCompanyForm";

beforeEach(() => {
  refreshMock.mockReset();
  updateMock.mockReset();
});

// Spec 0074 AC-11.
describe("ProducerCompanyForm", () => {
  it("sends the edited name with the current technology and confirms the save", async () => {
    updateMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ProducerCompanyForm initialName="Stara Nazwa" initialTechnology="szkielet-drewniany" />);

    const input = screen.getByLabelText(/Nazwa firmy/);
    await user.clear(input);
    await user.type(input, "Nowa Nazwa");
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ name: "Nowa Nazwa", technology: "szkielet-drewniany" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Zapisano.");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the server's field error under the name and keeps the form editable", async () => {
    updateMock.mockResolvedValue({ ok: false, fieldErrors: { name: "Nazwa firmy musi mieć co najmniej 2 znaki." } });
    const user = userEvent.setup();
    render(<ProducerCompanyForm initialName="X" initialTechnology={null} />);

    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nazwa firmy musi mieć co najmniej 2 znaki.");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nazwa firmy/)).toHaveAttribute("aria-invalid", "true");
  });
});
