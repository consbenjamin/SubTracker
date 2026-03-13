"use client";

import { PlannedPurchase } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Edit, Trash2, ExternalLink, CreditCard, Banknote, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

interface PlannedPurchaseCardProps {
  purchase: PlannedPurchase;
  onEdit: (purchase: PlannedPurchase) => void;
  onDelete: (id: string) => void;
}

export function PlannedPurchaseCard({
  purchase,
  onEdit,
  onDelete,
}: PlannedPurchaseCardProps) {
  const tPurchases = useTranslations("purchases");
  const tForm = useTranslations("plannedPurchaseForm");

  const paymentIcon =
    purchase.payment_method === "card"
      ? CreditCard
      : purchase.payment_method === "transfer"
        ? Banknote
        : Wallet;
  const PaymentIcon = paymentIcon;

  const monthLabel = tPurchases(`monthsShort.${purchase.planned_month}` as any);

  const paymentMethodLabel =
    purchase.payment_method === "card"
      ? purchase.card_name || tForm("card")
      : purchase.payment_method === "transfer"
        ? tForm("transfer")
        : tForm("cash");

  const installmentsBadgeText =
    purchase.bought_with_installments && purchase.installment_count != null
      ? purchase.installments_paid >= purchase.installment_count
        ? tPurchases("installmentsCompleted", {
            count: purchase.installment_count,
          })
        : `${tPurchases("installmentsPaid", {
            paid: purchase.installments_paid,
            count: purchase.installment_count,
          })}${
            purchase.installments_start_next_month
              ? ` ${tPurchases("installmentsStartsNextMonth")}`
              : ""
          }`
      : null;

  return (
    <Card className="group flex h-full min-w-0 flex-col overflow-hidden transition-shadow hover:shadow-[var(--card-shadow-hover)]">
      <div className="flex flex-1 flex-col gap-3 min-h-0">
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {purchase.name}
            </h3>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onEdit(purchase)}
                aria-label={tPurchases("editPurchase")}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(purchase.id)}
                aria-label={tPurchases("deletePurchase")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {monthLabel} {purchase.planned_year}
          </p>

          {purchase.link && (
            <a
              href={purchase.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {tForm("link")}
            </a>
          )}

          {purchase.bought ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="success">{tPurchases("statusBought")}</Badge>
              {purchase.payment_method && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PaymentIcon className="h-3.5 w-3.5" />
                  {paymentMethodLabel}
                </span>
              )}
              {installmentsBadgeText && (
                <Badge variant="info">
                  {installmentsBadgeText}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="default">{tPurchases("statusPending")}</Badge>
          )}

          {purchase.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {purchase.notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
