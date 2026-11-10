import { render } from "@react-email/render";
import { captureError } from "@/lib/observability";
import type { CommercialDisplayInquiryData } from "@/lib/commercial-display-inquiry-specs";
import { sendNotificationEmail } from "./send";
import { shortReference } from "./templates/reference";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";
import type { TransactionalEmailProps } from "./templates/types";

// Zespół czyta te maile po polsku, więc etykiety są tu na stałe, bez katalogów tłumaczeń
// (klient widzi tylko ekran potwierdzenia na stronie).
const USE_CASE_LABELS: Record<CommercialDisplayInquiryData["useCase"], string> = {
  hotel: "Hotel lub resort",
  restaurant: "Restauracja lub bar",
  "pool-spa": "Baseny i spa",
  residential: "Apartamentowiec lub osiedle",
  retail: "Handel i reklama",
  other: "Inne",
};

const INTEREST_LABELS: Record<CommercialDisplayInquiryData["interests"][number], string> = {
  displays: "Wyświetlacze komercyjne IP66",
  signage: "Pakiet digital signage",
  "led-wall": "Ściana LED",
  unsure: "Prosi o doradztwo",
};

// Ten sam adres zespołu co alerty dużych zamówień (spec 0070), z zapasowym adresem doradcy.
function teamRecipient(): string | undefined {
  return process.env.OPERATIONS_NOTIFY_EMAIL ?? process.env.ADVISOR_NOTIFY_EMAIL;
}

export interface CommercialDisplayInquiryForTeam {
  id: string;
  data: CommercialDisplayInquiryData;
}

// Spec 0083 AC-7: mail do zespołu zaraz po złożeniu zgłoszenia, z pełnymi danymi, bo zgłoszenie
// nie ma jeszcze ekranu w panelu admina. Odpowiedź (replyTo) trafia prosto do klienta.
// Best effort: błąd wysyłki idzie do Sentry i nigdy nie cofa zapisu zgłoszenia.
export async function notifyTeamOfCommercialDisplayInquiry({ id, data }: CommercialDisplayInquiryForTeam): Promise<void> {
  const to = teamRecipient();
  if (!to) return;
  try {
    const subject = `Nowe zapytanie o ekrany komercyjne: ${USE_CASE_LABELS[data.useCase]}, ${data.countryCode}`;
    const lines = [
      `Imię i nazwisko: ${data.name}`,
      data.company ? `Firma: ${data.company}` : undefined,
      `E-mail: ${data.email}`,
      data.phone ? `Telefon: ${data.phone}` : undefined,
      `Kraj: ${data.countryCode}`,
      `Zastosowanie: ${USE_CASE_LABELS[data.useCase]}`,
      `Czego dotyczy: ${data.interests.map((interest) => INTEREST_LABELS[interest]).join(", ")}`,
      data.screenCount ? `Liczba ekranów: ${data.screenCount}` : undefined,
      `Język strony: ${data.locale}`,
      "",
      "Opis projektu:",
      data.message,
    ];
    const content: TransactionalEmailProps = {
      preview: subject,
      heading: subject,
      body: lines.filter((line) => line !== undefined).join("\n"),
      ctaLabel: "Odpowiedz klientowi",
      ctaHref: `mailto:${data.email}`,
      reference: shortReference(id),
    };

    await sendNotificationEmail({
      to,
      subject,
      html: await render(TransactionalEmail(content)),
      text: renderTransactionalEmailText(content),
      emailType: "commercial_display_team_new_inquiry",
      entityId: id,
      distinctId: id,
      replyTo: data.email,
    });
  } catch (error) {
    captureError(error, { path: "notifyTeamOfCommercialDisplayInquiry" });
  }
}
