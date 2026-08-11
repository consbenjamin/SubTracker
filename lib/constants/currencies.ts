import type { CurrencyCode } from "@/lib/contexts/SettingsContext";

/** El orden define cómo se listan en Configuración: primero la de uso más probable. */
export const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Libra esterlina (GBP)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
];
