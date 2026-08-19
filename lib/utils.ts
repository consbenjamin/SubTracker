import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseDateOnly } from "@/lib/date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode = string;

export function formatCurrency(amount: number, currency: CurrencyCode = "ARS"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    // Por defecto es-ES agrupa recién a partir de cinco dígitos, así que
    // convivían "7999,00 ARS" y "480.000,00 ARS" en la misma pantalla.
    useGrouping: "always",
  }).format(amount);
}

/** Fecha larga ("10 de agosto de 2026"). Parsea en local para no restar un día. */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parseDateOnly(date));
}
