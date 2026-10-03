import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProductOptionGroup } from "@/lib/db/queries";
import { ProjectOptionsConfigurator } from "./ProjectOptionsConfigurator";

const INSULATION_GROUP: ProductOptionGroup = {
  id: "g-insulation",
  name: "Poziom ocieplenia",
  selectionType: "single",
  options: [
    { id: "o-standard", label: "Standard", priceCents: 650000, priceOnRequest: false, isDefault: true, imageUrl: null },
    { id: "o-premium", label: "Premium", priceCents: 980000, priceOnRequest: false, isDefault: false, imageUrl: null },
  ],
};
const EXTRAS_GROUP: ProductOptionGroup = {
  id: "g-extras",
  name: "Dodatki",
  selectionType: "multi",
  options: [
    { id: "o-fireplace", label: "Kominek", priceCents: 250000, priceOnRequest: false, isDefault: false, imageUrl: null },
    { id: "o-ac", label: "Klimatyzacja", priceCents: 0, priceOnRequest: true, isDefault: false, imageUrl: null },
    { id: "o-blinds", label: "Rolety", priceCents: 0, priceOnRequest: false, isDefault: false, imageUrl: null },
  ],
};

describe("ProjectOptionsConfigurator (spec 0059)", () => {
  it("renders nothing when the product has no assigned option group (AC-5)", () => {
    const { container } = render(
      <ProjectOptionsConfigurator
        groups={[]}
        selectedOptionIds={[]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single group as a radiogroup with exactly one checked option (AC-2)", () => {
    render(
      <ProjectOptionsConfigurator
        groups={[INSULATION_GROUP]}
        selectedOptionIds={["o-standard"]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const group = within(screen.getByRole("radiogroup", { name: "Poziom ocieplenia" }));
    const standard = group.getByRole("radio", { name: /Standard/ });
    const premium = group.getByRole("radio", { name: /Premium/ });
    expect(standard).toHaveAttribute("aria-checked", "true");
    expect(premium).toHaveAttribute("aria-checked", "false");
    expect(standard).toHaveAttribute("href", "?opcje=g-insulation:o-standard");
  });

  it("renders a multi group as independent checkboxes, none checked by default", () => {
    render(
      <ProjectOptionsConfigurator
        groups={[EXTRAS_GROUP]}
        selectedOptionIds={[]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const group = within(screen.getByRole("group", { name: "Dodatki" }));
    for (const checkbox of group.getAllByRole("checkbox")) {
      expect(checkbox).toHaveAttribute("aria-checked", "false");
    }
  });

  it("shows the price as +X €, 'included' for a free option, or 'on request', never a misleading number", () => {
    render(
      <ProjectOptionsConfigurator
        groups={[EXTRAS_GROUP]}
        selectedOptionIds={[]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const formattedFireplacePrice = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(2500);
    expect(screen.getByRole("checkbox", { name: /Kominek/ })).toHaveTextContent(`+${formattedFireplacePrice} €`);
    expect(screen.getByRole("checkbox", { name: /Klimatyzacja/ })).toHaveTextContent("cena na zapytanie");
    expect(screen.getByRole("checkbox", { name: /Rolety/ })).toHaveTextContent("w cenie");
  });

  it("renders the option's image when set, and a fallback icon (no broken <img>) when it isn't", () => {
    const groupWithImage: ProductOptionGroup = {
      id: "g-panel",
      name: "Panel",
      selectionType: "single",
      options: [
        {
          id: "o-styropian",
          label: "Styropian",
          priceCents: null,
          priceOnRequest: false,
          isDefault: true,
          imageUrl: "https://konfigurator.dampol-investment.com/static/thumbnail/shop-configurator-option/med/168.webp",
        },
        { id: "o-no-image", label: "Bez zdjęcia", priceCents: null, priceOnRequest: false, isDefault: false, imageUrl: null },
      ],
    };
    const { container } = render(
      <ProjectOptionsConfigurator
        groups={[groupWithImage]}
        selectedOptionIds={["o-styropian"]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const styropianCard = screen.getByRole("radio", { name: /Styropian/ });
    const img = styropianCard.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("168.webp");

    const noImageCard = screen.getByRole("radio", { name: /Bez zdjęcia/ });
    expect(noImageCard.querySelector("img")).toBeNull();
    // Fallback: a group-matched lucide icon (svg), not a broken <img src="">.
    expect(noImageCard.querySelector("svg")).not.toBeNull();
    expect(container.querySelector('img[src=""]')).toBeNull();
  });

  it("picks a fitting fallback icon per group name, and a neutral default for an unmatched name", () => {
    const groups: ProductOptionGroup[] = [
      { ...INSULATION_GROUP, options: [{ ...INSULATION_GROUP.options[0], imageUrl: null }] },
      {
        id: "g-ac",
        name: "Klimatyzacja",
        selectionType: "single",
        options: [{ id: "o-none", label: "Brak", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null }],
      },
      {
        id: "g-wc",
        name: "WC",
        selectionType: "single",
        options: [{ id: "o-wc-no", label: "Nie", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null }],
      },
      {
        id: "g-mystery",
        name: "Coś zupełnie nieoczekiwanego",
        selectionType: "single",
        options: [{ id: "o-x", label: "X", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null }],
      },
    ];
    render(
      <ProjectOptionsConfigurator
        groups={groups}
        selectedOptionIds={[]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const insulationRadio = within(screen.getByRole("radiogroup", { name: "Poziom ocieplenia" })).getByRole("radio");
    const acRadio = within(screen.getByRole("radiogroup", { name: "Klimatyzacja" })).getByRole("radio");
    const wcRadio = within(screen.getByRole("radiogroup", { name: "WC" })).getByRole("radio");
    const mysteryRadio = within(
      screen.getByRole("radiogroup", { name: "Coś zupełnie nieoczekiwanego" }),
    ).getByRole("radio");

    expect(insulationRadio.querySelector("svg.lucide-thermometer")).not.toBeNull();
    expect(acRadio.querySelector("svg.lucide-air-vent")).not.toBeNull();
    expect(wcRadio.querySelector("svg.lucide-toilet")).not.toBeNull();
    expect(mysteryRadio.querySelector("svg.lucide-settings-2")).not.toBeNull();
  });

  // A genuinely binary (2 option, no image) "Nie" group now renders compact
  // (see the two tests below) instead of the big icon card, so the
  // strikethrough affordance only still matters for a group that keeps a
  // third, real option alongside "Nie" and therefore stays on the card grid.
  it("strikes through the fallback icon for a literal 'Nie' option sharing its group icon with two real siblings", () => {
    const wcGroup: ProductOptionGroup = {
      id: "g-wc",
      name: "WC",
      selectionType: "single",
      options: [
        { id: "o-wc-no", label: "Nie", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null },
        { id: "o-wc-yes", label: "Tak", priceCents: 125939, priceOnRequest: false, isDefault: false, imageUrl: null },
        {
          id: "o-wc-yes-prysznic",
          label: "Tak, z prysznicem",
          priceCents: 189900,
          priceOnRequest: false,
          isDefault: false,
          imageUrl: null,
        },
      ],
    };
    const acGroup: ProductOptionGroup = {
      id: "g-ac",
      name: "Klimatyzacja",
      selectionType: "single",
      options: [{ id: "o-ac-none", label: "Brak", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null }],
    };
    render(
      <ProjectOptionsConfigurator
        groups={[wcGroup, acGroup]}
        selectedOptionIds={[]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    // Accessible name concatenates the label/price spans with no inserted
    // whitespace (e.g. "Niew cenie"), so these match "Nie"/"Tak" immediately
    // followed by a non-comma character, distinguishing "Tak" from its
    // "Tak, z prysznicem" sibling.
    const noRadio = screen.getByRole("radio", { name: /^Nie[^,]/ });
    const yesRadio = screen.getByRole("radio", { name: /^Tak[^,]/ });
    const noneRadio = screen.getByRole("radio", { name: /Brak/ });
    expect(noRadio.querySelector(".rotate-45")).not.toBeNull();
    expect(yesRadio.querySelector(".rotate-45")).toBeNull();
    expect(noneRadio.querySelector(".rotate-45")).toBeNull();
  });

  // Spec 0061 (engineer feedback, 2026-10-02): a simple two-option, no-image
  // group (e.g. a "Tak"/"Nie" toggle for an add-on like WiFi control) wastes a
  // full row of card height on an empty icon box for binary information that
  // the label text already states plainly — it renders instead as a compact,
  // side-by-side pair in one row.
  it("renders a 2-option, no-image group as a compact side-by-side toggle, not the big icon card grid", () => {
    const wifiGroup: ProductOptionGroup = {
      id: "g-wifi",
      name: "Sterowanie WiFi",
      selectionType: "single",
      options: [
        { id: "o-wifi-no", label: "Bez sterowania WiFi", priceCents: 0, priceOnRequest: false, isDefault: true, imageUrl: null },
        { id: "o-wifi-yes", label: "Ze sterowaniem WiFi", priceCents: null, priceOnRequest: true, isDefault: false, imageUrl: null },
      ],
    };
    render(
      <ProjectOptionsConfigurator
        groups={[wifiGroup]}
        selectedOptionIds={["o-wifi-no"]}
        hrefFor={(groupId, optionId) => `?opcje=${groupId}:${optionId}`}
        heading="Opcje dodatkowe"
        ariaLabel="Opcje dodatkowe"
        includedLabel="w cenie"
        priceOnRequestLabel="cena na zapytanie"
      />,
    );

    const noRadio = screen.getByRole("radio", { name: /Bez sterowania WiFi/ });
    const yesRadio = screen.getByRole("radio", { name: /Ze sterowaniem WiFi/ });
    expect(noRadio).toHaveAttribute("aria-checked", "true");
    expect(yesRadio).toHaveAttribute("aria-checked", "false");
    // No image, no fallback group icon box, no big aspect-ratio image slot:
    // the compact layout drops the icon slot entirely instead of reusing the
    // big card's empty-icon-plus-strikethrough workaround. The lucide Check
    // mark on the selected option is still a legitimate svg, so this checks
    // specifically for the big card's image/icon box, not "no svg at all".
    expect(noRadio.querySelector(".aspect-\\[4\\/3\\]")).toBeNull();
    expect(noRadio.querySelector(".rotate-45")).toBeNull();
    expect(noRadio).toHaveTextContent("w cenie");
    expect(yesRadio).toHaveTextContent("cena na zapytanie");
  });
});
