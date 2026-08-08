import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
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

const PAGE_W = 210; // A4 en mm
const PAGE_H = 297;
const MARGIN = 14;
const NOTES_LIMIT = 30;

/** Cabecera + tabla + línea de total: el esqueleto es igual en los dos exports. */
function buildPdf(options: {
  kind: string;
  title: string;
  count: string;
  headers: string[];
  body: string[][];
  totalLabel: string;
  columnStyles: UserOptions["columnStyles"];
}): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`SubGhost — ${options.title}`, MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Exportado: ${formatDateTime(new Date())}`, MARGIN, y);
  y += 5;
  doc.text(`Total: ${options.count}`, MARGIN, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [options.headers],
    body: options.body,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: options.columnStyles,
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${data.pageNumber}`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
    },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(options.totalLabel, MARGIN, finalY + 10);

  triggerDownload(doc.output("blob"), exportFilename(options.kind, "pdf"));
}

export function exportSubscriptionsPdf(subscriptions: Subscription[]): void {
  const sorted = sortSubscriptions(subscriptions);

  buildPdf({
    kind: "suscripciones",
    title: "Exportación de suscripciones",
    count: `${sorted.length} suscripción(es)`,
    headers: SUBSCRIPTION_HEADERS,
    body: sorted.map((s) => subscriptionRow(s, NOTES_LIMIT)),
    totalLabel: `Total equivalente mensual: ${formatNumber(totalMonthly(sorted))}`,
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 20 },
      4: { cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: "wrap" },
    },
  });
}

export function exportPaymentsPdf(
  payments: PaymentHistory[],
  subscriptionNames?: Map<string, string>
): void {
  const sorted = sortPayments(payments);

  buildPdf({
    kind: "pagos",
    title: "Historial de pagos",
    count: `${sorted.length} pago(s)`,
    headers: PAYMENT_HEADERS,
    body: sorted.map((p) => paymentRow(p, subscriptionNames)),
    totalLabel: `Total: ${formatNumber(totalPaid(sorted))}`,
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 35 },
    },
  });
}
