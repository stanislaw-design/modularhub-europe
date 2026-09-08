"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Label, Select, Stack } from "@/components/ui";
import type { Country, CountryCode } from "@/lib/data/types";
import { NIP_PATTERN, normalizeNip } from "@/lib/producer-registration";
import { PRODUCER_TECHNOLOGIES, type ProducerTechnology } from "@/lib/producer-technologies";

interface RegistrationFormProps {
  locale: string;
  countries: Country[];
}

const technologyOptions = PRODUCER_TECHNOLOGIES.map((technology) => ({
  value: technology.value,
  label: technology.label,
}));

export function RegistrationForm({ locale, countries }: RegistrationFormProps) {
  const t = useTranslations("RegistrationForm");
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [nipTouched, setNipTouched] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>([]);
  const [technology, setTechnology] = useState<ProducerTechnology | null>(null);

  const nipValid = NIP_PATTERN.test(normalizeNip(nip));
  const nipInvalid = nipTouched && nip.length > 0 && !nipValid;
  const canSubmit = nipValid && selectedCountries.length > 0 && technology !== null;

  function toggleCountry(code: CountryCode) {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((selected) => selected !== code) : [...prev, code]
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || technology === null) return;
    const params = new URLSearchParams({
      nip: normalizeNip(nip),
      countries: selectedCountries.join(","),
      technology,
    });
    router.push(`/${locale}/producent/projekt?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-brand-3" noValidate>
      <Stack gap={1}>
        <Label htmlFor="registration-nip" required>
          {t("nipLabel")}
        </Label>
        <Input
          id="registration-nip"
          name="nip"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("nipPlaceholder")}
          required
          invalid={nipInvalid}
          aria-describedby={nipInvalid ? "registration-nip-error" : undefined}
          value={nip}
          onChange={(event) => setNip(event.target.value)}
          onBlur={() => setNipTouched(true)}
        />
        {nipInvalid && (
          <p id="registration-nip-error" className="font-sans text-body text-status-blocked">
            {t("nipError")}
          </p>
        )}
      </Stack>

      <fieldset className="flex flex-col gap-brand-1 border-0 p-0 m-0">
        <legend className="text-label font-medium uppercase tracking-[0.1em] text-brand-technical-graphite">
          {t("deliveryCountriesLegend")}<span className="text-status-blocked" aria-hidden="true"> *</span>
        </legend>
        <Stack direction="row" gap={3} className="flex-wrap">
          {countries.map((country) => (
            <label
              key={country.code}
              className="flex min-h-11 items-center gap-brand-1 text-body text-brand-foundation-navy"
            >
              <Checkbox
                checked={selectedCountries.includes(country.code)}
                onChange={() => toggleCountry(country.code)}
              />
              {country.name}
            </label>
          ))}
        </Stack>
      </fieldset>

      <Stack gap={1}>
        <Label id="registration-technology-label" required>
          {t("technologyLabel")}
        </Label>
        <Select
          value={technology}
          onChange={setTechnology}
          options={technologyOptions}
          placeholder={t("technologyPlaceholder")}
          name="technology"
          aria-labelledby="registration-technology-label"
        />
      </Stack>

      <Button type="submit" disabled={!canSubmit} className="w-fit">
        {t("submitButton")}
      </Button>
    </form>
  );
}
