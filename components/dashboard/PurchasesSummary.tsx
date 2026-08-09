"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, ExternalLink, Layers, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePlannedPurchases } from "@/lib/hooks/usePlannedPurchases";
import type { PlannedPurchase } from "@/types";

const PENDING_PREVIEW = 4;

/** Cuotas todavía abiertas de una compra ya realizada. */
function remainingInstallments(p: PlannedPurchase): number {
  if (!p.bought || !p.bought_with_installments || p.installment_count == null) return 0;
  return Math.max(p.installment_count - p.installments_paid, 0);
}

export function PurchasesSummary() {
  const t = useTranslations("dashboard");
  const tPurchases = useTranslations("purchases");
  const tForm = useTranslations("plannedPurchaseForm");

  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Sin filtro de mes: las cuotas abiertas suelen venir de compras de meses anteriores.
  const { purchases, loading } = usePlannedPurchases(null, null);

  const { pending, boughtCount, openInstallments } = useMemo(() => {
    const thisMonth = purchases.filter(
      (p) => p.planned_month === month && p.planned_year === year
    );
    return {
      pending: thisMonth.filter((p) => !p.bought),
      boughtCount: thisMonth.filter((p) => p.bought).length,
      openInstallments: purchases.filter((p) => remainingInstallments(p) > 0),
    };
  }, [purchases, month, year]);

  if (loading) {
    return (
      <Card variant="outline">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-muted/50" />
          <div className="h-4 w-24 rounded bg-muted/40" />
          <div className="h-4 w-3/4 rounded bg-muted/40" />
        </div>
      </Card>
    );
  }

  const monthLabel = tPurchases(`months.${month}` as "months.1");
  const isEmpty = pending.length === 0 && boughtCount === 0;

  return (
    <Card variant="outline">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          {t("purchasesThisMonth", { month: monthLabel })}
        </CardTitle>
        <Link
          href="/purchases"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("purchasesSeeAll")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          <p className="py-2 text-sm text-muted-foreground">
            {tPurchases("noPurchasesThisMonth")}.{" "}
            <Link href="/purchases" className="font-medium text-foreground hover:underline">
              {tPurchases("addFirst")}
            </Link>
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={pending.length > 0 ? "warning" : "default"}>
                {t("purchasesPending", { count: pending.length })}
              </Badge>
              <Badge variant="success">{t("purchasesBought", { count: boughtCount })}</Badge>
            </div>

            {pending.length > 0 && (
              <ul className="divide-y divide-border">
                {pending.slice(0, PENDING_PREVIEW).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm text-foreground">{p.name}</span>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {tForm("link")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {pending.length > PENDING_PREVIEW && (
              <p className="text-xs text-muted-foreground">
                {t("purchasesAndMore", { count: pending.length - PENDING_PREVIEW })}
              </p>
            )}
          </>
        )}

        {openInstallments.length > 0 && (
          <div className="flex items-start gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
            <Layers className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t("purchasesOpenInstallments", { count: openInstallments.length })}
              <span className="ml-1 text-xs">
                (
                {openInstallments
                  .slice(0, 2)
                  .map((p) => `${p.name} ${p.installments_paid}/${p.installment_count}`)
                  .join(" · ")}
                {openInstallments.length > 2 ? " …" : ""})
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
