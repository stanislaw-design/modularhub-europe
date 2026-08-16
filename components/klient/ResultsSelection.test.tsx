import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/data/types";
import { type ResultItem, ResultsSelection } from "./ResultsSelection";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockClear();
});

function makeProject(id: string, name: string): Project {
  return {
    id,
    producerId: "prod-1",
    producerName: "Producent",
    name,
    countryOfProduction: "PL",
    floorAreaM2: 80,
    bedrooms: 3,
    priceMin: 100000,
    priceMax: 120000,
    currency: "EUR",
    coverImageUrl: "https://picsum.photos/seed/x/960/640",
    description: "",
    wallBuildUp: "",
    insulation: "",
    heatTransferCoefficients: "",
    windowClass: "",
    ventilation: "",
    heatSource: "",
    fireResistance: "",
    windResistance: "",
    featured: false,
  };
}

const items: ResultItem[] = [
  { project: makeProject("id1", "Dom Jeden") },
  { project: makeProject("id2", "Dom Dwa") },
  { project: makeProject("id3", "Dom Trzy") },
  { project: makeProject("id4", "Dom Cztery") },
].map((item) => ({ ...item, countryName: "Polska" }));

describe("ResultsSelection", () => {
  it("shows no action bar and no checked boxes when nothing is selected (AC-2)", () => {
    render(<ResultsSelection items={items} locale="pl" />);
    expect(screen.queryByText(/Zaznaczono:/)).not.toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it("shows a pinned action bar with the count once at least 1 project is selected, and does not navigate on toggle (AC-1, AC-2)", async () => {
    const user = userEvent.setup();
    render(<ResultsSelection items={items} locale="pl" />);

    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" }));

    expect(screen.getByText("Zaznaczono: 1/3")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("hides the action bar again once the last selection is unchecked (AC-2)", async () => {
    const user = userEvent.setup();
    render(<ResultsSelection items={items} locale="pl" />);
    const checkbox = screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" });

    await user.click(checkbox);
    expect(screen.getByText("Zaznaczono: 1/3")).toBeInTheDocument();

    await user.click(checkbox);
    expect(screen.queryByText(/Zaznaczono:/)).not.toBeInTheDocument();
  });

  it("disables the remaining unselected checkboxes once 3 are selected, and unblocks them when one is deselected (AC-3)", async () => {
    const user = userEvent.setup();
    render(<ResultsSelection items={items} locale="pl" />);

    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" }));
    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Dwa do zapytania" }));
    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Trzy do zapytania" }));

    expect(screen.getByText("Zaznaczono: 3/3")).toBeInTheDocument();
    const fourthCheckbox = screen.getByRole("checkbox", { name: "Zaznacz Dom Cztery do zapytania" });
    expect(fourthCheckbox).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" }));

    expect(screen.getByText("Zaznaczono: 2/3")).toBeInTheDocument();
    expect(fourthCheckbox).toBeEnabled();
  });

  it("never disables an already selected checkbox at the limit, only the unselected ones (AC-3)", async () => {
    const user = userEvent.setup();
    render(<ResultsSelection items={items} locale="pl" />);

    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" }));
    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Dwa do zapytania" }));
    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Trzy do zapytania" }));

    const firstCheckbox = screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" });
    expect(firstCheckbox).toBeEnabled();
    expect(firstCheckbox).toBeChecked();
  });

  it("navigates with the selected project ids when 'Wyślij zapytanie' is clicked (AC-4)", async () => {
    const user = userEvent.setup();
    render(<ResultsSelection items={items} locale="pl" countryCode="DE" sizeMin={50} sizeMax={100} />);

    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Jeden do zapytania" }));
    await user.click(screen.getByRole("checkbox", { name: "Zaznacz Dom Dwa do zapytania" }));
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie" }));

    expect(push).toHaveBeenCalledWith(
      "/pl/klient/zapytanie?projects=id1%2Cid2&country=DE&sizeMin=50&sizeMax=100"
    );
  });
});
