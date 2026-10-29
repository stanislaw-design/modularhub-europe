import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ refresh: refreshMock }) };
});

import { CommunicationLocaleForm } from "./CommunicationLocaleForm";

const labels = {
  heading: "Język komunikacji",
  label: "Język maili o zapytaniach i ofertach",
  hint: "Nie zmienia języka panelu.",
  save: "Zapisz zmiany",
  saved: "Zapisano.",
  saveError: "Nie udało się zapisać.",
};

beforeEach(() => {
  refreshMock.mockReset();
});

// Spec 0077 AC-29, AC-33 (testy komponentu, część C).
describe("CommunicationLocaleForm", () => {
  it("keeps the save button disabled until the language differs from the saved one (AC-29)", async () => {
    const user = userEvent.setup();
    render(<CommunicationLocaleForm initialLocale="pl" labels={labels} onSave={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Zapisz zmiany" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Polski/ }));
    await user.click(screen.getByRole("option", { name: "Deutsch" }));

    expect(screen.getByRole("button", { name: "Zapisz zmiany" })).toBeEnabled();
  });

  it("offers exactly the four languages, each named in its own language (AC-29)", async () => {
    const user = userEvent.setup();
    render(<CommunicationLocaleForm initialLocale="pl" labels={labels} onSave={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Polski/ }));

    const names = screen.getAllByRole("option").map((option) => option.textContent);
    expect(names).toEqual(["Polski", "English", "Deutsch", "Nederlands"]);
  });

  it("saves the chosen language, confirms it and refreshes the page (AC-29)", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CommunicationLocaleForm initialLocale="pl" labels={labels} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /Polski/ }));
    await user.click(screen.getByRole("option", { name: "Nederlands" }));
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("nl"));
    expect(await screen.findByRole("status")).toHaveTextContent("Zapisano.");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the server's error as an alert and does not refresh (AC-29)", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: "Brak dostępu." });
    const user = userEvent.setup();
    render(<CommunicationLocaleForm initialLocale="pl" labels={labels} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /Polski/ }));
    await user.click(screen.getByRole("option", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Brak dostępu.");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("falls back to the generic error text when the server gives none (AC-29)", async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<CommunicationLocaleForm initialLocale="de" labels={labels} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: /Deutsch/ }));
    await user.click(screen.getByRole("option", { name: "Polski" }));
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zapisać.");
  });
});
