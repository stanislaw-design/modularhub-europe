import { describe, expect, it } from "vitest";
import { fulfillmentOrders } from "./fixtures/fulfillment";
import { getFulfillmentOrder, getFulfillmentOrders } from "./fulfillment";

const STAGE_ORDER = ["produkcja", "transport", "montaz", "odbior", "gwarancja"] as const;

describe("getFulfillmentOrder", () => {
  it("returns the fixture order for a known project id", async () => {
    const order = await getFulfillmentOrder("prj-modulor-family-90");
    expect(order?.currentStage).toBe("montaz");
    expect(order?.stages).toHaveLength(5);
  });

  it("returns null for a known project with no accepted-offer order yet, not an error (AC-2)", async () => {
    expect(await getFulfillmentOrder("prj-baltyk-studio-38")).toBeNull();
  });

  it("returns null for an unknown project id, not an error", async () => {
    expect(await getFulfillmentOrder("does-not-exist")).toBeNull();
  });
});

describe("getFulfillmentOrders (feature 16, producer-facing list)", () => {
  it("returns every order in the fixture, not scoped to a single producer", async () => {
    const orders = await getFulfillmentOrders();

    expect(orders).toEqual(fulfillmentOrders);
    expect(orders).toHaveLength(fulfillmentOrders.length);
  });

  it("includes orders at different stages, both in progress and delivered", async () => {
    const orders = await getFulfillmentOrders();

    expect(orders.some((order) => order.currentStage === "produkcja")).toBe(true);
    expect(orders.some((order) => order.currentStage === "montaz")).toBe(true);
    expect(orders.some((order) => order.currentStage === "gwarancja")).toBe(true);
  });
});

describe("fulfillmentOrders fixture invariants (spec 0007 Key invariants)", () => {
  it.each(fulfillmentOrders)("$projectId has exactly 5 stages in the fixed sequence", (order) => {
    expect(order.stages.map((stage) => stage.name)).toEqual(STAGE_ORDER);
  });

  it.each(fulfillmentOrders)(
    "$projectId: stages up to and including currentStage have a reachedAt date; later stages have neither a date nor documents",
    (order) => {
      const currentIndex = STAGE_ORDER.indexOf(order.currentStage);
      order.stages.forEach((stage) => {
        const stageIndex = STAGE_ORDER.indexOf(stage.name);
        if (stageIndex <= currentIndex) {
          expect(stage.reachedAt).not.toBeNull();
        } else {
          expect(stage.reachedAt).toBeNull();
          expect(stage.documents).toHaveLength(0);
        }
      });
    }
  );

  it("includes at least one order already on the final stage (gwarancja), for the completion-banner scenario (AC-7)", () => {
    expect(fulfillmentOrders.some((order) => order.currentStage === "gwarancja")).toBe(true);
  });

  it("includes at least one project id with no matching order, for the AC-2 redirect scenario", () => {
    const withOrder = new Set(fulfillmentOrders.map((order) => order.projectId));
    expect(withOrder.has("prj-baltyk-studio-38")).toBe(false);
  });
});
