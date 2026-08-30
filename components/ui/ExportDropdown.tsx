"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Subscription, PaymentHistory } from "@/types";
import { Button } from "@/components/ui/Button";
import { exportSubscriptionsCsv, exportPaymentsCsv } from "@/lib/exportCsv";
import { exportSubscriptionsPdf, exportPaymentsPdf } from "@/lib/exportPdf";
import { Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";

type Dataset = "subscriptions" | "payments";
type Format = "csv" | "pdf";
type ExportKey = `${Dataset}-${Format}`;

interface ExportDropdownProps {
  subscriptions?: Subscription[];
}

export function ExportDropdown({ subscriptions }: ExportDropdownProps) {
  const t = useTranslations("export");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportKey | null>(null);
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

  /** null = no se pudo traer. Distinto de una lista legítimamente vacía. */
  const loadSubscriptions = async (): Promise<Subscription[] | null> => {
    if (subscriptions?.length) return subscriptions;
    const res = await fetch("/api/subscriptions");
    return res.ok ? ((await res.json()) as Subscription[]) : null;
  };

  const handleExport = async (dataset: Dataset, format: Format) => {
    setExporting(`${dataset}-${format}`);
    try {
      const subs = await loadSubscriptions();
      // Antes, un fallo de red daba una lista vacía y el archivo se generaba
      // igual: te bajabas un CSV sin filas creyendo que ese era tu historial.
      if (!subs) return toast.error(t("errorLoading"));

      if (dataset === "subscriptions") {
        if (!subs.length) return toast.toast(t("nothingToExport"), "info");
        (format === "csv" ? exportSubscriptionsCsv : exportSubscriptionsPdf)(subs);
        return;
      }

      const res = await fetch("/api/payments");
      if (!res.ok) return toast.error(t("errorLoading"));
      const payments: PaymentHistory[] = await res.json();
      if (!payments.length) return toast.toast(t("nothingToExport"), "info");
      const names = subs.length ? new Map(subs.map((s) => [s.id, s.name])) : undefined;
      (format === "csv" ? exportPaymentsCsv : exportPaymentsPdf)(payments, names);
    } catch (error) {
      console.error("Error exportando:", error);
      toast.error(t("errorLoading"));
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  const renderItem = (dataset: Dataset, format: Format) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => handleExport(dataset, format)}
      disabled={exporting !== null}
      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
    >
      {exporting === `${dataset}-${format}` ? t("exporting") : t(format)}
    </button>
  );

  const sections: { dataset: Dataset; label: string }[] = [
    { dataset: "subscriptions", label: t("subscriptions") },
    { dataset: "payments", label: t("paymentHistory") },
  ];

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
        {t("export")}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[220px] rounded-lg border border-border bg-card py-1 shadow-lg"
          role="menu"
        >
          {sections.map(({ dataset, label }, i) => (
            <div key={dataset}>
              {i > 0 && <div className="my-1 border-t border-border" />}
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
              {renderItem(dataset, "csv")}
              {renderItem(dataset, "pdf")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
