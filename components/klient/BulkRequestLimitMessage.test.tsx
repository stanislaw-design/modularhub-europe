import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestPanelLoginLink } from "@/lib/panel-login-link-actions";
import { BulkRequestLimitMessage } from "./BulkRequestLimitMessage";

vi.mock("@/lib/panel-login-link-actions", () => ({
  requestPanelLoginLink: vi.fn(),
}));

const mockedRequestPanelLoginLink = vi.mocked(requestPanelLoginLink);

beforeEach(() => {
  mockedRequestPanelLoginLink.mockReset().mockResolvedValue({ ok: true });
});

// Spec 0070 AC-39: komunikat o limicie pokazuje "3 z 3", prowadzi do listy zapytań i daje
// gościowi link logujący z neutralną odpowiedzią.
describe("BulkRequestLimitMessage", () => {
  it("shows three of three and links to the request list in the panel", () => {
    render(<BulkRequestLimitMessage locale="pl" contactEmail="jan@example.com" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Masz już 3 z 3 aktywnych zapytań ModularProjects");
    expect(screen.getByRole("link", { name: "Przejdź do listy zapytań" })).toHaveAttribute("href", "/pl/panel/quotes");
  });

  it("asks for a sign in link for the typed email and then shows the neutral answer", async () => {
    const user = userEvent.setup();
    render(<BulkRequestLimitMessage locale="de" contactEmail="jan@example.com" />);

    await user.click(screen.getByRole("button", { name: "Wyślij mi link logujący" }));

    await waitFor(() => {
      expect(mockedRequestPanelLoginLink).toHaveBeenCalledWith("jan@example.com", "de");
      expect(screen.getByText(/Jeśli ten adres ma aktywne zapytania/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Wyślij mi link logujący" })).not.toBeInTheDocument();
  });

  it("does not offer the link button without an email address", () => {
    render(<BulkRequestLimitMessage locale="pl" contactEmail="  " />);

    expect(screen.getByRole("button", { name: "Wyślij mi link logujący" })).toBeDisabled();
  });
});
