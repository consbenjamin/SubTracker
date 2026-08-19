import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { BillingCycle, PaymentType, Subscription } from "@/types";
import { parseDateOnly } from "@/lib/date";

export const INSTALLMENT_OPTIONS = [3, 6, 9, 12] as const;

/** Días de calendario hasta el próximo cobro (negativo = vencido). */
export function daysUntilPayment(
  subscription: Pick<Subscription, "next_payment_date">
): number {
  return differenceInCalendarDays(
    parseDateOnly(subscription.next_payment_date),
    startOfDay(new Date())
  );
}

/** Activa y con vencimiento dentro de los próximos `days` días. */
export function isUpcoming(subscription: Subscription, days = 7): boolean {
  if (!isSubscriptionActiveForCalculations(subscription)) return false;
  const remaining = daysUntilPayment(subscription);
  return remaining >= 0 && remaining <= days;
}

export function isInstallmentSubscription(
  subscription: Pick<Subscription, "payment_type">
): boolean {
  return (subscription.payment_type ?? "recurring") === "installment";
}

interface SubscriptionPayload {
  payment_type: PaymentType;
  billing_cycle: BillingCycle;
  installment_count?: 3 | 6 | 9 | 12 | null;
  installments_paid?: number;
  total_amount?: number | null;
}

/**
 * Coherencia entre los dos tipos de gasto antes de escribir en la base:
 * las cuotas siempre son mensuales, y los recurrentes no llevan datos de cuotas.
 */
export function normalizeSubscriptionPayload<T extends SubscriptionPayload>(payload: T) {
  if (payload.payment_type === "installment") {
    return {
      ...payload,
      billing_cycle: "monthly" as const,
      installment_count: payload.installment_count ?? null,
      installments_paid: payload.installments_paid ?? 0,
      total_amount: payload.total_amount ?? null,
    };
  }

  return {
    ...payload,
    payment_type: "recurring" as const,
    installment_count: null,
    installments_paid: 0,
    total_amount: null,
  };
}

export function getInstallmentProgress(
  subscription: Pick<
    Subscription,
    "payment_type" | "installment_count" | "installments_paid" | "price" | "total_amount"
  >
) {
  const count = subscription.installment_count ?? 0;
  const paid = Math.min(Math.max(subscription.installments_paid ?? 0, 0), count);
  const remaining = Math.max(count - paid, 0);
  const nextInstallment = remaining > 0 ? paid + 1 : count;
  const installmentAmount = subscription.price ?? 0;
  const totalAmount =
    subscription.total_amount ?? (count > 0 ? installmentAmount * count : installmentAmount);

  return {
    count,
    paid,
    remaining,
    nextInstallment,
    installmentAmount,
    totalAmount,
    completed: count > 0 && paid >= count,
  };
}

export function getBillingCycleLabel(
  billingCycle: BillingCycle,
  paymentType: PaymentType = "recurring",
  installmentCount?: number | null
): string {
  if (paymentType === "installment") {
    return installmentCount ? `Cuotas (${installmentCount})` : "Cuotas";
  }

  switch (billingCycle) {
    case "monthly":
      return "Mensual";
    case "quarterly":
      return "Trimestral";
    case "yearly":
      return "Anual";
    default:
      return billingCycle;
  }
}

export function isSubscriptionCompleted(subscription: Subscription): boolean {
  return isInstallmentSubscription(subscription) && getInstallmentProgress(subscription).completed;
}

export function isSubscriptionActiveForCalculations(subscription: Subscription): boolean {
  return subscription.status === "active" && !isSubscriptionCompleted(subscription);
}

export function getMonthlyEquivalent(subscription: Subscription): number {
  if (isSubscriptionCompleted(subscription)) {
    return 0;
  }

  if (isInstallmentSubscription(subscription)) {
    return subscription.price;
  }

  switch (subscription.billing_cycle) {
    case "monthly":
      return subscription.price;
    case "quarterly":
      return subscription.price / 3;
    case "yearly":
      return subscription.price / 12;
    default:
      return subscription.price;
  }
}

export function getAnnualEquivalent(subscription: Subscription): number {
  if (isInstallmentSubscription(subscription)) {
    // Se resta lo pagado del total en vez de multiplicar la cuota por las que
    // faltan: la cuota viene redondeada, así que 3 × 63.666,67 daba un saldo
    // de 191.000,01 sobre un total de 191.000,00.
    const progress = getInstallmentProgress(subscription);
    return Math.max(progress.totalAmount - progress.paid * subscription.price, 0);
  }

  return getMonthlyEquivalent(subscription) * 12;
}
