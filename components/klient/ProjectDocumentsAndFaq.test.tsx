import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProjectDocumentsAndFaq } from "./ProjectDocumentsAndFaq";

// Spec 0054 AC-7, AC-8: każdy z dwóch bloków (specyfikacja, FAQ) renderuje
// się niezależnie tylko z prawdziwą treścią; cała sekcja znika, gdy oba puste.
describe("ProjectDocumentsAndFaq", () => {
  it("renders nothing when there is no specification PDF and no FAQ (spec 0054 AC-8)", async () => {
    const project = createMockProject({ documents: [], faq: [] });
    const result = await resolveAsyncTree(<ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />);
    expect(result).toBeNull();
  });

  it("shows only the FAQ block, no documents block or placeholder, when only FAQ is filled (spec 0054 AC-7)", async () => {
    const project = createMockProject({
      documents: [],
      faq: [{ question: "Czy dom jest ocieplony?", answer: "Tak, w standardzie." }],
    });
    render(await resolveAsyncTree(<ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />));

    expect(screen.getByRole("heading", { name: "Pytania i odpowiedzi" })).toBeInTheDocument();
    expect(screen.getByText("Czy dom jest ocieplony?")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dokumenty" })).not.toBeInTheDocument();
    expect(screen.queryByText("Do uzupełnienia")).not.toBeInTheDocument();
  });

  it("shows a real download link once a product_specification document exists", async () => {
    const project = createMockProject({
      documents: [{ url: "https://cdn.example.com/spec.pdf", purpose: "product_specification" }],
    });
    render(await resolveAsyncTree(<ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />));

    const link = screen.getByRole("link", { name: "Pobierz PDF ze specyfikacją" });
    expect(link).toHaveAttribute("href", "https://cdn.example.com/spec.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
