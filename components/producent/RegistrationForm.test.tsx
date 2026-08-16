import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { RegistrationForm } from "./RegistrationForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockClear();
});

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nip/i), "1234567890");
  await user.click(screen.getByRole("checkbox", { name: "Polska" }));
  await user.click(screen.getByRole("button", { name: "Wybierz technologię" }));
  await user.click(screen.getByRole("option", { name: "Szkielet drewniany" }));
}

describe("RegistrationForm", () => {
  it("renders the NIP field, one checkbox per country, and the technology field, all required", () => {
    render(<RegistrationForm locale="pl" countries={countries} />);

    expect(screen.getByLabelText(/nip/i)).toBeRequired();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: "Polska" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Niemcy" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Holandia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz technologię" })).toBeInTheDocument();
  });

  it("renders the visible 'Technologia' label alongside the select button", () => {
    render(<RegistrationForm locale="pl" countries={countries} />);

    expect(screen.getByText("Technologia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz technologię" })).toBeInTheDocument();
  });

  it("keeps the submit button disabled until NIP, at least one country, and a technology are all set", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    const submit = screen.getByRole("button", { name: "Zarejestruj się" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/nip/i), "1234567890");
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Polska" }));
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Wybierz technologię" }));
    await user.click(screen.getByRole("option", { name: "Szkielet drewniany" }));
    expect(submit).toBeEnabled();
  });

  it("keeps the submit button disabled while the NIP is present but not 10 digits", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    await user.type(screen.getByLabelText(/nip/i), "123");
    await user.click(screen.getByRole("checkbox", { name: "Polska" }));
    await user.click(screen.getByRole("button", { name: "Wybierz technologię" }));
    await user.click(screen.getByRole("option", { name: "Szkielet drewniany" }));

    expect(screen.getByRole("button", { name: "Zarejestruj się" })).toBeDisabled();
  });

  it("shows an inline NIP format error only after the field is blurred", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    const nip = screen.getByLabelText(/nip/i);
    await user.type(nip, "123");
    expect(screen.queryByText(/podaj prawidłowy nip/i)).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByText(/podaj prawidłowy nip/i)).toBeInTheDocument();
    expect(nip).toHaveAttribute("aria-describedby", "registration-nip-error");
  });

  it("toggling a country checkbox on and back off leaves it unselected", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    const checkbox = screen.getByRole("checkbox", { name: "Polska" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("does not navigate when the button is clicked while invalid", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to /producent/projekt with the normalized NIP, selected countries, and technology on submit", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="pl" countries={countries} />);

    await user.type(screen.getByLabelText(/nip/i), "123-456-78-90");
    await user.click(screen.getByRole("checkbox", { name: "Polska" }));
    await user.click(screen.getByRole("checkbox", { name: "Niemcy" }));
    await user.click(screen.getByRole("button", { name: "Wybierz technologię" }));
    await user.click(screen.getByRole("option", { name: "Szkielet drewniany" }));
    await user.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    expect(push).toHaveBeenCalledWith(
      "/pl/producent/projekt?nip=1234567890&countries=PL%2CDE&technology=szkielet-drewniany"
    );
  });

  it("uses the given locale when building the redirect URL", async () => {
    const user = userEvent.setup();
    render(<RegistrationForm locale="de" countries={countries} />);
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/de\/producent\/projekt\?/));
  });

  it("gives every interactive element the visible focus-ring class", () => {
    render(<RegistrationForm locale="pl" countries={countries} />);

    expect(screen.getByLabelText(/nip/i)).toHaveClass("focus-ring");
    expect(screen.getByRole("checkbox", { name: "Polska" })).toHaveClass("focus-ring");
    expect(screen.getByRole("button", { name: "Wybierz technologię" })).toHaveClass("focus-ring");
  });
});
