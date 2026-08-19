"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Subscription } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { categoryHueStyle } from "@/lib/categoryColor";
import { useCategoryHue } from "@/lib/contexts/CategoryColorContext";
import { Edit, Trash2, Calendar, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import {
  daysUntilPayment,
  getAnnualEquivalent,
  getInstallmentProgress,
  isInstallmentSubscription,
  isSubscriptionCompleted,
} from "@/lib/subscriptions";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export const SUBSCRIPTION_CARD_MIN_HEIGHT = 220;

function getCycleLabelKey(subscription: Subscription): "cycleMonth" | "cycleQuarter" | "cycleYear" | "cycleInstallment" {
  if (subscription.payment_type === "installment") return "cycleInstallment";
  switch (subscription.billing_cycle) {
    case "monthly": return "cycleMonth";
    case "quarterly": return "cycleQuarter";
    case "yearly": return "cycleYear";
    default: return "cycleMonth";
  }
}

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const router = useRouter();
  const t = useTranslations("subscriptionForm");
  const [expanded, setExpanded] = useState(false);
  const formatCurrency = useFormatCurrency();
  const categoryHue = useCategoryHue(subscription.category ?? "");
  const installment = getInstallmentProgress(subscription);
  const isInstallment = isInstallmentSubscription(subscription);
  const isCompleted = isSubscriptionCompleted(subscription);
  const remainingDays = isCompleted
    ? Number.POSITIVE_INFINITY
    : daysUntilPayment(subscription);

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge variant="success">{t("completed")}</Badge>;
    }

    switch (subscription.status) {
      case "active":
        return <Badge variant="success">{t("active")}</Badge>;
      case "cancelled":
        return <Badge variant="danger">{t("cancelled")}</Badge>;
      case "paused":
        return <Badge variant="warning">{t("paused")}</Badge>;
      default:
        return null;
    }
  };

  const getPaymentUrgency = () => {
    if (isCompleted) {
      return { color: "text-emerald-600 dark:text-emerald-400", text: t("noInstallmentsLeft") };
    }

    if (remainingDays < 0) return { color: "text-red-600 dark:text-red-400", text: t("overdue") };
    if (remainingDays <= 3) return { color: "text-amber-600 dark:text-amber-400", text: t("upcoming") };
    if (remainingDays <= 7) return { color: "text-amber-600/80 dark:text-amber-400/80", text: t("soon") };
    return { color: "text-muted-foreground", text: `${remainingDays} ${t("days")}` };
  };

  const urgency = getPaymentUrgency();
  const cycleLabel = t(getCycleLabelKey(subscription));
  const yearlySavingsIfCancelled = subscription.status === "active" ? getAnnualEquivalent(subscription) : null;

  return (
    <Card
      // Sin `h-full`: el contenedor es flex y ya la estira. Con `height: 100%`
      // Safari no rehacía la altura al desplegar el progreso y el contenido
      // terminaba fuera de la tarjeta.
      className="group flex w-full min-w-0 flex-col transition-shadow hover:shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
      style={{ minHeight: SUBSCRIPTION_CARD_MIN_HEIGHT }}
    >
      <div className="flex flex-1 flex-col gap-4 min-h-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            {/* Sin flex-wrap: los badges se quedan siempre al lado del nombre y
                es el nombre el que se recorta, así todas las tarjetas tienen la
                misma estructura. El `min-w-0` es lo que habilita el truncate:
                un ítem flex no baja de su ancho de contenido sin eso. */}
            <div className="flex items-center gap-2">
              <h3
                className="min-w-0 flex-1 truncate text-base font-semibold text-foreground"
                title={subscription.name}
              >
                {subscription.name}
              </h3>
              {isInstallment && (
                // En pantallas angostas queda solo el ícono: la palabra ya
                // aparece dos veces abajo ("por cuota", "3 de 12 pagadas") y
                // su ancho se lo comía al nombre, que quedaba en "Mos...".
                <Badge variant="info" className="shrink-0 gap-1 text-xs" title={t("installment")}>
                  <CreditCard className="h-3 w-3" />
                  <span className="sr-only sm:not-sr-only">{t("installment")}</span>
                </Badge>
              )}
              {getStatusBadge()}
            </div>
            {isInstallment ? (
              <div className="mt-2 min-w-0 space-y-0.5">
                <p className="text-base font-semibold text-foreground sm:text-lg">
                  {formatCurrency(subscription.price)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {t("perInstallment")}
                  </span>
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {t("totalPaidOf", { total: formatCurrency(installment.totalAmount), paid: installment.paid, count: installment.count })}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(subscription.price)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /{cycleLabel}
                </span>
              </p>
            )}
          </div>
          {/* Siempre visibles. Antes eran `opacity-0` salvo hover, con un
              `sm:opacity-100` que ya los mostraba fijos en desktop: el único
              efecto real era esconderlos en el celular, donde no hay hover y
              por lo tanto no había forma de editar ni borrar desde la lista. */}
          <div className="flex shrink-0 gap-1">
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
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          {/* El ícono va pegado al texto y la urgencia fluye como parte de la
              misma frase: si envolvía por `flex-wrap`, en pantallas angostas el
              ícono se quedaba huérfano en su propia línea. */}
          <p className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              {isInstallment ? t("nextInstallment") : t("nextPayment")}:{" "}
              {formatDate(subscription.next_payment_date)}{" "}
              <span className={urgency.color}>({urgency.text})</span>
            </span>
          </p>
          {/* Las acciones en su propia fila: dentro del texto cambiaban de
              lugar según cuánto ocupara la fecha. */}
          {!isInstallment && subscription.status === "active" && remainingDays < 0 && (
            <div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-9 whitespace-nowrap"
                onClick={() => {
                  router.push(
                    `/subscriptions/${subscription.id}?confirmDue=true&due=${encodeURIComponent(
                      subscription.next_payment_date
                    )}`
                  );
                }}
              >
                {t("confirmPaymentCta")}
              </Button>
            </div>
          )}
          {isInstallment && (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={expanded}
                onClick={() => setExpanded((e) => !e)}
                // h-9 + select-none: en el celular un target de 28px se erra
                // fácil, y al errarle se seleccionaba el texto del botón.
                className="-ml-2 h-9 select-none gap-1 px-2 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    {t("showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    {t("showProgress")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        {isInstallment && expanded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{t("planProgress")}</span>
              {!installment.completed && (
                <span className="shrink-0 font-medium text-foreground">
                  {t("nextInstallmentOf", { current: installment.nextInstallment, count: installment.count })}
                </span>
              )}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{
                  width: `${installment.count > 0 ? (installment.paid / installment.count) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        <div className="mt-auto space-y-1">
          {subscription.category && (
            <div>
              {/* El color sale del nombre de la categoría, así dos distintas
                  nunca se confunden entre sí. Ver lib/categoryColor.ts. */}
              <Badge
                variant="custom"
                className="category-badge text-xs"
                style={categoryHueStyle(categoryHue)}
              >
                {subscription.category}
              </Badge>
            </div>
          )}
          {yearlySavingsIfCancelled != null && yearlySavingsIfCancelled > 0 && (
            <p className="text-sm text-muted-foreground">
              {isInstallment
                ? t("balanceRemaining", { amount: formatCurrency(yearlySavingsIfCancelled) })
                : t("yearlySavingsIfCancel", { amount: formatCurrency(yearlySavingsIfCancelled) })}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
