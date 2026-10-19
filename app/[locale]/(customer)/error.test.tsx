import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import pl from "@/messages/pl.json";
import CustomerError from "./error";

const captureErrorMock = vi.fn();
vi.mock("@/lib/observability/errors", () => ({ captureError: (...args: unknown[]) => captureErrorMock(...args) }));

describe("(customer)/error.tsx (spec 0073 AC-10)", () => {
  it("shows the message from the ErrorPage namespace, reports the error and retries on click", async () => {
    const error = new Error("boom");
    const retry = vi.fn();
    render(
      <NextIntlClientProvider locale="pl" messages={pl}>
        <CustomerError error={error} retry={retry} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: pl.ErrorPage.heading })).toBeInTheDocument();
    expect(captureErrorMock).toHaveBeenCalledWith(error);

    await userEvent.setup().click(screen.getByRole("button", { name: pl.ErrorPage.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: pl.ErrorPage.home })).toHaveAttribute("href", "/pl");
  });
});
