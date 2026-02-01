"use client";

import { useState, useRef, useEffect } from "react";
import type { Subscription, PaymentHistory } from "@/types";
import { Button } from "@/components/ui/Button";
import { exportSubscriptionsCsv, exportPaymentsCsv } from "@/lib/exportCsv";
import { exportSubscriptionsPdf, exportPaymentsPdf } from "@/lib/exportPdf";
import { Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Exporting = "subs-csv" | "subs-pdf" | "payments-csv" | "payments-pdf" | null;

interface ExportDropdownProps {
  subscriptions?: Subscription[];
}

export function ExportDropdown({ subscriptions }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<Exporting>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSubscriptions = async () => {
    if (subscriptions?.length) return subscriptions;
    const res = await fetch("/api/subscriptions");
    return res.ok ? await res.json() : [];
  };

  const handleExportSubscriptionsCsv = async () => {
    setExporting("subs-csv");
    try {
      const subs = await loadSubscriptions();
      exportSubscriptionsCsv(subs ?? []);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  const handleExportSubscriptionsPdf = async () => {
    setExporting("subs-pdf");
    try {
      const subs = await loadSubscriptions();
      exportSubscriptionsPdf(subs ?? []);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  const handleExportPaymentsCsv = async () => {
    setExporting("payments-csv");
    try {
      const paymentsRes = await fetch("/api/payments");
      const payments: PaymentHistory[] = paymentsRes.ok ? await paymentsRes.json() : [];
      const subs = await loadSubscriptions();
      const map = subs?.length ? new Map(subs.map((s) => [s.id, s.name])) : undefined;
      exportPaymentsCsv(payments, map);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  const handleExportPaymentsPdf = async () => {
    setExporting("payments-pdf");
    try {
      const paymentsRes = await fetch("/api/payments");
      const payments: PaymentHistory[] = paymentsRes.ok ? await paymentsRes.json() : [];
      const subs = await loadSubscriptions();
      const map = subs?.length ? new Map(subs.map((s) => [s.id, s.name])) : undefined;
      exportPaymentsPdf(payments, map);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen((o) => !o)}
        className="gap-2"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="h-4 w-4" />
        Exportar
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[220px] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Suscripciones
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportSubscriptionsCsv}
            disabled={exporting !== null}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {exporting === "subs-csv" ? "Exportando…" : "CSV"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportSubscriptionsPdf}
            disabled={exporting !== null}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {exporting === "subs-pdf" ? "Exportando…" : "PDF"}
          </button>
          <div className="my-1 border-t border-border" />
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Historial de pagos
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportPaymentsCsv}
            disabled={exporting !== null}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {exporting === "payments-csv" ? "Exportando…" : "CSV"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportPaymentsPdf}
            disabled={exporting !== null}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            {exporting === "payments-pdf" ? "Exportando…" : "PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
