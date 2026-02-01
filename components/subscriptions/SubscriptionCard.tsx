"use client";

import { Subscription } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { Edit, Trash2, Calendar } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const formatCurrency = useFormatCurrency();
  const daysUntilPayment = differenceInDays(
    new Date(subscription.next_payment_date),
    new Date()
  );

  const getStatusBadge = () => {
    switch (subscription.status) {
      case "active":
        return <Badge variant="success">Activa</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelada</Badge>;
      case "paused":
        return <Badge variant="warning">Pausada</Badge>;
      default:
        return null;
    }
  };

  const getPaymentUrgency = () => {
    if (daysUntilPayment < 0) return { color: "text-red-600 dark:text-red-400", text: "Vencida" };
    if (daysUntilPayment <= 3) return { color: "text-amber-600 dark:text-amber-400", text: "Próxima" };
    if (daysUntilPayment <= 7) return { color: "text-amber-600/80 dark:text-amber-400/80", text: "Pronto" };
    return { color: "text-muted-foreground", text: `${daysUntilPayment} días` };
  };

  const urgency = getPaymentUrgency();
  const cycleLabel =
    subscription.billing_cycle === "monthly"
      ? "mes"
      : subscription.billing_cycle === "yearly"
      ? "año"
      : "trimestre";

  const yearlySavingsIfCancelled =
    subscription.status === "active"
      ? subscription.billing_cycle === "monthly"
        ? subscription.price * 12
        : subscription.billing_cycle === "quarterly"
        ? subscription.price * 4
        : subscription.price
      : null;

  return (
    <Card className="group transition-shadow hover:shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {subscription.name}
              </h3>
              {getStatusBadge()}
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {formatCurrency(subscription.price)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                /{cycleLabel}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subscription)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subscription.id)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Próximo pago: {formatDate(subscription.next_payment_date)}</span>
          <span className={cn("shrink-0", urgency.color)}>({urgency.text})</span>
        </div>
        {subscription.category && (
          <div>
            <Badge variant="info" className="text-xs">
              {subscription.category}
            </Badge>
          </div>
        )}
        {yearlySavingsIfCancelled != null && yearlySavingsIfCancelled > 0 && (
          <p className="text-sm text-muted-foreground">
            Ahorro anual si cancelas: {formatCurrency(yearlySavingsIfCancelled)}
          </p>
        )}
      </div>
    </Card>
  );
}
