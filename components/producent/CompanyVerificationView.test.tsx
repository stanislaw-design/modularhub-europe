import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CompanyVerificationView } from "./CompanyVerificationView";

const REALIZACJA_HREF = "/pl/producer/fulfillment?project=prj-karpaty-alpine-104";

beforeEach(() => {
  window.localStorage.clear();
});

describe("CompanyVerificationView", () => {
  it("shows the project name in the heading, the mock disclaimer, and the required documents", () => {
    render(
      <CompanyVerificationView
        projectId="prj-karpaty-alpine-104"
        projectName="Karpaty Alpine 104"
        realizacjaHref={REALIZACJA_HREF}
      />
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Karpaty Alpine 104");
    expect(screen.getByText(/To jest makieta/)).toBeInTheDocument();
    expect(screen.getByText("Odpis z rejestru przedsiębiorców (KRS lub CEIDG)")).toBeInTheDocument();
    expect(screen.getByText("Zaświadczenie o niezaleganiu w ZUS i US")).toBeInTheDocument();
    expect(screen.getByText("Potwierdzenie rachunku bankowego firmy (wyciąg lub przelew weryfikacyjny)")).toBeInTheDocument();
    expect(screen.getByText("Polisa ubezpieczenia OC działalności")).toBeInTheDocument();
  });

  it("keeps 'Wyślij do weryfikacji' disabled until at least one file is chosen", () => {
    render(
      <CompanyVerificationView
        projectId="prj-karpaty-alpine-104"
        projectName="Karpaty Alpine 104"
        realizacjaHref={REALIZACJA_HREF}
      />
    );

    expect(screen.getByRole("button", { name: "Wyślij do weryfikacji" })).toBeDisabled();
  });

  it("enables submit after a file is chosen, then shows the confirmation and persists it via localStorage", async () => {
    const user = userEvent.setup();
    render(
      <CompanyVerificationView
        projectId="prj-karpaty-alpine-104"
        projectName="Karpaty Alpine 104"
        realizacjaHref={REALIZACJA_HREF}
      />
    );

    const file = new File(["content"], "odpis.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const submit = screen.getByRole("button", { name: "Wyślij do weryfikacji" });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(
      screen.getByText(/Dokumenty przesłane do weryfikacji\. Pierwsza wypłata zostanie odblokowana/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć do realizacji" })).toHaveAttribute("href", REALIZACJA_HREF);
    expect(window.localStorage.getItem("producent:weryfikacja-firmy:zlozone")).toBe(
      JSON.stringify(["prj-karpaty-alpine-104"])
    );
  });

  it("shows the confirmation directly, without the upload form, when already submitted for this project", () => {
    window.localStorage.setItem(
      "producent:weryfikacja-firmy:zlozone",
      JSON.stringify(["prj-karpaty-alpine-104"])
    );

    render(
      <CompanyVerificationView
        projectId="prj-karpaty-alpine-104"
        projectName="Karpaty Alpine 104"
        realizacjaHref={REALIZACJA_HREF}
      />
    );

    expect(screen.getByText(/Dokumenty przesłane do weryfikacji/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wyślij do weryfikacji" })).not.toBeInTheDocument();
  });

  it("does not carry a submission over to a different project id", () => {
    window.localStorage.setItem(
      "producent:weryfikacja-firmy:zlozone",
      JSON.stringify(["prj-karpaty-alpine-104"])
    );

    render(
      <CompanyVerificationView
        projectId="prj-other-project"
        projectName="Other Project"
        realizacjaHref="/pl/producer/fulfillment?project=prj-other-project"
      />
    );

    expect(screen.getByRole("button", { name: "Wyślij do weryfikacji" })).toBeInTheDocument();
    expect(screen.queryByText(/Dokumenty przesłane do weryfikacji/)).not.toBeInTheDocument();
  });
});
