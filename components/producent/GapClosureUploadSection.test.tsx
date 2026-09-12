import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GapClosureUploadSection } from "./GapClosureUploadSection";

const MAP_HREF = "/pl/producer/export-readiness";

describe("GapClosureUploadSection", () => {
  it("shows the file picker and a disabled 'Wyślij' button with zero files (AC-4)", () => {
    render(<GapClosureUploadSection mapHref={MAP_HREF} />);

    expect(screen.getByRole("button", { name: "Wyślij" })).toBeDisabled();
  });

  it("enables 'Wyślij' once at least one file is selected, then confirms and links back (AC-4, AC-5)", async () => {
    const user = userEvent.setup();
    render(<GapClosureUploadSection mapHref={MAP_HREF} />);

    const file = new File(["content"], "dop.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const submit = screen.getByRole("button", { name: "Wyślij" });
    expect(submit).toBeEnabled();

    await user.click(submit);

    expect(screen.getByText("Dokumenty przesłane do weryfikacji.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wróć do mapy/ })).toHaveAttribute("href", MAP_HREF);
  });
});
