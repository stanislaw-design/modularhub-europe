import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo";

describe("BrandLogo", () => {
  it("renders the MH house wordmark and keeps it decorative for a labelled parent link", () => {
    render(
      <Link href="/pl" aria-label="ModularHub Europe">
        <BrandLogo />
      </Link>
    );

    const link = screen.getByRole("link", { name: "ModularHub Europe" });
    expect(link).toBeInTheDocument();
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "Modular Hub EuropeBuild a brighter tomorrow together"
    );
  });

  it("switches the structural mark and wordmark to the light treatment without changing the orange accents", () => {
    const { container } = render(<BrandLogo tone="light" />);

    expect(container.firstElementChild).toHaveClass("text-brand-v4-surface");
    expect(container.querySelectorAll('path[fill="var(--brand-orange)"]')).toHaveLength(2);
  });
});
