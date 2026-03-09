import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Subscription, PaymentHistory } from "@/types";
import { getBillingCycleLabel, getMonthlyEquivalent } from "@/lib/subscriptions";

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  paused: "Pausada",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSubscriptionsPdf(subscriptions: Subscription[]): void {
  const sorted = [...subscriptions].sort((a, b) => {
    const cat = (a.category ?? "").localeCompare(b.category ?? "");
    return cat !== 0 ? cat : a.name.localeCompare(b.name);
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210; // A4 width in mm
  const pageH = 297; // A4 height in mm
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SubGhost — Exportación de suscripciones", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Exportado: ${formatDateTime(new Date())}`, 14, y);
  y += 5;
  doc.text(`Total: ${sorted.length} suscripción(es)`, 14, y);
  y += 12;

  const headers = [
    "Nombre",
    "Precio",
    "Tipo",
    "Ciclo",
    "Plan",
    "Próx. fecha",
    "Categoría",
    "Estado",
    "Notas",
  ];
  const body = sorted.map((s) => [
    s.name,
    formatNumber(s.price),
    s.payment_type === "installment" ? "Cuotas" : "Recurrente",
    getBillingCycleLabel(s.billing_cycle, s.payment_type, s.installment_count),
    s.payment_type === "installment"
      ? `${s.installments_paid}/${s.installment_count ?? 0}`
      : "-",
    formatDate(s.next_payment_date),
    s.category,
    STATUS_LABELS[s.status] ?? s.status,
    (s.notes ?? "").slice(0, 30),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
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
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${data.pageNumber}`,
        pageW / 2,
        pageH - 10,
        { align: "center" }
      );
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? y;
  let totalMonthly = 0;
  for (const s of sorted) {
    totalMonthly += getMonthlyEquivalent(s);
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Total equivalente mensual: ${formatNumber(totalMonthly)}`, 14, finalY + 10);

  const blob = doc.output("blob");
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `subghost-suscripciones-${date}.pdf`);
}

export function exportPaymentsPdf(
  payments: PaymentHistory[],
  subscriptionsMap?: Map<string, string>
): void {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SubGhost — Historial de pagos", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Exportado: ${formatDateTime(new Date())}`, 14, y);
  y += 5;
  doc.text(`Total: ${sorted.length} pago(s)`, 14, y);
  y += 12;

  const headers = ["Fecha", "Suscripción", "Importe"];
  const body = sorted.map((p) => [
    formatDate(p.payment_date),
    subscriptionsMap?.get(p.subscription_id) ?? p.subscription_id,
    formatNumber(p.amount),
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Página ${data.pageNumber}`,
        pageW / 2,
        pageH - 10,
        { align: "center" }
      );
    },
  });

  const total = sorted.reduce((sum, p) => sum + p.amount, 0);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? y;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatNumber(total)}`, 14, finalY + 10);

  const blob = doc.output("blob");
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `subghost-pagos-${date}.pdf`);
}
