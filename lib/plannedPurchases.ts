import type { PlannedPurchaseBody } from "@/lib/validations/schemas";

/**
 * Campos dependientes de `bought` / `payment_method`: si no compró, o no pagó con
 * tarjeta, los datos de cuotas y tarjeta se limpian antes de guardar.
 */
export function normalizePlannedPurchase(payload: PlannedPurchaseBody) {
  const paidWithCard = payload.bought && payload.payment_method === "card";
  const usesInstallments = paidWithCard && (payload.bought_with_installments ?? false);

  return {
    name: payload.name,
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
