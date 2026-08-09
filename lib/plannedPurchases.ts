import type { PlannedPurchase } from "@/types";
import type { PlannedPurchaseBody } from "@/lib/validations/schemas";

/** Cuotas que todavía faltan pagar. 0 si no aplica o ya está saldada. */
export function remainingInstallments(p: PlannedPurchase): number {
  if (!p.bought || !p.bought_with_installments || p.installment_count == null) return 0;
  return Math.max(p.installment_count - p.installments_paid, 0);
}

/** `price` es el total de la compra; esto es lo que cae por mes. */
export function installmentAmount(p: PlannedPurchase): number {
  if (p.price == null || !p.installment_count) return 0;
  return p.price / p.installment_count;
}

/** Lo que falta pagar de una compra en cuotas. */
export function remainingAmount(p: PlannedPurchase): number {
  return installmentAmount(p) * remainingInstallments(p);
}

/** Suma de precios, ignorando las compras sin precio cargado. */
export function totalPrice(purchases: PlannedPurchase[]): number {
  return purchases.reduce((sum, p) => sum + (p.price ?? 0), 0);
}

/** Cuántas de esas compras todavía no tienen precio. */
export function countWithoutPrice(purchases: PlannedPurchase[]): number {
  return purchases.filter((p) => p.price == null).length;
}

/**
 * Campos dependientes de `bought` / `payment_method`: si no compró, o no pagó con
 * tarjeta, los datos de cuotas y tarjeta se limpian antes de guardar.
 */
export function normalizePlannedPurchase(payload: PlannedPurchaseBody) {
  const paidWithCard = payload.bought && payload.payment_method === "card";
  const usesInstallments = paidWithCard && (payload.bought_with_installments ?? false);

  return {
    name: payload.name,
    price: payload.price ?? null,
    link: payload.link ?? null,
    planned_month: payload.planned_month,
    planned_year: payload.planned_year,
    bought: payload.bought ?? false,
    bought_date: payload.bought ? payload.bought_date ?? null : null,
    payment_method: payload.bought ? payload.payment_method ?? null : null,
    card_name: paidWithCard ? payload.card_name?.trim() || null : null,
    bought_with_installments: usesInstallments,
    installment_count: usesInstallments ? payload.installment_count ?? null : null,
    installments_paid: usesInstallments ? payload.installments_paid ?? 0 : 0,
    installments_start_next_month: usesInstallments
      ? payload.installments_start_next_month ?? false
      : false,
    notes: payload.notes?.trim() || null,
  };
}
