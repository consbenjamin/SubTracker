import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseDateOnly } from "@/lib/date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode = string;

export function formatCurrency(amount: number, currency: CurrencyCode = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
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
