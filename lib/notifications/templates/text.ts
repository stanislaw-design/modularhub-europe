import { COMPANY_ADDRESS_LINES, SUPPORT_EMAIL, SUPPORT_PHONE } from "./contact";
import type { TransactionalEmailProps } from "./types";

// Wersja tekstowa TransactionalEmail (design feedback po spec 0051): ta sama
// treść co HTML, bez znaczników. Skrzynki i filtry antyspamowe traktują brak
// wersji tekstowej obok HTML jako sygnał ostrzegawczy, a część klientów
// poczty (i czytniki ekranu) i tak pokazują tylko ją.
export function renderTransactionalEmailText({ heading, body, ctaLabel, ctaHref, badge, reference }: TransactionalEmailProps): string {
  const lines = [
    "Modular Hub Europe",
    "",
    ...(badge ? [`[${badge}]`, ""] : []),
    heading,
    "",
    body,
    "",
    `${ctaLabel}: ${ctaHref}`,
    "",
    "---",
    `Masz pytania albo coś nie zadziałało? Napisz do nas: ${SUPPORT_EMAIL} albo zadzwoń: ${SUPPORT_PHONE}.`,
    ...(reference ? [`Nr referencyjny: ${reference}`] : []),
    ...COMPANY_ADDRESS_LINES,
  ];
  return lines.join("\n");
}
