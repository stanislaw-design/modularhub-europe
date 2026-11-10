import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ComplianceEngineShowcase } from "./ComplianceEngineShowcase";

describe("ComplianceEngineShowcase (spec 0082 AC-12)", () => {
  it("shows no sample verdict and says the preliminary assessment arrives in the summary offer", async () => {
    render(await resolveAsyncTree(<ComplianceEngineShowcase locale="pl" />));

    // Pas nie pokazuje już przykładowej karty z wynikiem (to był AC-4 specu 0073).
    expect(screen.queryByText("Przykład ilustracyjny")).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Wstępna ocena zgodności z przepisami w ofercie podsumowującej",
    );
    expect(screen.getByText(/nie stanowi porady prawnej/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Przeglądaj projekty" })).toHaveAttribute("href", "/pl/results");
  });
});
