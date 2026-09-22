import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProjectDocumentsAndFaq } from "./ProjectDocumentsAndFaq";

// Spec 0049 AC-9: la sekcja dokumentów pokazuje placeholder dopóki producent
// nie wgra pliku specyfikacji, potem prawdziwy link do pobrania w jego miejsce.
describe("ProjectDocumentsAndFaq", () => {
  it("shows the documents placeholder when no specification PDF was uploaded", async () => {
    const project = createMockProject({ documents: [] });
    render(await resolveAsyncTree(<ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />));

    expect(screen.getAllByText("Do uzupełnienia").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /specyfikacj/i })).not.toBeInTheDocument();
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
