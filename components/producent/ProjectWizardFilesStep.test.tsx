import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";

// ProducerProductPhotosStep/ProducerFloorPlanUploadStep both pull in
// lib/product-photo-actions.ts -> @/auth -> next-auth's ESM build, which
// drags in a dependency chain that jsdom/vitest can't resolve (unrelated to
// anything this file tests: it only checks which of the two real upload
// components renders based on productId, never their internal upload logic).
vi.mock("./ProducerProductPhotosStep", () => ({
  ProducerProductPhotosStep: () => <div>photos-step</div>,
}));
vi.mock("./ProducerFloorPlanUploadStep", () => ({
  ProducerFloorPlanUploadStep: () => <div>floor-plan-step</div>,
}));

describe("ProjectWizardFilesStep", () => {
  it("shows a placeholder instead of either real uploader when no productId exists yet", () => {
    render(
      <ProjectWizardFilesStep
        showValidation={false}
        productId={null}
        photos={[]}
        onPhotosChange={vi.fn()}
        floorPlans={[]}
        onFloorPlansChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("photos-step")).not.toBeInTheDocument();
    expect(screen.queryByText("floor-plan-step")).not.toBeInTheDocument();
    expect(screen.getAllByText(/zapisz najpierw podstawowe informacje/i)).toHaveLength(2);
  });

  it("renders both real upload components once a productId exists (spec 0045 AC-7)", () => {
    render(
      <ProjectWizardFilesStep
        showValidation={false}
        productId="product-1"
        photos={[]}
        onPhotosChange={vi.fn()}
        floorPlans={[]}
        onFloorPlansChange={vi.fn()}
      />,
    );

    expect(screen.getByText("photos-step")).toBeInTheDocument();
    expect(screen.getByText("floor-plan-step")).toBeInTheDocument();
  });
});
