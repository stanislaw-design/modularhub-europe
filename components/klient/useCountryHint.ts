"use client";

import { useEffect } from "react";
import { isMarketCountryCode, type CountryCode } from "@/lib/countries";

// Podpowiedź kraju z adresu (`?country=`, spec 0082 AC-4, AC-10). Strony z formularzem
// są statyczne (spec 0078), więc adres czytamy po załadowaniu, nie z serwera. Podpowiedź
// nie nadpisuje kraju, który klient już wybrał, a kod spoza listy jest ignorowany.
export function useCountryHint(setCountry: (update: (current: CountryCode | null) => CountryCode | null) => void) {
  useEffect(() => {
    const hint = new URLSearchParams(window.location.search).get("country");
    if (!isMarketCountryCode(hint)) return;
    setCountry((current) => current ?? hint);
  }, [setCountry]);
}
