import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCertifications } from "./ProjectCertifications";

describe("ProjectCertifications", () => {
  it("renders nothing when certifications is undefined (spec 0020 AC-4)", () => {
    const { container } = render(<ProjectCertifications />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when certifications is an empty array (spec 0020 AC-4)", () => {
    const { container } = render(<ProjectCertifications certifications={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every certification when the list is populated", () => {
    render(<ProjectCertifications certifications={["ISO 9001", "CE", "EN 14509"]} />);

    expect(screen.getByRole("heading", { name: "Certyfikaty" })).toBeInTheDocument();
    expect(screen.getByText("ISO 9001")).toBeInTheDocument();
    expect(screen.getByText("CE")).toBeInTheDocument();
    expect(screen.getByText("EN 14509")).toBeInTheDocument();
  });

  it("renders as a list so certifications are announced as a group to screen readers", () => {
    render(<ProjectCertifications certifications={["ISO 9001"]} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
