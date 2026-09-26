import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { PlotAnalysisRow } from "./PlotAnalysisRow";
import type { PlotAnalysisRequest } from "./PlotDossierPanel";

function makeProject(id: string, name: string, producerName: string, floorAreaM2: number): Project {
  return createMockProject({ id, producerId: "prod-1", producerName, name, floorAreaM2, priceMin: 100000 });
}

// Known fixture rows (lib/data/fixtures/plot-analysis.ts): pick one of each status.
const approvedProject = makeProject("prj-budman-familia-90", "Budman Familia 90", "Budman House", 90);
const conditionalProject = makeProject("prj-steelhouse-loft-120", "Steel House Loft 120", "Steel House", 120);
const blockedProject = makeProject("prj-steelhouse-alpine-104", "Steel House Alpine 104", "Steel House", 104);
const projectWithNoFixtureRow = makeProject("prj-unknown-999", "Nieznany Dom", "Nieznany Producent", 70);

function initialRequest(): PlotAnalysisRequest {
  return { plotAreaM2: null, phase: "idle", paidAddress: null, paidAt: null };
}

function Harness({ project, initialAddress = "" }: { project: Project; initialAddress?: string }) {
  const [address, setAddress] = useState(initialAddress);
  const [request, setRequest] = useState<PlotAnalysisRequest>(initialRequest());

  return (
    <div>
      <button type="button" onClick={() => setAddress("Zmieniony adres 99")}>
        change address
      </button>
      <PlotAnalysisRow
        locale="pl"
        project={project}
        address={address}
        request={request}
        onChangeRequest={(patch) => setRequest((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  );
}

async function expandAndFillArea(user: ReturnType<typeof userEvent.setup>, area: string) {
  await user.click(screen.getByRole("button", { name: /Budman Familia 90|Steel House Loft 120|Steel House Alpine 104|Nieznany Dom/ }));
  await user.type(screen.getByLabelText(/metraż działki/i), area);
}

describe("PlotAnalysisRow", () => {
  it("is collapsed by default and shows the project name, producer and floor area on the trigger", () => {
    render(<Harness project={approvedProject} />);

    const trigger = screen.getByRole("button", { name: /Budman Familia 90/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/Budman House.*90 m²/)).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("expanding shows the scope description and the formatted price, with Zapłać disabled while the address is empty (AC-3)", async () => {
    const user = userEvent.setup();
    render(<Harness project={approvedProject} initialAddress="" />);

    await user.click(screen.getByRole("button", { name: /Budman Familia 90/ }));

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByText(/Sprawdzamy, czy obrys tego domu/)).toBeInTheDocument();
    expect(screen.getByText("149 €")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();
  });

  it("keeps Zapłać disabled when the area is outside 100–100000 even with an address present (AC-3)", async () => {
    const user = userEvent.setup();
    render(<Harness project={approvedProject} initialAddress="Ul. Polna 5" />);

    await user.click(screen.getByRole("button", { name: /Budman Familia 90/ }));
    const areaInput = screen.getByLabelText(/metraż działki/i);

    await user.type(areaInput, "50");
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();

    await user.clear(areaInput);
    await user.type(areaInput, "150000");
    expect(screen.getByRole("button", { name: "Zapłać" })).toBeDisabled();

    await user.tab();
    expect(screen.getByText(/Podaj metraż w zakresie 100–100000 m²/)).toBeInTheDocument();
  });

  it("enables Zapłać once the address is present and the area is within 100–100000 (AC-3)", async () => {
    const user = userEvent.setup();
    render(<Harness project={approvedProject} initialAddress="Ul. Polna 5" />);

    await user.click(screen.getByRole("button", { name: /Budman Familia 90/ }));
    await user.type(screen.getByLabelText(/metraż działki/i), "250");

    expect(screen.getByRole("button", { name: "Zapłać" })).toBeEnabled();
  });

  it(
    "Zapłać moves to a processing state then automatically shows the approved result with the legal disclaimer and an offer link (AC-4, AC-5, AC-6)",
    async () => {
      const user = userEvent.setup();
      render(<Harness project={approvedProject} initialAddress="Ul. Polna 5" />);

      await user.click(screen.getByRole("button", { name: /Budman Familia 90/ }));
      await user.type(screen.getByLabelText(/metraż działki/i), "250");
      await user.click(screen.getByRole("button", { name: "Zapłać" }));

      expect(screen.getByText("Przetwarzanie płatności…")).toBeInTheDocument();

      await screen.findByText("Dopuszczone", {}, { timeout: 3000 });
      expect(screen.getByText(/obrysie budynku/)).toBeInTheDocument();
      expect(
        screen.getByText(/To nie jest opinia prawna\. Wynik to szacunkowa ocena/)
      ).toBeInTheDocument();

      const offerLink = screen.getByRole("link", { name: "Przejdź do zapytań" });
      expect(offerLink).toHaveAttribute("href", "/pl/panel/inquiries");
    },
    5000
  );

  it(
    "keeps pointing to the inquiries panel even after the panel's address field changes later (AC-4, AC-6)",
    async () => {
      const user = userEvent.setup();
      render(<Harness project={approvedProject} initialAddress="Ul. Polna 5" />);

      await user.click(screen.getByRole("button", { name: /Budman Familia 90/ }));
      await user.type(screen.getByLabelText(/metraż działki/i), "250");
      await user.click(screen.getByRole("button", { name: "Zapłać" }));
      await screen.findByText("Dopuszczone", {}, { timeout: 3000 });

      await user.click(screen.getByRole("button", { name: "change address" }));

      const offerLink = screen.getByRole("link", { name: "Przejdź do zapytań" });
      expect(offerLink).toHaveAttribute("href", "/pl/panel/inquiries");
    },
    5000
  );

  it(
    "shows the conditional result and reason from the fixture (AC-5)",
    async () => {
      const user = userEvent.setup();
      render(<Harness project={conditionalProject} initialAddress="Ul. Polna 5" />);

      await expandAndFillArea(user, "300");
      await user.click(screen.getByRole("button", { name: "Zapłać" }));

      await screen.findByText("Warunkowo dopuszczone", {}, { timeout: 3000 });
      expect(screen.getByText(/operat geotechniczny/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Przejdź do zapytań" })).toBeInTheDocument();
    },
    5000
  );

  it(
    "hides the offer link for a blocked result and still shows the status and reason (AC-7)",
    async () => {
      const user = userEvent.setup();
      render(<Harness project={blockedProject} initialAddress="Ul. Polna 5" />);

      await expandAndFillArea(user, "300");
      await user.click(screen.getByRole("button", { name: "Zapłać" }));

      await screen.findByText("Niedopuszczone", {}, { timeout: 3000 });
      expect(screen.getByText(/obciążenie śniegiem/)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Przejdź do zapytań" })).not.toBeInTheDocument();
    },
    5000
  );

  it(
    "falls back to a generic blocked result, without throwing, when the project has no matching fixture row (spec 0006 API surface table)",
    async () => {
      const user = userEvent.setup();
      render(<Harness project={projectWithNoFixtureRow} initialAddress="Ul. Polna 5" />);

      await expandAndFillArea(user, "300");
      await user.click(screen.getByRole("button", { name: "Zapłać" }));

      await screen.findByText("Niedopuszczone", {}, { timeout: 3000 });
      expect(screen.getByText(/Brak danych analizy dla tego projektu/)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Przejdź do zapytań" })).not.toBeInTheDocument();
    },
    5000
  );
});
