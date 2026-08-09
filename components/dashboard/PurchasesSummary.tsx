"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, ExternalLink, Layers, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { usePlannedPurchases } from "@/lib/hooks/usePlannedPurchases";
import {
  countWithoutPrice,
  installmentAmount,
  remainingAmount,
  remainingInstallments,
  totalPrice,
} from "@/lib/plannedPurchases";

const PENDING_PREVIEW = 4;

export function PurchasesSummary() {
  const t = useTranslations("dashboard");
  const tPurchases = useTranslations("purchases");
  const tForm = useTranslations("plannedPurchaseForm");
  const formatCurrency = useFormatCurrency();

  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Sin filtro de mes: las cuotas abiertas suelen venir de compras de meses anteriores.
  const { purchases, loading } = usePlannedPurchases(null, null);

  const stats = useMemo(() => {
    const thisMonth = purchases.filter(
      (p) => p.planned_month === month && p.planned_year === year
    );
    const pending = thisMonth.filter((p) => !p.bought);
    const bought = thisMonth.filter((p) => p.bought);
    const openInstallments = purchases.filter((p) => remainingInstallments(p) > 0);

    return {
      pending,
      bought,
      pendingTotal: totalPrice(pending),
      pendingWithoutPrice: countWithoutPrice(pending),
      boughtTotal: totalPrice(bought),
      openInstallments,
      // Lo que estas cuotas te comprometen cada mes y lo que resta en total.
      monthlyInstallments: openInstallments.reduce((sum, p) => sum + installmentAmount(p), 0),
      remainingInstallmentsTotal: openInstallments.reduce((sum, p) => sum + remainingAmount(p), 0),
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
  const isEmpty = stats.pending.length === 0 && stats.bought.length === 0;

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("purchasesPendingLabel")}
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  {formatCurrency(stats.pendingTotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("purchasesPending", { count: stats.pending.length })}
                  {stats.pendingWithoutPrice > 0 &&
                    ` · ${t("purchasesNoPrice", { count: stats.pendingWithoutPrice })}`}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("purchasesBoughtLabel")}
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  {formatCurrency(stats.boughtTotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("purchasesBought", { count: stats.bought.length })}
                </p>
              </div>
            </div>

            {stats.pending.length > 0 && (
              <ul className="divide-y divide-border border-t border-border pt-1">
                {stats.pending.slice(0, PENDING_PREVIEW).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {p.name}
                    </span>
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
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {p.price != null ? formatCurrency(p.price) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {stats.pending.length > PENDING_PREVIEW && (
              <p className="text-xs text-muted-foreground">
                {t("purchasesAndMore", { count: stats.pending.length - PENDING_PREVIEW })}
              </p>
            )}
          </>
        )}

        {stats.openInstallments.length > 0 && (
          <div className="flex items-start gap-2 border-t border-border pt-3 text-sm">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-foreground">
                {t("purchasesInstallmentsPerMonth", {
                  amount: formatCurrency(stats.monthlyInstallments),
                })}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("purchasesOpenInstallments", { count: stats.openInstallments.length })}
                {stats.remainingInstallmentsTotal > 0 &&
                  ` · ${t("purchasesRemainingTotal", {
                    amount: formatCurrency(stats.remainingInstallmentsTotal),
                  })}`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
