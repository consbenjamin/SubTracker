"use client";

import { PlannedPurchase } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Edit, Trash2, ExternalLink, CreditCard, Banknote, Wallet } from "lucide-react";

const MONTH_NAMES: Record<number, string> = {
  1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
};

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
  const paymentIcon =
    purchase.payment_method === "card"
      ? CreditCard
      : purchase.payment_method === "transfer"
        ? Banknote
        : Wallet;
  const PaymentIcon = paymentIcon;

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
                aria-label="Editar"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                onClick={() => onDelete(purchase.id)}
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {MONTH_NAMES[purchase.planned_month]} {purchase.planned_year}
          </p>

          {purchase.link && (
            <a
              href={purchase.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver link
            </a>
          )}

          {purchase.bought ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="success">Comprado</Badge>
              {purchase.payment_method && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PaymentIcon className="h-3.5 w-3.5" />
                  {purchase.payment_method === "card"
                    ? purchase.card_name || "Tarjeta"
                    : purchase.payment_method === "transfer"
                      ? "Transferencia"
                      : "Efectivo"}
                </span>
              )}
              {purchase.bought_with_installments && purchase.installment_count != null && (
                <Badge variant="info">
                  {purchase.installments_paid >= purchase.installment_count
                    ? `Completado (${purchase.installment_count}/${purchase.installment_count}) ✓`
                    : `Pagadas ${purchase.installments_paid}/${purchase.installment_count}${
                        purchase.installments_start_next_month ? " · arranca el mes que viene" : ""
                      }`}
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="default">Pendiente</Badge>
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
