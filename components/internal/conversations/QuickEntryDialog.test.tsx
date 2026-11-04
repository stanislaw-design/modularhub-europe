import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuickEntryAction, findSimilarPartnersAction } from "@/app/[locale]/internal/conversations/actions";
import { QuickEntryDialog } from "./QuickEntryDialog";

const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));
vi.mock("@/app/[locale]/internal/conversations/actions", () => ({
  createQuickEntryAction: vi.fn(),
  findSimilarPartnersAction: vi.fn(),
}));
const mockedCreate = vi.mocked(createQuickEntryAction);
const mockedSimilar = vi.mocked(findSimilarPartnersAction);

const ME = "admin-1";
const props = {
  locale: "pl",
  currentUserId: ME,
  admins: [
    { id: ME, name: "Anna" },
    { id: "admin-2", name: "Jan" },
  ],
  partners: [{ id: "partner-1", name: "Kristol" }],
  threads: [{ id: "thread-1", partnerId: "partner-1", title: "Wycena łóżek" }],
  contacts: [{ id: "contact-1", partnerId: "partner-1", name: "Pan Marek" }],
  templates: [{ key: "rfq", name: "Zapytanie ofertowe", taskCount: 3 }],
};

async function chooseNewPartner(user: ReturnType<typeof userEvent.setup>, form: HTMLElement) {
  await user.click(within(form).getByRole("radio", { name: "Nowa firma" }));
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  render(<QuickEntryDialog {...props} />);
  await user.click(screen.getByRole("button", { name: "Szybki wpis" }));
  return screen.getByRole("form", { name: "Szybki wpis" });
}

beforeEach(() => {
  mockedCreate.mockReset();
  mockedSimilar.mockReset().mockResolvedValue({ ok: true, similar: [] });
  pushMock.mockReset();
  refreshMock.mockReset();
});

// Spec 0080 AC-17: jeden formularz zapisuje firmę, sprawę, wpis i zadania jednym wywołaniem.
describe("QuickEntryDialog", () => {
  it("nowa firma, nowa sprawa z szablonem, wpis i zadanie idą jednym wywołaniem, potem przejście na kartę firmy", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: true, partnerId: "new-partner", threadId: "new-thread", entryId: "new-entry" } as never);
    const form = await openDialog(user);
    await chooseNewPartner(user, form);

    await user.type(within(form).getByLabelText("Nazwa nowej firmy"), "Nowy Producent");
    await user.selectOptions(within(form).getByLabelText("Sprawa"), "__new__");
    await user.type(within(form).getByLabelText("Tytuł sprawy"), "Wycena");
    await user.selectOptions(within(form).getByLabelText("Szablon"), "rfq");
    await user.type(within(form).getByLabelText("Treść"), "Rozmowa telefoniczna");
    await user.click(within(form).getByRole("button", { name: "Dodaj zadanie" }));
    await user.type(within(form).getByLabelText("Tytuł"), "Wysłać specyfikację");
    await user.selectOptions(within(form).getByLabelText("Kto"), "external");
    await user.click(within(form).getByRole("button", { name: "Zapisz wszystko" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedSimilar).toHaveBeenCalledWith("Nowy Producent");
    expect(mockedCreate).toHaveBeenCalledWith({
      partner: { create: { name: "Nowy Producent", kind: "producent", tags: [] } },
      thread: { create: { title: "Wycena", ownerUserId: ME, templateKey: "rfq" } },
      entry: { contactId: null, occurredAtLocal: null, direction: "outbound", channel: "phone", body: "Rozmowa telefoniczna" },
      tasks: [{ title: "Wysłać specyfikację", dueDate: null, assignee: { kind: "external", contactId: null } }],
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/pl/internal/conversations/partners/new-partner"));
  });

  it("istniejąca firma i sprawa: nie pyta o podobne firmy i wysyła ich id", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: true, partnerId: "partner-1" } as never);
    const form = await openDialog(user);

    await user.click(within(form).getByRole("button", { name: /^Firma/ }));
    await user.click(screen.getByRole("option", { name: "Kristol" }));
    await user.selectOptions(within(form).getByLabelText("Sprawa"), "thread-1");
    await user.selectOptions(within(form).getByLabelText("Osoba kontaktowa"), "contact-1");
    await user.type(within(form).getByLabelText("Treść"), "Odpisali");
    await user.click(within(form).getByRole("button", { name: "Zapisz wszystko" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedSimilar).not.toHaveBeenCalled();
    expect(mockedCreate.mock.calls[0][0]).toMatchObject({
      partner: { id: "partner-1" },
      thread: { id: "thread-1" },
      entry: { contactId: "contact-1", body: "Odpisali" },
      tasks: [],
    });
  });

  it("pole Firma: pasek wyszukiwania zawęża listę, Enter wybiera pierwszą pasującą firmę i nie wysyła formularza", async () => {
    const user = userEvent.setup();
    render(<QuickEntryDialog {...props} partners={[...props.partners, { id: "partner-2", name: "Domwood" }]} />);
    await user.click(screen.getByRole("button", { name: "Szybki wpis" }));
    const form = screen.getByRole("form", { name: "Szybki wpis" });

    await user.click(within(form).getByRole("button", { name: /^Firma/ }));
    expect(within(screen.getByRole("listbox", { name: "Firmy" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["Kristol", "Domwood"]);

    await user.type(screen.getByRole("searchbox", { name: "Szukaj firmy" }), "dom");
    expect(within(screen.getByRole("listbox", { name: "Firmy" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["Domwood"]);

    await user.keyboard("{Enter}");
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(within(form).getByRole("button", { name: /^Firma/ })).toHaveTextContent("Domwood");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(within(form).queryByLabelText("Nazwa nowej firmy")).not.toBeInTheDocument();
  });

  it("domyślnie wybrana jest istniejąca firma, a przełącznik zamienia pole wyboru na pola nowej firmy", async () => {
    const user = userEvent.setup();
    const form = await openDialog(user);

    expect(within(form).getByRole("radio", { name: "Istniejąca firma" })).toBeChecked();
    expect(within(form).getByRole("button", { name: /^Firma/ })).toHaveTextContent("Wybierz firmę");
    expect(within(form).queryByLabelText("Nazwa nowej firmy")).not.toBeInTheDocument();

    await chooseNewPartner(user, form);
    expect(within(form).getByRole("radio", { name: "Nowa firma" })).toBeChecked();
    expect(within(form).getByLabelText("Nazwa nowej firmy")).toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: /^Firma/ })).not.toBeInTheDocument();

    await user.click(within(form).getByRole("radio", { name: "Istniejąca firma" }));
    expect(within(form).getByRole("button", { name: /^Firma/ })).toBeInTheDocument();
  });

  it("bez wybranej firmy zapis jest zatrzymany z czytelnym komunikatem", async () => {
    const user = userEvent.setup();
    const form = await openDialog(user);
    await user.type(within(form).getByLabelText("Treść"), "Test");
    await user.click(within(form).getByRole("button", { name: "Zapisz wszystko" }));

    expect(await screen.findByText(/Wybierz firmę albo przełącz/)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedSimilar).not.toHaveBeenCalled();
  });

  it("pole Firma: brak wyników podpowiada przełączenie na Nowa firma, a Enter niczego nie wybiera", async () => {
    const user = userEvent.setup();
    const form = await openDialog(user);
    await user.click(within(form).getByRole("button", { name: /^Firma/ }));
    await user.type(screen.getByRole("searchbox", { name: "Szukaj firmy" }), "zzzz");
    expect(screen.getByText(/Brak firm o takiej nazwie/)).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(within(form).getByRole("button", { name: /^Firma/ })).toHaveTextContent("Wybierz firmę");
  });

  it("podobna firma zatrzymuje zapis, drugi zapis świadomie tworzy nową firmę (AC-5)", async () => {
    const user = userEvent.setup();
    mockedSimilar.mockResolvedValue({ ok: true, similar: [{ id: "partner-1", name: "Kristol", archived: false }] });
    mockedCreate.mockResolvedValue({ ok: true, partnerId: "n" } as never);
    const form = await openDialog(user);
    await chooseNewPartner(user, form);

    await user.type(within(form).getByLabelText("Nazwa nowej firmy"), "Kristol sp. z o.o.");
    await user.type(within(form).getByLabelText("Treść"), "Test");
    await user.click(within(form).getByRole("button", { name: "Zapisz wszystko" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Kristol");
    expect(mockedCreate).not.toHaveBeenCalled();

    await user.click(within(form).getByRole("button", { name: "Utwórz nową firmę i zapisz" }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
  });

  it("błąd zapisu zostaje w oknie i nie przechodzi na kartę firmy", async () => {
    const user = userEvent.setup();
    mockedCreate.mockResolvedValue({ ok: false, error: "Nie udało się zapisać zmiany. Spróbuj ponownie." });
    const form = await openDialog(user);
    await chooseNewPartner(user, form);

    await user.type(within(form).getByLabelText("Nazwa nowej firmy"), "Firma X");
    await user.type(within(form).getByLabelText("Treść"), "Test");
    await user.click(within(form).getByRole("button", { name: "Zapisz wszystko" }));

    expect(await screen.findByText("Nie udało się zapisać zmiany. Spróbuj ponownie.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("form", { name: "Szybki wpis" })).toBeInTheDocument();
  });
});
