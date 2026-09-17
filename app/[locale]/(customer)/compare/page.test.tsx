import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";

class RedirectSignal extends Error {}
const redirectMock = vi.fn((url: string) => {
  throw new RedirectSignal(url);
});
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, redirect: (url: string) => redirectMock(url) };
});

const getProjectByIdMock = vi.fn();
const getPublishedProductIdsMock = vi.fn();
vi.mock("@/lib/data/projects", () => ({
  getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
  getPublishedProductIds: (...args: unknown[]) => getPublishedProductIdsMock(...args),
}));

import ComparePage from "./page";

async function renderPage(searchParams: Record<string, string>, locale = "pl") {
  const element = await ComparePage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  });
  render(await resolveAsyncTree(element));
}

beforeEach(() => {
  redirectMock.mockClear();
  getProjectByIdMock.mockReset();
  getPublishedProductIdsMock.mockReset().mockResolvedValue(new Set(["a", "b"]));
});

describe("ComparePage", () => {
  it("redirects to /results when the products param is missing or malformed (spec 0044 AC-5)", async () => {
    await expect(renderPage({})).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/results");
  });

  it("redirects to /results when only one id is given (needs at least 2, spec 0044 AC-5)", async () => {
    await expect(renderPage({ products: "a" })).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/results");
  });

  it("renders both columns for two published dom-family products (spec 0044 AC-6)", async () => {
    getProjectByIdMock.mockImplementation((id: string) =>
      Promise.resolve(createMockProject({ id, name: id === "a" ? "Dom A" : "Dom B" }))
    );

    await renderPage({ products: "a,b" });

    expect(screen.getByRole("heading", { level: 1, name: "Porównanie domów" })).toBeInTheDocument();
    expect(screen.getByText("Dom A")).toBeInTheDocument();
    expect(screen.getByText("Dom B")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("shows an unavailable column and notice for an unpublished id, keeping the available one (spec 0044 AC-10)", async () => {
    getPublishedProductIdsMock.mockResolvedValue(new Set(["a"]));
    getProjectByIdMock.mockImplementation((id: string) =>
      Promise.resolve(createMockProject({ id, name: id === "a" ? "Dom A" : "Dom B" }))
    );

    await renderPage({ products: "a,b" });

    expect(screen.getByText("Dom A")).toBeInTheDocument();
    expect(screen.queryByText("Dom B")).not.toBeInTheDocument();
    expect(screen.getByText("Niedostępny")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć do wyników" })).toHaveAttribute("href", "/pl/results");
  });

  it("shows an unavailable column when getProjectById returns null (removed product, spec 0044 AC-10)", async () => {
    getProjectByIdMock.mockImplementation((id: string) =>
      Promise.resolve(id === "a" ? createMockProject({ id, name: "Dom A" }) : null)
    );

    await renderPage({ products: "a,b" });

    expect(screen.getByText("Dom A")).toBeInTheDocument();
    expect(screen.getByText("Niedostępny")).toBeInTheDocument();
  });

  it("redirects to /results when every selected id is unavailable", async () => {
    getPublishedProductIdsMock.mockResolvedValue(new Set());
    getProjectByIdMock.mockResolvedValue(null);

    await expect(renderPage({ products: "a,b" })).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/pl/results");
  });

  it("excludes a product outside the dom family, treating it as unavailable (spec 0044 scope)", async () => {
    getProjectByIdMock.mockImplementation((id: string) =>
      Promise.resolve(
        createMockProject({ id, name: id === "a" ? "Dom A" : "Spa B", family: id === "a" ? "dom" : "spa-modulowe" })
      )
    );

    await renderPage({ products: "a,b" });

    expect(screen.getByText("Dom A")).toBeInTheDocument();
    expect(screen.queryByText("Spa B")).not.toBeInTheDocument();
  });
});
