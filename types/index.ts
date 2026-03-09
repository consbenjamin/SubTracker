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
