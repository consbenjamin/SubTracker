import type { BillingCycle, PaymentType, Subscription } from "@/types";

export const INSTALLMENT_OPTIONS = [3, 6, 9, 12] as const;

export function getPaymentType(subscription: Pick<Subscription, "payment_type">): PaymentType {
  return subscription.payment_type ?? "recurring";
}

export function isInstallmentSubscription(
  subscription: Pick<Subscription, "payment_type">
): boolean {
  return getPaymentType(subscription) === "installment";
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

export function getSubscriptionCycleLabel(subscription: Pick<Subscription, "billing_cycle" | "payment_type" | "installment_count">): string {
  if (isInstallmentSubscription(subscription)) {
    return "cuota";
  }

  switch (subscription.billing_cycle) {
    case "monthly":
      return "mes";
    case "quarterly":
      return "trimestre";
    case "yearly":
      return "año";
    default:
      return subscription.billing_cycle;
  }
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
    const progress = getInstallmentProgress(subscription);
    return progress.remaining * subscription.price;
  }

  return getMonthlyEquivalent(subscription) * 12;
}
