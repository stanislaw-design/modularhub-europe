import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProjectTechnicalSpecs } from "./ProjectTechnicalSpecs";

describe("ProjectTechnicalSpecs", () => {
  it("renders every populated field as a row (spec 0020 AC-1)", async () => {
    const project = createMockProject({
      constructionSystem: "Prefabrykowany szkielet drewniany C24/KVH",
      customizationScope: "Układ okien, kolor elewacji",
    });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.getByText("Prefabrykowany szkielet drewniany C24/KVH")).toBeInTheDocument();
    expect(screen.getByText("Układ okien, kolor elewacji")).toBeInTheDocument();
  });

  // insulation/windowClass/wallBuildUp/fireResistance/windResistance usunięte
  // z tej strony (spec 0049 AC-3); externalDimensions/foundationOptions usunięte
  // (dublowały ProjectLogistics/"Działka i dostawa"); mechanizm "puste pole nie
  // renderuje wiersza" (spec 0020 AC-4) sprawdzany teraz na polach, które zostają.
  it("omits a row whose source field is an empty string, without a placeholder (spec 0020 AC-4)", async () => {
    const project = createMockProject({ roofType: "", customizationScope: "Układ okien" });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.queryByText("Jaki jest kąt nachylenia dachu?")).not.toBeInTheDocument();
    expect(screen.getByText("Co mogę dopasować pod siebie?")).toBeInTheDocument();
    expect(screen.getByText("Układ okien")).toBeInTheDocument();
  });

  it("trims whitespace-only values and treats them as absent", async () => {
    const project = createMockProject({ ventilation: "   " });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.queryByText("Czy latem będzie duszno?")).not.toBeInTheDocument();
  });

  it("translates the raw enum values for energy class, ventilation and heat source instead of printing the catalog key", async () => {
    const project = createMockProject({
      heatTransferCoefficients: "nieznana",
      ventilation: "mechaniczna-nawiewno-wywiewna",
      heatSource: "pompa-ciepla-powietrze-woda",
    });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.queryByText("nieznana")).not.toBeInTheDocument();
    expect(screen.queryByText("mechaniczna-nawiewno-wywiewna")).not.toBeInTheDocument();
    expect(screen.queryByText("pompa-ciepla-powietrze-woda")).not.toBeInTheDocument();
    expect(screen.getByText("Do ustalenia podczas tworzenia projektu")).toBeInTheDocument();
    expect(
      screen.getByText("Ten projekt zawiera wentylację mechaniczną nawiewno-wywiewną."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dom jest ogrzewany za pomocą pompy ciepła powietrze-woda."),
    ).toBeInTheDocument();
  });

  it("translates a non-'nieznana' energy class with its prefix", async () => {
    const project = createMockProject({ heatTransferCoefficients: "A" });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.getByText("Klasa A")).toBeInTheDocument();
  });
});
