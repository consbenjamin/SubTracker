import type { Subscription, PaymentHistory } from "@/types";
import { getBillingCycleLabel, getMonthlyEquivalent } from "@/lib/subscriptions";
import { parseDateOnly } from "@/lib/date";

/** Contenido común de las exportaciones CSV y PDF: mismos datos, distinto envoltorio. */

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  paused: "Pausada",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-08-10" → "10/08/2026" (sin desfase de zona horaria). */
export function formatDateShort(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Coma decimal (formato es-ES) para que Excel lo lea como número. */
export function formatNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Nombre de archivo con la fecha de hoy, ej. subghost-pagos-2026-08-08.csv */
export function exportFilename(kind: string, extension: string): string {
  const d = new Date();
  return `subghost-${kind}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${extension}`;
}

export const SUBSCRIPTION_HEADERS = [
  "Nombre",
  "Precio",
  "Tipo",
  "Ciclo",
  "Plan",
  "Próxima fecha de pago",
  "Categoría",
  "Estado",
  "Notas",
];

export const PAYMENT_HEADERS = ["Fecha", "Suscripción", "Importe"];

/** Suscripciones ordenadas por categoría y nombre, como se muestran en el export. */
export function sortSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return [...subscriptions].sort(
    (a, b) =>
      (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name)
  );
}

/** Pagos del más reciente al más antiguo. */
export function sortPayments(payments: PaymentHistory[]): PaymentHistory[] {
  return [...payments].sort(
    (a, b) => parseDateOnly(b.payment_date).getTime() - parseDateOnly(a.payment_date).getTime()
  );
}

export function subscriptionRow(s: Subscription, notesLimit?: number): string[] {
  const notes = s.notes ?? "";
  return [
    s.name,
    formatNumber(s.price),
    s.payment_type === "installment" ? "Cuotas" : "Recurrente",
    getBillingCycleLabel(s.billing_cycle, s.payment_type, s.installment_count),
    s.payment_type === "installment"
      ? `${s.installments_paid}/${s.installment_count ?? 0}`
      : "-",
    formatDateShort(s.next_payment_date),
    s.category,
    STATUS_LABELS[s.status] ?? s.status,
    notesLimit != null ? notes.slice(0, notesLimit) : notes,
  ];
}

export function paymentRow(
  p: PaymentHistory,
  subscriptionNames?: Map<string, string>
): string[] {
  return [
    formatDateShort(p.payment_date),
    subscriptionNames?.get(p.subscription_id) ?? p.subscription_id,
    formatNumber(p.amount),
  ];
}

export function totalMonthly(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0);
}

export function totalPaid(payments: PaymentHistory[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}
