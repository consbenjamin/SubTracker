import { addMonths } from "date-fns";
import type { BillingCycle } from "@/types";

/**
 * Las fechas de negocio (next_payment_date, payment_date, bought_date) son DATE de
 * Postgres: días sin hora ni zona. `new Date("2026-08-10")` las interpreta como UTC
 * y en zonas con offset negativo (ej. Argentina) muestra el día anterior.
 *
 * Todo el manejo de estas fechas pasa por este módulo: se parsean en local y se
 * serializan a YYYY-MM-DD sin pasar por UTC.
 */

/** "2026-08-10" (o ISO con hora) → Date local a medianoche. */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date (o string) → "YYYY-MM-DD" usando el calendario local. */
export function toDateOnly(value: string | Date | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const yy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Suma meses a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD. */
export function addMonthsDateOnly(dateStr: string, months: number): string {
  return toDateOnly(addMonths(parseDateOnly(dateStr), months));
}

const MONTHS_PER_CYCLE: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** Día del mes que una fecha de cobro representa: el ancla del ciclo. */
export function billingDayOf(dateStr: string): number {
  return parseDateOnly(dateStr).getDate();
}

/**
 * Próximo vencimiento según el ciclo, anclado al día que corresponde.
 *
 * `anchorDay` es el día del mes en que se cobra de verdad. Sin él, un cobro del
 * 31 se corría para siempre: febrero lo recorta al 28 y el ciclo siguiente
 * arranca desde ese 28, así que marzo daba 28 y nunca volvía al 31. Pasando el
 * ancla se elige primero el mes y recién después el día, que es el ancla o el
 * último del mes si ese mes es más corto; el recorte de febrero no se hereda.
 */
export function nextBillingDate(
  dateStr: string,
  billingCycle: BillingCycle,
  anchorDay?: number | null
): string {
  return addMonthsAnchored(dateStr, MONTHS_PER_CYCLE[billingCycle] ?? 1, anchorDay);
}

/**
 * Suma meses respetando un día ancla.
 *
 * Es la primitiva de `nextBillingDate`, para los cálculos que no van de a un
 * ciclo: el calendario de cuotas proyecta la número N de una sola vez.
 */
export function addMonthsAnchored(
  dateStr: string,
  months: number,
  anchorDay?: number | null
): string {
  const desde = parseDateOnly(dateStr);
  const ancla = anchorDay ?? desde.getDate();

  // Día 1 del mes destino: `new Date` normaliza los meses fuera de rango, así
  // que sumar 12 a diciembre cae en el año siguiente sin hacer cuentas.
  const destino = new Date(desde.getFullYear(), desde.getMonth() + months, 1);
  // Día 0 del mes siguiente = último del destino.
  const ultimoDelMes = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(ancla, ultimoDelMes));
  return toDateOnly(destino);
}

/**
 * Próximo vencimiento sin ancla conocida.
 *
 * Equivale a `nextBillingDate` tomando como ancla el día de `dateStr`, que es
 * lo mismo que hacía antes: se mantiene para los llamadores que no tienen de
 * dónde sacar el ancla.
 */
export function addBillingCycle(dateStr: string, billingCycle: BillingCycle): string {
  return nextBillingDate(dateStr, billingCycle, null);
}

/** Hoy en formato YYYY-MM-DD (calendario local). */
export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

/** Primer día del mes siguiente, en YYYY-MM-DD. */
export function firstDayOfNextMonth(from: Date = new Date()): string {
  return toDateOnly(new Date(from.getFullYear(), from.getMonth() + 1, 1));
}

/** Los últimos `count` meses (el actual incluido), como Date del día 1. */
export function lastMonths(count: number, from: Date = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) =>
    new Date(from.getFullYear(), from.getMonth() - (count - 1 - i), 1)
  );
}

/** Clave "YYYY-MM" para agrupar por mes. */
export function monthKey(value: string | Date): string {
  const d = parseDateOnly(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
