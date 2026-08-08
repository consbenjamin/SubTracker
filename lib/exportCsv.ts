import type { Subscription, PaymentHistory } from "@/types";
import {
  PAYMENT_HEADERS,
  SUBSCRIPTION_HEADERS,
  exportFilename,
  formatDateTime,
  formatNumber,
  paymentRow,
  sortPayments,
  sortSubscriptions,
  subscriptionRow,
  totalMonthly,
  totalPaid,
  triggerDownload,
} from "@/lib/export/shared";

const UTF8_BOM = "﻿";
const SEP = ";";

function escapeCell(value: string): string {
  const s = String(value);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: string[]): string {
  return cells.map(escapeCell).join(SEP);
}

function download(kind: string, title: string, count: string, lines: string[]): void {
  const csv = [
    row([`SubGhost — ${title}`]),
    row([`Exportado: ${formatDateTime(new Date())}`]),
    row([`Total: ${count}`]),
    "",
    ...lines,
  ].join("\r\n");

  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, exportFilename(kind, "csv"));
}

export function exportSubscriptionsCsv(subscriptions: Subscription[]): void {
  const sorted = sortSubscriptions(subscriptions);

  download("suscripciones", "Exportación de suscripciones", `${sorted.length} suscripción(es)`, [
    row(SUBSCRIPTION_HEADERS),
    ...sorted.map((s) => row(subscriptionRow(s))),
    "",
    row(["", "", "", "", "", "Total mensual (equivalente)", formatNumber(totalMonthly(sorted))]),
  ]);
}

export function exportPaymentsCsv(
  payments: PaymentHistory[],
  subscriptionNames?: Map<string, string>
): void {
  const sorted = sortPayments(payments);

  download("pagos", "Historial de pagos", `${sorted.length} pago(s)`, [
    row([...PAYMENT_HEADERS, "ID del pago"]),
    ...sorted.map((p) => row([...paymentRow(p, subscriptionNames), p.id])),
    "",
    row(["", "", "Total", formatNumber(totalPaid(sorted))]),
  ]);
}
