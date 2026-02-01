import type { Subscription, PaymentHistory } from "@/types";

const UTF8_BOM = "\uFEFF";
const SEP = ";";

function escapeCell(value: string): string {
  const s = String(value);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatDateCsv(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTimeCsv(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}

function row(cells: string[]): string {
  return cells.map(escapeCell).join(SEP);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  paused: "Pausada",
};

export function exportSubscriptionsCsv(subscriptions: Subscription[]): void {
  const sorted = [...subscriptions].sort((a, b) => {
    const cat = (a.category ?? "").localeCompare(b.category ?? "");
    return cat !== 0 ? cat : a.name.localeCompare(b.name);
  });

  const lines: string[] = [];
  lines.push(row(["SubTracker — Exportación de suscripciones"]));
  lines.push(row([`Exportado: ${formatDateTimeCsv(new Date())}`]));
  lines.push(row([`Total: ${sorted.length} suscripción(es)`]));
  lines.push("");

  const headers = [
    "Nombre",
    "Precio",
    "Ciclo de facturación",
    "Próxima fecha de pago",
    "Categoría",
    "Estado",
    "Notas",
  ];
  lines.push(row(headers));

  let totalMonthly = 0;
  for (const s of sorted) {
    const mult =
      s.billing_cycle === "monthly" ? 1 : s.billing_cycle === "quarterly" ? 1 / 3 : 1 / 12;
    totalMonthly += s.price * mult;
    lines.push(
      row([
        s.name,
        formatNumber(s.price),
        CYCLE_LABELS[s.billing_cycle] ?? s.billing_cycle,
        formatDateCsv(s.next_payment_date),
        s.category,
        STATUS_LABELS[s.status] ?? s.status,
        s.notes ?? "",
      ])
    );
  }

  lines.push("");
  lines.push(row(["", "", "", "", "", "Total mensual (equivalente)", formatNumber(totalMonthly)]));

  const csv = lines.join("\r\n");
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8" });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `subtracker-suscripciones-${date}.csv`);
}

export function exportPaymentsCsv(
  payments: PaymentHistory[],
  subscriptionsMap?: Map<string, string>
): void {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  const lines: string[] = [];
  lines.push(row(["SubTracker — Historial de pagos"]));
  lines.push(row([`Exportado: ${formatDateTimeCsv(new Date())}`]));
  lines.push(row([`Total: ${sorted.length} pago(s)`]));
  lines.push("");

  const headers = ["Fecha", "Suscripción", "Importe", "ID del pago"];
  lines.push(row(headers));

  let total = 0;
  for (const p of sorted) {
    total += p.amount;
    const subName = subscriptionsMap?.get(p.subscription_id) ?? p.subscription_id;
    lines.push(
      row([formatDateCsv(p.payment_date), subName, formatNumber(p.amount), p.id])
    );
  }

  lines.push("");
  lines.push(row(["", "", "Total", formatNumber(total)]));

  const csv = lines.join("\r\n");
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8" });
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `subtracker-pagos-${date}.csv`);
}
