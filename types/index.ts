export type BillingCycle = "monthly" | "yearly" | "quarterly";
export type PaymentType = "recurring" | "installment";
export type SubscriptionStatus = "active" | "cancelled" | "paused";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  price: number;
  billing_cycle: BillingCycle;
  payment_type: PaymentType;
  installment_count?: 3 | 6 | 9 | 12 | null;
  installments_paid: number;
  total_amount?: number | null;
  next_payment_date: string;
  /**
   * Día del mes en que se cobra, independiente de dónde quedó
   * `next_payment_date`. Sin esto un cobro del 31 se corría al 28 al pasar por
   * febrero y no volvía nunca (ver migración 009). Opcional porque las
   * respuestas anteriores a esa migración no lo traen.
   */
  billing_day?: number | null;
  category: string;
  status: SubscriptionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

export interface SubscriptionFormData {
  name: string;
  price: number;
  billing_cycle: BillingCycle;
  payment_type: PaymentType;
  installment_count?: 3 | 6 | 9 | 12 | null;
  installments_paid?: number;
  total_amount?: number | null;
  next_payment_date: string;
  category: string;
  status: SubscriptionStatus;
  notes?: string;
}

// Compras planeadas del mes
export type PurchasePaymentMethod = "card" | "transfer" | "cash";

export interface PlannedPurchase {
  id: string;
  user_id: string;
  name: string;
  /** Precio estimado. null = todavía no se sabe. En cuotas es el total de la compra. */
  price: number | null;
  link: string | null;
  planned_month: number;
  planned_year: number;
  bought: boolean;
  bought_date: string | null;
  payment_method: PurchasePaymentMethod | null;
  card_name: string | null;
  bought_with_installments: boolean;
  installment_count: 3 | 6 | 9 | 12 | null;
  installments_paid: number;
  installments_start_next_month: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannedPurchaseFormData {
  name: string;
  price?: number | null;
  link?: string;
  planned_month: number;
  planned_year: number;
  bought: boolean;
  bought_date?: string | null;
  payment_method?: PurchasePaymentMethod | null;
  card_name?: string | null;
  bought_with_installments?: boolean;
  installment_count?: 3 | 6 | 9 | 12 | null;
  installments_paid?: number;
  installments_start_next_month?: boolean;
  notes?: string | null;
}
