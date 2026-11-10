import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import type { CountryCode } from "@/lib/countries";
import { useCountryHint } from "./useCountryHint";

// Spec 0082 AC-4, AC-10: kraj z adresu to tylko podpowiedź w formularzu zapytania.
function useHintedCountry(initial: CountryCode | null = null) {
  const [country, setCountry] = useState<CountryCode | null>(initial);
  useCountryHint(setCountry);
  return { country, setCountry };
}

function setSearch(search: string) {
  window.history.replaceState(null, "", `/pl/project-request${search}`);
}

describe("useCountryHint (spec 0082 AC-4, AC-10)", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it.each(["PL", "DE", "NL", "BE", "IT", "FR"] as const)("preselects %s from ?country= (AC-4)", (code) => {
    setSearch(`?country=${code}`);
    const { result } = renderHook(() => useHintedCountry());
    expect(result.current.country).toBe(code);
  });

  it("keeps the country empty when the address has no country (AC-4)", () => {
    setSearch("");
    const { result } = renderHook(() => useHintedCountry());
    expect(result.current.country).toBeNull();
  });

  it.each(["US", "XX", "de", ""])("ignores the invalid hint %j (AC-4)", (hint) => {
    setSearch(`?country=${hint}`);
    const { result } = renderHook(() => useHintedCountry());
    expect(result.current.country).toBeNull();
  });

  it("does not overwrite a country that is already chosen (AC-10)", () => {
    setSearch("?country=IT");
    const { result } = renderHook(() => useHintedCountry("BE"));
    expect(result.current.country).toBe("BE");
  });

  it("lets the customer change the hinted country afterwards (AC-10)", () => {
    setSearch("?country=IT");
    const { result } = renderHook(() => useHintedCountry());
    expect(result.current.country).toBe("IT");

    act(() => result.current.setCountry("FR"));
    expect(result.current.country).toBe("FR");
  });

  it("reads the country among other search params (AC-4)", () => {
    setSearch("?sizeMin=50&country=NL&sort=price-asc");
    const { result } = renderHook(() => useHintedCountry());
    expect(result.current.country).toBe("NL");
  });
});
