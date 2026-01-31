import type { CurrencyCode } from "@/lib/contexts/SettingsContext";

export const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "GBP", label: "Libra esterlina (GBP)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
];
