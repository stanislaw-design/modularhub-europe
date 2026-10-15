import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishSummary } from "@/lib/large-order-admin-actions";
import { PublishSummaryControl } from "./PublishSummaryControl";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/large-order-admin-actions", () => ({ publishSummary: vi.fn() }));
const mockedPublish = vi.mocked(publishSummary);

beforeEach(() => {
  mockedPublish.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-14: publikacja wymaga potwierdzenia przeglądu PDF i tekstów.
describe("PublishSummaryControl", () => {
  it("keeps the button disabled until the review is confirmed", async () => {
    const user = userEvent.setup();
    render(<PublishSummaryControl id="req-1" kind="request" pendingCount={2} alreadyPublished={false} />);

    const button = screen.getByRole("button", { name: "Opublikuj podsumowanie" });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
  });

  it("publishes with the confirmation and refreshes on success", async () => {
    const user = userEvent.setup();
    mockedPublish.mockResolvedValue({ ok: true });
    render(<PublishSummaryControl id="req-1" kind="product" pendingCount={1} alreadyPublished />);

    expect(screen.getByRole("heading", { name: "Opublikuj ponownie" })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Opublikuj podsumowanie" }));

    await waitFor(() => expect(mockedPublish).toHaveBeenCalledWith("req-1", "product", true));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("shows the server error and does not refresh", async () => {
    const user = userEvent.setup();
    mockedPublish.mockResolvedValue({ ok: false, error: "Zapytanie jest zamknięte." });
    render(<PublishSummaryControl id="req-1" kind="request" pendingCount={1} alreadyPublished={false} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Opublikuj podsumowanie" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Zapytanie jest zamknięte.");
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
