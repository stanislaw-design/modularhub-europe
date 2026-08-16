// Construction technologies a producer can register with. Static list (like
// SIZE_THRESHOLDS): not a domain entity fetched from an API, just the option
// set for the registration form's "Technologia" field.
export const PRODUCER_TECHNOLOGIES = [
  { value: "szkielet-drewniany", label: "Szkielet drewniany" },
  { value: "modulowa-stal-lekka", label: "Modułowa stal lekka" },
  { value: "plyta-warstwowa-sip", label: "Płyta warstwowa (SIP)" },
  { value: "beton-modulowy", label: "Beton modułowy" },
] as const;

export type ProducerTechnology = (typeof PRODUCER_TECHNOLOGIES)[number]["value"];
