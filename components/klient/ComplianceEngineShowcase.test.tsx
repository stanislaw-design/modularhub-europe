import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ComplianceEngineShowcase } from "./ComplianceEngineShowcase";

describe("ComplianceEngineShowcase (spec 0073)", () => {
  it("marks the example card as illustrative, visible and in the accessibility tree (AC-4)", async () => {
    render(await resolveAsyncTree(<ComplianceEngineShowcase locale="pl" />));

    expect(screen.getByText("Przykład ilustracyjny")).toBeVisible();
    expect(screen.getByRole("group", { name: "Przykład ilustracyjny" })).toBeInTheDocument();
  });
});
