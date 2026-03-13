"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Subscription } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { Edit, Trash2, Calendar, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
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
  const t = useTranslations("subscriptionForm");
  const [expanded, setExpanded] = useState(false);
  const formatCurrency = useFormatCurrency();
  const installment = getInstallmentProgress(subscription);
  const isInstallment = isInstallmentSubscription(subscription);
  const isCompleted = isSubscriptionCompleted(subscription);
  const daysUntilPayment = isCompleted
    ? Number.POSITIVE_INFINITY
    : differenceInDays(new Date(subscription.next_payment_date), new Date());

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

    if (daysUntilPayment < 0) return { color: "text-red-600 dark:text-red-400", text: t("overdue") };
    if (daysUntilPayment <= 3) return { color: "text-amber-600 dark:text-amber-400", text: t("upcoming") };
    if (daysUntilPayment <= 7) return { color: "text-amber-600/80 dark:text-amber-400/80", text: t("soon") };
    return { color: "text-muted-foreground", text: `${daysUntilPayment} ${t("days")}` };
  };

  const urgency = getPaymentUrgency();
  const cycleLabel = t(getCycleLabelKey(subscription));
  const yearlySavingsIfCancelled = subscription.status === "active" ? getAnnualEquivalent(subscription) : null;

  return (
    <Card
      className="group flex h-full w-full min-w-0 flex-col transition-shadow hover:shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
      style={{ minHeight: SUBSCRIPTION_CARD_MIN_HEIGHT }}
    >
      <div className="flex flex-1 flex-col gap-4 min-h-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {subscription.name}
              </h3>
              {isInstallment && (
                <Badge variant="info" className="gap-1 text-xs">
                  <CreditCard className="h-3 w-3" />
                  {t("installment")}
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>
            {isInstallment ? t("nextInstallment") : t("nextPayment")}: {formatDate(subscription.next_payment_date)}
          </span>
          <span className={cn("shrink-0", urgency.color)}>({urgency.text})</span>
          {isInstallment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((e) => !e)}
              className="h-7 gap-1 px-2 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary"
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
          )}
        </div>
        {isInstallment && expanded && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("planProgress")}</span>
              {!installment.completed && (
                <span className="font-medium text-foreground">
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
              <Badge variant="info" className="text-xs">
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
