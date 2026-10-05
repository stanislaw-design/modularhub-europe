import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProducerCertification } from "@/lib/data/types";
import { ProjectCertifications } from "./ProjectCertifications";

const confirmed: ProducerCertification = {
  name: "ISO 9001",
  issuer: "TÜV",
  confirmed: true,
  confirmedAt: new Date("2026-09-20T10:00:00Z"),
};
const declared: ProducerCertification = { name: "CE", issuer: null, confirmed: false, confirmedAt: null };

describe("ProjectCertifications", () => {
  it("renders nothing when certifications is undefined (spec 0020 AC-4)", async () => {
    const { container } = render(await ProjectCertifications({ locale: "pl" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when certifications is an empty array (spec 0020 AC-4)", async () => {
    const { container } = render(await ProjectCertifications({ certifications: [], locale: "pl" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("marks a platform-confirmed certificate with its confirmation date as text (spec 0065 AC-5)", async () => {
    render(await ProjectCertifications({ certifications: [confirmed], locale: "pl" }));

    expect(screen.getByRole("heading", { name: "Certyfikaty" })).toBeInTheDocument();
    expect(screen.getByText(/ISO 9001 · TÜV/)).toBeInTheDocument();
    expect(screen.getByText(/Potwierdzone przez platformę/)).toBeInTheDocument();
  });

  it("marks an unconfirmed certificate as a producer declaration, never as confirmed (spec 0065 AC-5)", async () => {
    render(await ProjectCertifications({ certifications: [declared], locale: "pl" }));

    expect(screen.getByText("Deklaracja producenta, niepotwierdzona")).toBeInTheDocument();
    expect(screen.queryByText(/Potwierdzone przez platformę/)).not.toBeInTheDocument();
  });

  it("renders each certificate as a list item so screen readers announce the group", async () => {
    render(await ProjectCertifications({ certifications: [confirmed, declared], locale: "pl" }));

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
