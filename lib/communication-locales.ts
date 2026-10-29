// Spec 0077 część C: lista języków komunikacji producenta, bez żadnych importów. Osobny plik,
// bo komponent kliencki (CommunicationLocaleForm) nie może ciągnąć za sobą klienta bazy danych.
export const COMMUNICATION_LOCALES = ["pl", "en", "de", "nl"] as const;
export type CommunicationLocale = (typeof COMMUNICATION_LOCALES)[number];
