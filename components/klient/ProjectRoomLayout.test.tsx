import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProjectRoomLayout } from "./ProjectRoomLayout";

const baseProps = {
  projectName: "Modulor Family 90",
  coverImageUrl: "/cover.webp",
  roomCount: 3,
  bathroomCount: 1,
};

describe("ProjectRoomLayout", () => {
  it("renders a placeholder when rooms is empty instead of hiding the section", () => {
    render(<ProjectRoomLayout {...baseProps} rooms={[]} />);
    expect(screen.getByRole("heading", { name: "Układ domu" })).toBeInTheDocument();
    expect(
      screen.getByText("Układ pomieszczeń nie został jeszcze przekazany przez producenta."),
    ).toBeInTheDocument();
  });

  it("shows the total area and room count summary alongside the image, with no expand control when everything already fits", () => {
    render(
      <ProjectRoomLayout
        {...baseProps}
        rooms={[
          { name: "Salon", areaM2: 28 },
          { name: "Łazienka", areaM2: 4 },
          { name: "Antresola", floorLevel: "poddasze" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Układ domu" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Modulor Family 90/ })).toBeInTheDocument();
    expect(screen.getByText("32 m²")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("pokoje")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("łazienka")).toBeInTheDocument();
    expect(screen.getByText("Salon")).toBeInTheDocument();
    expect(screen.getByText("Łazienka")).toBeInTheDocument();
    expect(screen.getByText("Antresola")).toBeInTheDocument();
    expect(screen.getByText("poddasze")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pokaż/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens an enlarged view of the floor plan image on click and closes it again", async () => {
    const user = userEvent.setup();
    render(<ProjectRoomLayout {...baseProps} rooms={[{ name: "Salon", areaM2: 28 }]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Powiększ rzut domu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zamknij powiększenie" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("previews only the first four rooms and expands the rest on click, toggling aria-expanded", async () => {
    const user = userEvent.setup();
    const rooms = [
      { name: "Salon", areaM2: 28 },
      { name: "Kuchnia", areaM2: 10 },
      { name: "Łazienka", areaM2: 4 },
      { name: "Sypialnia", areaM2: 12 },
      { name: "Garderoba", areaM2: 6 },
      { name: "Pralnia", areaM2: 5 },
    ];
    render(<ProjectRoomLayout {...baseProps} rooms={rooms} />);

    const toggle = screen.getByRole("button", { name: /Pokaż wszystkie pomieszczenia \(2\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Pokaż mniej/ })).toBe(toggle);
    expect(screen.getByText("Garderoba")).toBeInTheDocument();
    expect(screen.getByText("Pralnia")).toBeInTheDocument();
  });

  it("shows a dash when a room has no area (każde pole niezależnie)", () => {
    render(<ProjectRoomLayout {...baseProps} rooms={[{ name: "Garaż" }]} />);
    expect(screen.getByText("Garaż")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("uses the product_floor_plan document as the image when one exists, instead of the cover photo", () => {
    render(
      <ProjectRoomLayout
        {...baseProps}
        rooms={[{ name: "Salon", areaM2: 28 }]}
        documents={[
          { url: "/floor-plan.jpg", purpose: "product_floor_plan" },
          { url: "/gallery.jpg", purpose: "product_photo" },
        ]}
      />,
    );

    const image = screen.getByRole("img", { name: /Modulor Family 90, rzut kondygnacji/ });
    expect(image).toHaveAttribute("src", expect.stringContaining(encodeURIComponent("/floor-plan.jpg")));
  });

  it("falls back to the cover photo when no floor plan document exists", () => {
    render(<ProjectRoomLayout {...baseProps} rooms={[{ name: "Salon", areaM2: 28 }]} documents={[]} />);
    expect(screen.getByRole("img", { name: /Modulor Family 90, wnętrze domu/ })).toBeInTheDocument();
  });
});
