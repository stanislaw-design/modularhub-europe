// Orientacyjna skala produkcji zbierana przy rejestracji producenta (spec
// 0040 AC-8). Statyczna lista opcji formularza, jak PRODUCER_TECHNOLOGIES;
// czysto informacyjne, bez wpływu na żadną inną regułę.
export const PRODUCER_PRODUCTION_SCALES = [
  { value: "do-10", label: "Do 10 domów rocznie" },
  { value: "powyzej-10", label: "Powyżej 10 domów rocznie" },
] as const;

export type ProducerProductionScale = (typeof PRODUCER_PRODUCTION_SCALES)[number]["value"];
