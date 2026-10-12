import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompareSelectionBar } from "./CompareSelectionBar";

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

afterEach(() => push.mockClear());

describe("CompareSelectionBar", () => {
  it("builds the dom URL without kind, as before spec 0068 (AC-13)", async () => {
    const user = userEvent.setup();
    render(<CompareSelectionBar locale="pl" selectedIds={["a", "b"]} maxSelected={3} onClear={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Porównaj domy" }));

    expect(push).toHaveBeenCalledWith("/pl/compare?products=a%2Cb");
  });

  it("adds kind=sauna and the sauna label for saunas (AC-12)", async () => {
    const user = userEvent.setup();
    render(<CompareSelectionBar locale="pl" selectedIds={["a", "b"]} maxSelected={3} kind="sauna" onClear={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Porównaj sauny" }));

    expect(push).toHaveBeenCalledWith("/pl/compare?products=a%2Cb&kind=sauna");
  });

  it("disables the sauna CTA until two saunas are selected (AC-12)", () => {
    render(<CompareSelectionBar locale="pl" selectedIds={["a"]} maxSelected={3} kind="sauna" onClear={() => {}} />);

    expect(screen.getByRole("button", { name: "Porównaj sauny" })).toBeDisabled();
    expect(screen.getByText("Wybierz jeszcze co najmniej jedną saunę")).toBeInTheDocument();
  });
});
