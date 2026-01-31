export type BillingCycle = "monthly" | "yearly" | "quarterly";
export type SubscriptionStatus = "active" | "cancelled" | "paused";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  price: number;
  billing_cycle: BillingCycle;
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
  next_payment_date: string;
  category: string;
  status: SubscriptionStatus;
  notes?: string;
}
