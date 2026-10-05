import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProductComplianceAssessment } from "@/lib/data/types";
import { ProjectComplianceAssessments } from "./ProjectComplianceAssessments";

const confirmedAssessment: ProductComplianceAssessment = {
  countryCode: "NL",
  rule: "bbl",
  status: "conditional",
  reason: "Wymagany dodatkowy dokument wentylacji.",
  confirmed: true,
  confirmedAt: new Date("2026-09-20T10:00:00Z"),
};
const declaredAssessment: ProductComplianceAssessment = {
  countryCode: "DE",
  rule: "bbl",
  status: "approved",
  reason: "Zgodny według deklaracji.",
  confirmed: false,
  confirmedAt: null,
};

describe("ProjectComplianceAssessments", () => {
  it("renders nothing when there are no assessments (spec 0065 AC-6)", async () => {
    const { container } = render(await ProjectComplianceAssessments({ assessments: [], locale: "pl" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows country, rule, status as text, reason, and the confirmation state (spec 0065 AC-6, AC-14)", async () => {
    render(await ProjectComplianceAssessments({ assessments: [confirmedAssessment], locale: "pl" }));

    expect(screen.getByRole("heading", { name: "Ocena zgodności projektu z przepisami" })).toBeInTheDocument();
    expect(screen.getByText("Holandia · BBL")).toBeInTheDocument();
    expect(screen.getByText("Wymaga dodatkowych dokumentów")).toBeInTheDocument();
    expect(screen.getByText("Wymagany dodatkowy dokument wentylacji.")).toBeInTheDocument();
    expect(screen.getByText(/Potwierdzone przez platformę/)).toBeInTheDocument();
  });

  it("labels an unconfirmed assessment as not confirmed by the platform", async () => {
    render(await ProjectComplianceAssessments({ assessments: [declaredAssessment], locale: "pl" }));

    expect(screen.getByText("Niepotwierdzone przez platformę")).toBeInTheDocument();
    expect(screen.queryByText(/Potwierdzone przez platformę/)).not.toBeInTheDocument();
  });

  it("shows the Compliance Engine disclaimer (spec 0065 AC-6)", async () => {
    render(await ProjectComplianceAssessments({ assessments: [declaredAssessment], locale: "pl" }));

    expect(screen.getByText(/nie stanowi porady prawnej/)).toBeInTheDocument();
  });
});
