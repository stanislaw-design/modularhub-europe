import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import pl from "@/messages/pl.json";

// Spec 0070 AC-26: nowe teksty ekranów klienta, producenta i maili mają prawdziwe
// tłumaczenia w czterech językach. Test w lib/i18n/messages.test.ts pilnuje samych
// kluczy; ten dodaje, że wartość w en, de i nl nie jest pustym ani skopiowanym
// polskim tekstem. `npm run check:translations` dotyczy tylko tłumaczeń danych
// produktów w bazie i tego nie sprawdza.
const LARGE_ORDER_NAMESPACES = [
  "ProducerPanelCapacityPage",
  "ClientB2bDetailsForm",
  "LargeOrderTeamNewRequestEmail",
  // AC-37 do AC-43: klient zamyka zapytanie, komunikat o limicie, nagłówek zapytania.
  "RequestHeader",
  "CancelRequestDialog",
  "BulkRequestLimitMessage",
  "LargeOrderTeamClientCancelledEmail",
  "LargeOrderProducerClosedEmail",
  "LargeOrderProducerNotSelectedEmail",
  "ReopenRequestButton",
  "QuoteOutcomeControl",
  // AC-20: mail do klienta o zapytaniu złożonym przez doradcę.
  "LargeOrderClientOnBehalfEmail",
  "LargeOrderClientReceivedEmail",
  // AC-11, AC-12: nowy format oferty i komunikat o zamkniętym przyjmowaniu ofert.
  "QuoteForm",
  // AC-15: tabela porównawcza ofert na liście zapytań klienta.
  "QuoteComparisonTable",
  // AC-16, AC-17: wybór oferty przez klienta i maile połączenia stron.
  "SelectQuoteButton",
  "LargeOrderClientConnectedEmail",
  "LargeOrderProducerConnectedEmail",
  "LargeOrderTeamConnectedEmail",
  "LargeOrderTeamPendingSelectionEmail",
  // AC-28 do AC-34: pliki inwestora (kreator, lista, ukrywanie, błędy).
  "InquiryAttachments",
  // AC-24, AC-25: pozostałe maile (zapytanie do producentów, oferta do zespołu, publikacja
  // do klienta, przypomnienie o terminie, alert o minionym terminie).
  "LargeOrderProducerNewRequestEmail",
  "LargeOrderTeamNewQuoteEmail",
  "LargeOrderClientSummaryPublishedEmail",
  "LargeOrderProducerReminderEmail",
  "LargeOrderTeamDeadlineEmail",
  // Spec 0076 AC-5: publiczna strona realizacji.
  "ModularProjectsPage",
  "ModularProjectPage",
];

// Spec 0076 AC-5: nazwa własna brzmi tak samo w czterech językach i nie jest tłumaczona.
const PROPER_NAME = "ModularProjects";
const isCopyOfPolish = (value: string, polish: string | undefined) => value === polish && value !== PROPER_NAME;

// Nowe klucze w istniejącej przestrzeni nazw (reszta przestrzeni ma wspólne słowa, np. "Status").
const CLIENT_PANEL_QUOTES_NEW_KEYS = ["heading", "emptyTitle", "emptyDescription", "addRequest", "activeCounter", "limitHint", "noQuotesYet", "closedGroupHeading"];

function leaves(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") return [[prefix, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, nested]) => leaves(nested, prefix ? `${prefix}.${key}` : key));
}

function namespace(catalog: unknown, name: string): unknown {
  return (catalog as Record<string, unknown>)[name];
}

describe("spec 0070 message namespaces are translated, not copied", () => {
  for (const name of LARGE_ORDER_NAMESPACES) {
    for (const [locale, catalog] of [
      ["en", en],
      ["de", de],
      ["nl", nl],
    ] as const) {
      it(`${name} in ${locale} has no empty value and no leaf copied from Polish`, () => {
        const polish = new Map(leaves(namespace(pl, name)));
        const translated = leaves(namespace(catalog, name));

        expect(translated.length).toBeGreaterThan(0);
        for (const [path, value] of translated) {
          expect(value.trim(), `${locale}:${name}.${path}`).not.toBe("");
          expect(isCopyOfPolish(value, polish.get(path)), `${locale}:${name}.${path} equals the Polish text`).toBe(false);
        }
      });
    }
  }

  // AC-35, AC-36: znacznik kraju dostawy na tablicy i w szczególe, tekst i link.
  for (const ns of ["ProducerPanelBoardPage", "ProducerBoardDetailPage"]) {
    for (const key of ["notDeliveringNote", "notDeliveringLink"]) {
      it(`${ns}.${key} is translated in every language`, () => {
        const get = (catalog: unknown) => (namespace(catalog, ns) as Record<string, string>)[key];
        const polish = get(pl);
        expect(polish?.trim()).toBeTruthy();
        for (const catalog of [en, de, nl]) {
          expect(get(catalog)?.trim()).toBeTruthy();
          expect(isCopyOfPolish(get(catalog), polish), `${ns}.${key}`).toBe(false);
        }
      });
    }
  }

  it("ClientPanelQuotesPage new keys and the sidebar label are translated in every language (AC-42, AC-43)", () => {
    const quotesPage = (catalog: unknown) => namespace(catalog, "ClientPanelQuotesPage") as Record<string, string>;
    const sidebar = (catalog: unknown) => namespace(catalog, "ClientPanelSidebar") as Record<string, string>;
    for (const key of CLIENT_PANEL_QUOTES_NEW_KEYS) {
      expect(quotesPage(pl)[key]?.trim(), `pl:${key}`).toBeTruthy();
      for (const catalog of [en, de, nl]) {
        expect(quotesPage(catalog)[key]?.trim(), key).toBeTruthy();
        expect(isCopyOfPolish(quotesPage(catalog)[key], quotesPage(pl)[key]), key).toBe(false);
      }
    }
    expect(sidebar(pl).quotes).toBe(PROPER_NAME);
    for (const catalog of [en, de, nl]) expect(sidebar(catalog).quotes).toBe(PROPER_NAME);
  });

  it("ProducerPanelSidebar.capacity is translated in every language", () => {
    const get = (catalog: unknown) => (namespace(catalog, "ProducerPanelSidebar") as Record<string, string>).capacity;
    const polish = get(pl);
    expect(get(en)).not.toBe(polish);
    expect(get(de)).not.toBe(polish);
    expect(get(nl)).not.toBe(polish);
  });
});
