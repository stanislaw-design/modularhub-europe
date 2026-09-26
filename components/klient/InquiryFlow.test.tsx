import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitAdvisoryInquiry } from "@/lib/case-actions";
import type { Country, Project } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { InquiryFlow } from "./InquiryFlow";

vi.mock("@/lib/case-actions", () => ({
  submitAdvisoryInquiry: vi.fn(),
}));

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

const mockedSubmit = vi.mocked(submitAdvisoryInquiry);

function makeProject(id: string, name: string): Project {
  return createMockProject({ id, producerId: "prod-1", producerName: "Producent", name, floorAreaM2: 80, priceMin: 100000 });
}

const twoProjects = [makeProject("id1", "Dom Jeden"), makeProject("id2", "Dom Dwa")];
const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

function renderFlow(initialCountryCode: "PL" | "DE" | null = null) {
  render(
    <InquiryFlow projects={twoProjects} resultsHref="/pl/results" countries={countries} initialCountryCode={initialCountryCode} />,
  );
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/ulica i numer/i), "Leśna 5");
  await user.type(screen.getByLabelText(/kod pocztowy/i), "30-001");
  await user.type(screen.getByLabelText(/miejscowość/i), "Kraków");
}

beforeEach(() => {
  mockedSubmit.mockReset();
  push.mockReset();
});

describe("InquiryFlow (spec 0048 AC-1, AC-2)", () => {
  it("renders one H1 with the ModularHub call to action and explains the request goes to ModularHub first (AC-1)", () => {
    renderFlow();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Poproś ModularHub o przygotowanie ofert");
    expect(screen.getByText(/nie od razu do producentów/i)).toBeInTheDocument();
  });

  it("lists the selected homes read only and has no budget, deadline or services fields (AC-2)", () => {
    renderFlow();

    expect(screen.getByText("Dom Jeden")).toBeInTheDocument();
    expect(screen.getByText("Dom Dwa")).toBeInTheDocument();
    expect(screen.queryByLabelText(/budżet/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/termin/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/usług/i)).not.toBeInTheDocument();
  });

  it("requires the full plot address and a country, the free text stays optional (AC-2)", async () => {
    const user = userEvent.setup();
    renderFlow();

    const submit = screen.getByRole("button", { name: "Wyślij zapytanie do ModularHub" });
    expect(screen.getByLabelText(/ulica i numer/i)).toBeRequired();
    expect(screen.getByLabelText(/kod pocztowy/i)).toBeRequired();
    expect(screen.getByLabelText(/miejscowość/i)).toBeRequired();
    expect(screen.getByLabelText(/własnymi słowami/i)).not.toBeRequired();
    expect(submit).toBeDisabled();

    await fillAddress(user);
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Wybierz…" }));
    await user.click(screen.getByRole("option", { name: "Polska" }));
    expect(submit).toBeEnabled();
  });

  it("submits the homes, the address and the idempotency key, then opens the case page (AC-3)", async () => {
    mockedSubmit.mockResolvedValue({ ok: true, inquiryId: "inq-1" });
    const user = userEvent.setup();
    renderFlow("PL");

    await fillAddress(user);
    await user.type(screen.getByLabelText(/własnymi słowami/i), "Szukam domu na jesień");
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie do ModularHub" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/pl/panel/inquiries/inq-1"));
    expect(mockedSubmit).toHaveBeenCalledTimes(1);
    const input = mockedSubmit.mock.calls[0][0];
    expect(input.projectIds).toEqual(["id1", "id2"]);
    expect(input.plot).toEqual({ street: "Leśna 5", postalCode: "30-001", city: "Kraków", countryCode: "PL" });
    expect(input.message).toBe("Szukam domu na jesień");
    expect(input.idempotencyKey).toMatch(/[0-9a-f-]{36}/);
  });

  it("retries with the same idempotency key after a failure (AC-3)", async () => {
    mockedSubmit.mockResolvedValueOnce({ ok: false, error: "generic" }).mockResolvedValueOnce({ ok: true, inquiryId: "inq-1" });
    const user = userEvent.setup();
    renderFlow("PL");

    await fillAddress(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie do ModularHub" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się wysłać zapytania");

    await user.click(screen.getByRole("button", { name: "Ponów wysyłanie" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(mockedSubmit.mock.calls[1][0].idempotencyKey).toBe(mockedSubmit.mock.calls[0][0].idempotencyKey);
  });

  it("shows a specific message for an unsupported country", async () => {
    mockedSubmit.mockResolvedValue({ ok: false, error: "unsupported_country" });
    const user = userEvent.setup();
    renderFlow("PL");

    await fillAddress(user);
    await user.click(screen.getByRole("button", { name: "Wyślij zapytanie do ModularHub" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("nie jest jeszcze obsługiwany");
    expect(push).not.toHaveBeenCalled();
  });
});
